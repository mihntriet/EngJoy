/**
 * Phase 4A.4 – Server-Verified Lesson Attempt System Test Suite
 *
 * Comprehensive tests covering attempt lifecycle, anti-bypass security,
 * server score calculation, atomic transactions, and concurrency protection.
 */

const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const progressService = require('./src/services/progress.service');
const authService = require('./src/services/auth.service');
const { getLessonContent } = require('./src/constants/lessonData');

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT, 10) || 5432,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ ${message}`);
}

async function runSuite() {
  console.log('=================================================================');
  console.log('🧪 Starting Phase 4A.4 Lesson Attempt System Verification Suite');
  console.log('=================================================================\n');

  // Create User A (Primary Tester)
  const userAEmail = `attempt_tester_a_${Date.now()}@engjoy.com`;
  const regResultA = await authService.register({
    email: userAEmail,
    password: 'Password123!',
    displayName: 'Attempt Tester A',
  });
  const userAId = regResultA.user.id;
  assert(userAId, `Registered User A (${userAId})`);

  // Create User B (Attacker / Cross-user Tester)
  const userBEmail = `attempt_tester_b_${Date.now()}@engjoy.com`;
  const regResultB = await authService.register({
    email: userBEmail,
    password: 'Password123!',
    displayName: 'Attempt Tester B',
  });
  const userBId = regResultB.user.id;
  assert(userBId, `Registered User B (${userBId})`);

  // -------------------------------------------------------------
  // TEST 1 & 2: START_LESSON creates valid attempt for User A
  // -------------------------------------------------------------
  console.log('\n▶ Test 1 & 2: START_LESSON attempt creation and binding');
  const startRes = await progressService.startLesson(userAId, { questId: 1, unitId: 1 });
  assert(startRes.attemptId, `START_LESSON returned attemptId: ${startRes.attemptId}`);
  assert(startRes.status === 'pending', 'Attempt status is "pending"');
  assert(startRes.questId === 1 && startRes.unitId === 1, 'Attempt matches questId=1, unitId=1');
  assert(Array.isArray(startRes.questions) && startRes.questions.length === 4, 'Returned 4 questions');
  
  // Verify sanitized DTO: no answer keys leaked
  const hasLeakedAnswer = startRes.questions.some(q => q.answer !== undefined || q.explanation !== undefined);
  assert(!hasLeakedAnswer, 'Rule 9: No answer keys or explanations exposed to client');

  // Verify DB record
  const { rows: dbAttemptRows } = await pool.query('SELECT * FROM lesson_attempts WHERE id = $1', [startRes.attemptId]);
  assert(dbAttemptRows.length === 1, 'Attempt found in PostgreSQL lesson_attempts');
  assert(dbAttemptRows[0].user_id === userAId, 'Attempt correctly bound to User A in DB');
  assert(dbAttemptRows[0].status === 'pending', 'DB attempt status is pending');
  assert(dbAttemptRows[0].score === null, 'DB attempt score is initially null');

  // -------------------------------------------------------------
  // TEST 3: User B cannot submit User A's attempt
  // -------------------------------------------------------------
  console.log('\n▶ Test 3: Cross-user attempt isolation (User B submits User A attempt)');
  try {
    await progressService.submitLesson(userBId, {
      attemptId: startRes.attemptId,
      answers: [
        { questionId: 'u1_q1', selected: 1 },
        { questionId: 'u1_q2', selected: 1 },
        { questionId: 'u1_q3', selected: 3 },
        { questionId: 'u1_q4', selected: 0 },
      ],
    });
    assert(false, 'Should have rejected cross-user submission');
  } catch (err) {
    assert(err.statusCode === 403, 'Cross-user submission rejected with HTTP 403');
  }

  // -------------------------------------------------------------
  // TEST 4: Invalid attempt ID rejected
  // -------------------------------------------------------------
  console.log('\n▶ Test 4: Invalid attemptId rejected');
  try {
    await progressService.submitLesson(userAId, {
      attemptId: '00000000-0000-0000-0000-000000000000',
      answers: [{ questionId: 'u1_q1', selected: 1 }],
    });
    assert(false, 'Should have rejected non-existent attempt');
  } catch (err) {
    assert(err.statusCode === 400, 'Non-existent attempt rejected with HTTP 400');
  }

  // -------------------------------------------------------------
  // TEST 5: Expired attempt rejected
  // -------------------------------------------------------------
  console.log('\n▶ Test 5: Expired attempt rejected');
  // Create an expired attempt directly in DB
  const { rows: expRows } = await pool.query(
    `INSERT INTO lesson_attempts (user_id, quest_id, unit_id, question_ids, status, score, expires_at)
     VALUES ($1, 1, 1, ARRAY['u1_q1', 'u1_q2', 'u1_q3', 'u1_q4'], 'pending', NULL, NOW() - INTERVAL '5 minutes')
     RETURNING id`,
    [userAId]
  );
  const expiredAttemptId = expRows[0].id;
  try {
    await progressService.submitLesson(userAId, {
      attemptId: expiredAttemptId,
      answers: [
        { questionId: 'u1_q1', selected: 1 },
        { questionId: 'u1_q2', selected: 1 },
        { questionId: 'u1_q3', selected: 3 },
        { questionId: 'u1_q4', selected: 0 },
      ],
    });
    assert(false, 'Should have rejected expired attempt');
  } catch (err) {
    assert(err.statusCode === 400 && err.message.includes('expired'), 'Expired attempt rejected with HTTP 400');
  }

  // -------------------------------------------------------------
  // TEST 6: Malformed answers rejected
  // -------------------------------------------------------------
  console.log('\n▶ Test 6: Malformed answers payload rejected');
  try {
    await progressService.submitLesson(userAId, {
      attemptId: startRes.attemptId,
      answers: 'not-an-array',
    });
    assert(false, 'Should have rejected non-array answers');
  } catch (err) {
    assert(err.statusCode === 400, 'Malformed answers payload rejected with HTTP 400');
  }

  // -------------------------------------------------------------
  // TEST 7: Unknown question IDs rejected
  // -------------------------------------------------------------
  console.log('\n▶ Test 7: Unknown question IDs rejected');
  try {
    await progressService.submitLesson(userAId, {
      attemptId: startRes.attemptId,
      answers: [
        { questionId: 'unknown_q999', selected: 1 },
        { questionId: 'u1_q2', selected: 1 },
        { questionId: 'u1_q3', selected: 3 },
        { questionId: 'u1_q4', selected: 0 },
      ],
    });
    assert(false, 'Should have rejected unknown question IDs');
  } catch (err) {
    assert(err.statusCode === 400, 'Unknown question ID rejected with HTTP 400');
  }

  // -------------------------------------------------------------
  // TEST 8, 9, 10: Server calculates score itself; score < 60 fails, grants NO reward, marks attempt failed
  // -------------------------------------------------------------
  console.log('\n▶ Test 8, 9, 10: Server-calculated score below 60% fails and grants 0 reward');
  // Submit only 2 of 4 correct answers (50% score) while providing forged score=100
  // Authoritative A1 U1 answers: q1: 1, q2: 1, q3: 3, q4: 0
  const failSubmitRes = await progressService.submitLesson(userAId, {
    attemptId: startRes.attemptId,
    answers: [
      { questionId: 'u1_q1', selected: 1 }, // Correct
      { questionId: 'u1_q2', selected: 1 }, // Correct
      { questionId: 'u1_q3', selected: 0 }, // WRONG (correct is 3)
      { questionId: 'u1_q4', selected: 1 }, // WRONG (correct is 0)
    ],
    score: 100,      // FORGED score must be ignored
    earnedXp: 9999,  // FORGED reward must be ignored
    gold: 9999,      // FORGED gold must be ignored
  });

  assert(failSubmitRes.success === true, 'Submit completed response received');
  assert(failSubmitRes.passed === false, 'Server determined lesson did NOT pass');
  assert(failSubmitRes.score === 50, 'Server independently calculated exactly 50% score (forged 100 ignored)');
  assert(!failSubmitRes.reward, 'No reward returned on fail');

  // Verify DB state for User A
  const { rows: failedDbAttempt } = await pool.query('SELECT * FROM lesson_attempts WHERE id = $1', [startRes.attemptId]);
  assert(failedDbAttempt[0].status === 'failed', 'DB attempt status updated to "failed"');
  assert(failedDbAttempt[0].score === 50, 'DB attempt score updated to 50');

  const { rows: profRowsA } = await pool.query('SELECT * FROM player_profiles WHERE user_id = $1', [userAId]);
  const profA = profRowsA[0];
  assert(!profA || parseInt(profA.total_xp, 10) === 0, 'User A total_xp remains 0');
  assert(!profA || parseInt(profA.gold, 10) === 0, 'User A gold remains 0');
  assert(!profA || !profA.quest_units?.['1']?.find(u => u.id === 1 && u.status === 'done'), 'Unit 1 is NOT marked done');

  // -------------------------------------------------------------
  // TEST 5b: Failed attempt cannot be reused
  // -------------------------------------------------------------
  console.log('\n▶ Test 5b: Rule 7 - Failed attempt cannot be resubmitted');
  try {
    await progressService.submitLesson(userAId, {
      attemptId: startRes.attemptId,
      answers: [
        { questionId: 'u1_q1', selected: 1 },
        { questionId: 'u1_q2', selected: 1 },
        { questionId: 'u1_q3', selected: 3 },
        { questionId: 'u1_q4', selected: 0 },
      ],
    });
    assert(false, 'Should not allow resubmission of failed attempt');
  } catch (err) {
    assert(err.statusCode === 400 && err.message.includes('Failed attempt cannot be resubmitted'), 'Resubmitting failed attempt rejected with HTTP 400');
  }

  // -------------------------------------------------------------
  // TEST 11 & 12: Retry creates fresh attempt; score >= 60 passes and grants reward atomically
  // -------------------------------------------------------------
  console.log('\n▶ Test 11 & 12: Retry creates Attempt 2; score >= 60 grants reward atomically');
  const startRes2 = await progressService.startLesson(userAId, { questId: 1, unitId: 1 });
  assert(startRes2.attemptId !== startRes.attemptId, 'Fresh attemptId generated on retry');

  // Submit 4 of 4 correct answers (100% score)
  const passSubmitRes = await progressService.submitLesson(userAId, {
    attemptId: startRes2.attemptId,
    answers: [
      { questionId: 'u1_q1', selected: 1 }, // Correct
      { questionId: 'u1_q2', selected: 1 }, // Correct
      { questId: 1, questionId: 'u1_q3', selected: 3 }, // Correct
      { questionId: 'u1_q4', selected: 0 }, // Correct
    ],
  });

  assert(passSubmitRes.passed === true, 'Server determined lesson PASSED');
  assert(passSubmitRes.score === 100, 'Server calculated score is 100%');
  assert(passSubmitRes.reward.xp === 60, 'Awarded exactly 60 XP');
  assert(passSubmitRes.reward.gold === 30, 'Awarded exactly 30 Gold');
  assert(passSubmitRes.reward.wordsLearned === 15, 'Awarded exactly 15 words');
  assert(passSubmitRes.profile.totalXp === 60, 'Profile totalXp is 60');
  assert(passSubmitRes.profile.gold === 30, 'Profile gold is 30');

  // Check DB state
  const { rows: passDbAttempt } = await pool.query('SELECT * FROM lesson_attempts WHERE id = $1', [startRes2.attemptId]);
  assert(passDbAttempt[0].status === 'consumed', 'Attempt status updated to "consumed"');
  assert(passDbAttempt[0].score === 100, 'Attempt score stored as 100');

  const { rows: updatedProfA } = await pool.query('SELECT * FROM player_profiles WHERE user_id = $1', [userAId]);
  const u1 = updatedProfA[0].quest_units['1'].find(u => u.id === 1);
  const u2 = updatedProfA[0].quest_units['1'].find(u => u.id === 2);
  assert(u1 && u1.status === 'done', 'Unit 1 marked as "done" in player_profiles');
  assert(u2 && u2.status === 'active', 'Unit 2 unlocked as "active" in player_profiles');

  // -------------------------------------------------------------
  // TEST 13: Duplicate submission of consumed attempt grants no second reward
  // -------------------------------------------------------------
  console.log('\n▶ Test 13: Duplicate submission of consumed attempt rejected / grants 0 reward');
  try {
    await progressService.submitLesson(userAId, {
      attemptId: startRes2.attemptId,
      answers: [
        { questionId: 'u1_q1', selected: 1 },
        { questionId: 'u1_q2', selected: 1 },
        { questionId: 'u1_q3', selected: 3 },
        { questionId: 'u1_q4', selected: 0 },
      ],
    });
    assert(false, 'Should have rejected resubmission of consumed attempt');
  } catch (err) {
    assert(err.statusCode === 409 || err.statusCode === 400, 'Duplicate submission rejected with 409/400');
  }

  // -------------------------------------------------------------
  // ATTACK TEST 14 & 15: Direct COMPLETE_UNIT without attempt or with score=100
  // -------------------------------------------------------------
  console.log('\n▶ Attack Test 14 & 15: Direct COMPLETE_UNIT without attempt');
  try {
    await progressService.executeAction(userAId, {
      action: 'COMPLETE_UNIT',
      questId: 1,
      unitId: 2,
      score: 100, // Attack: bypass lesson by forging score 100
    });
    assert(false, 'CRITICAL: Direct COMPLETE_UNIT without attempt MUST NOT SUCCEED');
  } catch (err) {
    assert(err.statusCode === 400 && err.message.includes('attemptId is required'), 'Direct COMPLETE_UNIT rejected with HTTP 400 (attemptId is required)');
  }

  // -------------------------------------------------------------
  // ATTACK TEST 16: Direct COMPLETE_UNIT with fake / unverified attemptId
  // -------------------------------------------------------------
  console.log('\n▶ Attack Test 16: COMPLETE_UNIT with forged attemptId');
  try {
    await progressService.executeAction(userAId, {
      action: 'COMPLETE_UNIT',
      questId: 1,
      unitId: 2,
      attemptId: '11111111-2222-3333-4444-555555555555',
      score: 100,
    });
    assert(false, 'CRITICAL: COMPLETE_UNIT with fake attemptId MUST NOT SUCCEED');
  } catch (err) {
    assert(err.statusCode === 400 && err.message.includes('Invalid attemptId'), 'COMPLETE_UNIT with fake attemptId rejected with HTTP 400');
  }

  // -------------------------------------------------------------
  // ATTACK TEST 16b: COMPLETE_UNIT with another user's attemptId
  // -------------------------------------------------------------
  console.log('\n▶ Attack Test 16b: User B tries to use User A consumed attempt');
  try {
    await progressService.executeAction(userBId, {
      action: 'COMPLETE_UNIT',
      questId: 1,
      unitId: 1,
      attemptId: startRes2.attemptId,
      score: 100,
    });
    assert(false, 'CRITICAL: Cross-user attempt consumption MUST NOT SUCCEED');
  } catch (err) {
    assert(err.statusCode === 403, 'Cross-user attempt consumption rejected with HTTP 403');
  }

  // -------------------------------------------------------------
  // TEST 17: Concurrent submissions cannot double reward
  // -------------------------------------------------------------
  console.log('\n▶ Test 17: Concurrent submissions of fresh attempt serializes and rewards exactly once');
  const startRes3 = await progressService.startLesson(userAId, { questId: 1, unitId: 2 });
  const validAnswersU2 = [
    { questionId: 'u2_q1', selected: 1 },
    { questionId: 'u2_q2', selected: 1 },
    { questionId: 'u2_q3', selected: 0 },
    { questionId: 'u2_q4', selected: 1 },
  ];

  const currentXpBefore = (await pool.query('SELECT total_xp FROM player_profiles WHERE user_id = $1', [userAId])).rows[0].total_xp;

  // Run 2 simultaneous submissions of the exact same attempt
  const [res1, res2] = await Promise.allSettled([
    progressService.submitLesson(userAId, { attemptId: startRes3.attemptId, answers: validAnswersU2 }),
    progressService.submitLesson(userAId, { attemptId: startRes3.attemptId, answers: validAnswersU2 }),
  ]);

  const fulfilled = [res1, res2].filter(r => r.status === 'fulfilled');
  const rejected = [res1, res2].filter(r => r.status === 'rejected');

  assert(fulfilled.length === 1, `Exactly one submission succeeded (${fulfilled.length}/2)`);
  assert(rejected.length === 1, `Second concurrent submission rejected (${rejected.length}/2)`);

  const currentXpAfter = (await pool.query('SELECT total_xp FROM player_profiles WHERE user_id = $1', [userAId])).rows[0].total_xp;
  const xpDiff = parseInt(currentXpAfter, 10) - parseInt(currentXpBefore, 10);
  // Unit 2 completes the 20-words daily mission (15 words from U1 + 15 words from U2 = 30 >= 20 -> +100 XP mission bonus)
  assert(xpDiff === 60 || xpDiff === 160, `total_xp increased by exactly 60 base XP (+100 mission bonus = +${xpDiff} XP)`);

  // -------------------------------------------------------------
  // TEST 18: Transaction rollback leaves progression unchanged on error
  // -------------------------------------------------------------
  console.log('\n▶ Test 18: Transaction rollback on error');
  const startRes4 = await progressService.startLesson(userAId, { questId: 1, unitId: 3 });
  
  const att4Before = (await pool.query('SELECT status, score FROM lesson_attempts WHERE id = $1', [startRes4.attemptId])).rows[0];
  assert(att4Before.status === 'pending', 'Attempt 4 initialized as pending');

  const xpBeforeRollback = (await pool.query('SELECT total_xp FROM player_profiles WHERE user_id = $1', [userAId])).rows[0].total_xp;

  // Attempt submitting with an invalid/malformed question ID
  try {
    await progressService.submitLesson(userAId, {
      attemptId: startRes4.attemptId,
      answers: [{ questionId: 'non_existent_q', selected: 1 }],
    });
  } catch (err) {
    // Expected rejection
  }

  const att4After = (await pool.query('SELECT status, score FROM lesson_attempts WHERE id = $1', [startRes4.attemptId])).rows[0];
  assert(att4After.status === 'pending', 'Attempt 4 status remains pending after rollback');
  assert(att4After.score === null, 'Attempt 4 score remains null after rollback');

  const xpAfterRollback = (await pool.query('SELECT total_xp FROM player_profiles WHERE user_id = $1', [userAId])).rows[0].total_xp;
  assert(xpAfterRollback === xpBeforeRollback, 'player_profiles XP completely unmodified after rollback');

  console.log('\n=================================================================');
  console.log(`🎉 ALL PHASE 4A.4 LESSON ATTEMPT TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('=================================================================\n');
}

runSuite()
  .then(() => pool.end())
  .catch((err) => {
    console.error('\n❌ Test suite failed:', err);
    pool.end();
    process.exit(1);
  });
