/**
 * Phase 2B.1 – Backend Authoritative Progression Engine Test Suite
 *
 * Comprehensive tests against the production services, controllers, and PostgreSQL database.
 */

const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const progressService = require('./src/services/progress.service');
const authService = require('./src/services/auth.service');
const { calculateLevel } = require('./src/constants/gameCatalog');

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
  console.log('🧪 Starting Phase 2B.1 Progression Engine Verification Suite');
  console.log('=================================================================\n');

  // Create a dedicated test user for this suite
  const testEmail = `engine_tester_${Date.now()}@engjoy.com`;
  const regResult = await authService.register({
    email: testEmail,
    password: 'Password123!',
    displayName: 'Progression Tester',
  });
  const userId = regResult.user.id;
  assert(userId, `Test user registered (${userId})`);

  // -------------------------------------------------------------
  // TEST A: COMPLETE_UNIT
  // -------------------------------------------------------------
  console.log('\n▶ Test A: COMPLETE_UNIT');

  // A0: Direct COMPLETE_UNIT without attempt is rejected (Anti-bypass Phase 4A.4)
  let directBypassBlocked = false;
  try {
    await progressService.executeAction(userId, {
      action: 'COMPLETE_UNIT',
      questId: 1,
      unitId: 1,
      score: 100,
    });
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('attemptId is required')) {
      directBypassBlocked = true;
    }
  }
  assert(directBypassBlocked, 'Direct COMPLETE_UNIT without attempt rejected with 400');

  // A1: Start and submit verified lesson attempt
  const startRes1 = await progressService.startLesson(userId, { questId: 1, unitId: 1 });
  const unitRes1 = await progressService.submitLesson(userId, {
    attemptId: startRes1.attemptId,
    answers: [
      { questionId: 'u1_q1', selected: 1 },
      { questionId: 'u1_q2', selected: 1 },
      { questionId: 'u1_q3', selected: 3 },
      { questionId: 'u1_q4', selected: 0 },
    ],
    earnedXp: 999999, // Forged payload should be ignored
    gold: 999999,
  });

  assert(unitRes1.success === true, 'SUBMIT_LESSON succeeded');
  assert(unitRes1.reward.xp === 60, 'Base XP awarded is 60 (forged 999999 ignored)');
  assert(unitRes1.reward.gold === 30, 'Base Gold awarded is 30 (forged 999999 ignored)');
  assert(unitRes1.reward.wordsLearned === 15, 'wordsLearned incremented by 15');
  assert(unitRes1.profile.totalXp === 60, 'Profile totalXp is 60');
  assert(unitRes1.profile.gold === 30, 'Profile gold is 30');
  assert(unitRes1.profile.wordsLearned === 15, 'Profile wordsLearned is 15');

  // Check quest_units state: Unit 1 done, Unit 2 active
  const q1Units = unitRes1.profile.questUnits['1'];
  assert(Array.isArray(q1Units), 'Quest 1 units array exists');
  const u1 = q1Units.find((u) => u.id === 1);
  const u2 = q1Units.find((u) => u.id === 2);
  assert(u1 && u1.status === 'done', 'Unit 1 marked as "done"');
  assert(u2 && u2.status === 'active', 'Unit 2 marked as "active"');

  // A2: Duplicate completion gives no reward
  const unitResDup = await progressService.executeAction(userId, {
    action: 'COMPLETE_UNIT',
    questId: 1,
    unitId: 1,
    attemptId: startRes1.attemptId,
  });
  assert(unitResDup.success === true, 'Duplicate unit call succeeded');
  assert(unitResDup.reward.xp === 0, 'Duplicate unit gives 0 XP');
  assert(unitResDup.reward.gold === 0, 'Duplicate unit gives 0 Gold');
  assert(unitResDup.reward.alreadyCompleted === true, 'alreadyCompleted flag is true');
  assert(unitResDup.profile.totalXp === 60, 'totalXp remained 60 (no duplicate reward)');

  // A3: Concurrent completion gives exactly one reward
  const startRes2 = await progressService.startLesson(userId, { questId: 1, unitId: 2 });
  const u2Answers = [
    { questionId: 'u2_q1', selected: 1 },
    { questionId: 'u2_q2', selected: 1 },
    { questionId: 'u2_q3', selected: 0 },
    { questionId: 'u2_q4', selected: 1 },
  ];
  const [cRes1, cRes2] = await Promise.allSettled([
    progressService.submitLesson(userId, { attemptId: startRes2.attemptId, answers: u2Answers }),
    progressService.submitLesson(userId, { attemptId: startRes2.attemptId, answers: u2Answers }),
  ]);

  const fulfilledCount = [cRes1, cRes2].filter(r => r.status === 'fulfilled').length;
  assert(fulfilledCount === 1, 'Concurrent submission rewarded exactly once');

  // A4: Invalid unit rejected
  let invalidUnitFailed = false;
  try {
    await progressService.startLesson(userId, { questId: 1, unitId: 99 });
  } catch (err) {
    if (err.statusCode === 400) invalidUnitFailed = true;
  }
  assert(invalidUnitFailed, 'Invalid unitId: 99 rejected with 400');

  // -------------------------------------------------------------
  // TEST B: COMPLETE_QUIZ
  // -------------------------------------------------------------
  console.log('\n▶ Test B: COMPLETE_QUIZ');

  // B1: Missing idempotency key rejected
  let missingKeyFailed = false;
  try {
    await progressService.executeAction(userId, { action: 'COMPLETE_QUIZ', score: 80 });
  } catch (err) {
    if (err.statusCode === 400) missingKeyFailed = true;
  }
  assert(missingKeyFailed, 'Missing idempotencyKey for COMPLETE_QUIZ rejected with 400');

  // B2: Valid score gives server-calculated reward
  // score 80 -> Math.round((80/100) * 150) = 120 XP, floor(120/2) = 60 Gold
  // Also advances Mission 2 ("quiz") by 1 -> Completes quiz mission! (+75 XP, +37 Gold)
  const quizKey1 = `quiz-${Date.now()}-1`;
  const quizRes = await progressService.executeAction(userId, {
    action: 'COMPLETE_QUIZ',
    score: 80,
    idempotencyKey: quizKey1,
    earnedXp: 9999, // Forged payload ignored
  });

  assert(quizRes.success === true, 'Quiz action succeeded');
  assert(quizRes.reward.xp === 120, 'Server calculated exactly 120 XP from score 80 (forged 9999 ignored)');
  assert(quizRes.reward.gold === 60, 'Server calculated exactly 60 Gold');
  assert(quizRes.reward.missionBonus && quizRes.reward.missionBonus.xp === 75, 'Quiz mission bonus awarded (+75 XP)');
  assert(quizRes.reward.missionBonus.gold === 37, 'Quiz mission bonus awarded (+37 Gold)');

  // B3: Invalid scores rejected
  let negScoreFailed = false;
  try {
    await progressService.executeAction(userId, { action: 'COMPLETE_QUIZ', score: -10, idempotencyKey: 'k-neg' });
  } catch (err) {
    if (err.statusCode === 400) negScoreFailed = true;
  }
  assert(negScoreFailed, 'Negative score rejected with 400');

  let overScoreFailed = false;
  try {
    await progressService.executeAction(userId, { action: 'COMPLETE_QUIZ', score: 150, idempotencyKey: 'k-over' });
  } catch (err) {
    if (err.statusCode === 400) overScoreFailed = true;
  }
  assert(overScoreFailed, 'Score > 100 rejected with 400');

  // B4: Same idempotency key returns cached response without duplicate rewards
  const preQuizXp = quizRes.profile.totalXp;
  const quizRetry = await progressService.executeAction(userId, {
    action: 'COMPLETE_QUIZ',
    score: 80,
    idempotencyKey: quizKey1,
  });
  assert(quizRetry.success === true, 'Idempotent quiz retry succeeded');
  assert(quizRetry.profile.totalXp === preQuizXp, 'Idempotent retry returned identical totalXp (no duplicate reward)');

  // B5: Different idempotency key allows valid second quiz
  const quizKey2 = `quiz-${Date.now()}-2`;
  const quizRes2 = await progressService.executeAction(userId, {
    action: 'COMPLETE_QUIZ',
    score: 100, // 150 XP, 75 Gold
    idempotencyKey: quizKey2,
  });
  assert(quizRes2.reward.xp === 150, 'Second quiz with new idempotency key awarded 150 XP');
  // Quiz mission already done, so no duplicate mission bonus
  assert(!quizRes2.reward.missionBonus, 'Quiz mission bonus not awarded second time');

  // -------------------------------------------------------------
  // TEST C: SAVE_WORD
  // -------------------------------------------------------------
  console.log('\n▶ Test C: SAVE_WORD');

  // C1: New word rewards (+15 XP, +7 Gold, +1 wordsLearned)
  const saveRes1 = await progressService.executeAction(userId, {
    action: 'SAVE_WORD',
    word: '  Serendipity  ', // Leading/trailing whitespace & uppercase
  });
  assert(saveRes1.success === true, 'SAVE_WORD succeeded');
  assert(saveRes1.reward.xp === 15, 'Awarded 15 XP');
  assert(saveRes1.reward.gold === 7, 'Awarded 7 Gold');
  assert(saveRes1.reward.wordsLearned === 1, 'wordsLearned incremented by 1');
  assert(saveRes1.profile.savedWords.includes('serendipity'), 'Word saved normalized to lowercase "serendipity"');

  // C2: Duplicate word gives no reward
  const saveDup = await progressService.executeAction(userId, {
    action: 'SAVE_WORD',
    word: 'SERENDIPITY',
  });
  assert(saveDup.reward.xp === 0, 'Duplicate word awarded 0 XP');
  assert(saveDup.reward.alreadySaved === true, 'alreadySaved flag is true');

  // C3: Concurrent duplicate save gives exactly one reward
  const uniqueWord = `ubiquitous_${Date.now()}`;
  const [sRes1, sRes2] = await Promise.all([
    progressService.executeAction(userId, { action: 'SAVE_WORD', word: uniqueWord }),
    progressService.executeAction(userId, { action: 'SAVE_WORD', word: uniqueWord }),
  ]);
  const saveRewards = [sRes1.reward.xp, sRes2.reward.xp];
  assert(
    (saveRewards[0] === 15 && saveRewards[1] === 0) || (saveRewards[0] === 0 && saveRewards[1] === 15),
    'Concurrent SAVE_WORD calls for same word rewarded exactly once'
  );

  // -------------------------------------------------------------
  // TEST D: CHAT_MESSAGE (Anti-Spam / Cooldown)
  // -------------------------------------------------------------
  console.log('\n▶ Test D: CHAT_MESSAGE');

  // D1: Valid message increments chat mission
  const chatRes1 = await progressService.executeAction(userId, {
    action: 'CHAT_MESSAGE',
    message: 'Hello Joy, can you help me learn English?',
  });
  assert(chatRes1.success === true, 'Chat message action succeeded');
  const chatMission = chatRes1.profile.missions.find((m) => m.type === 'chat');
  assert(chatMission.done === 1, 'Chat mission incremented to 1');

  // D2: Rapid consecutive call rejected by cooldown
  let cooldownTriggered = false;
  try {
    await progressService.executeAction(userId, {
      action: 'CHAT_MESSAGE',
      message: 'Spam message sent immediately',
    });
  } catch (err) {
    if (err.statusCode === 429) cooldownTriggered = true;
  }
  assert(cooldownTriggered, 'Immediate consecutive chat message rejected with 429 (cooldown enforced)');

  // D3: Message with < 3 characters rejected
  let shortMsgFailed = false;
  try {
    await progressService.executeAction(userId, {
      action: 'CHAT_MESSAGE',
      message: 'hi',
    });
  } catch (err) {
    if (err.statusCode === 400) shortMsgFailed = true;
  }
  assert(shortMsgFailed, 'Chat message < 3 characters rejected with 400');

  // -------------------------------------------------------------
  // TEST E: BUY_ITEM
  // -------------------------------------------------------------
  console.log('\n▶ Test E: BUY_ITEM');

  // E1: Check current gold, buy item 4 ("Cuộn Hồi Phục", price: 150)
  const currentGold = chatRes1.profile.gold;
  assert(currentGold >= 150, `User has enough gold to test buy (gold: ${currentGold})`);

  const buyRes = await progressService.executeAction(userId, {
    action: 'BUY_ITEM',
    itemId: '4',
    price: 1, // Client cannot manipulate price
  });

  assert(buyRes.success === true, 'Item 4 purchased successfully');
  assert(buyRes.reward.spentGold === 150, 'Authoritative price 150 deducted (client price: 1 ignored)');
  assert(buyRes.profile.gold === currentGold - 150, `Gold balance correctly updated to ${currentGold - 150}`);
  assert(buyRes.profile.ownedItemIds.includes('4'), 'Item "4" added to ownedItemIds');

  // E2: Duplicate purchase rejected
  let dupBuyFailed = false;
  try {
    await progressService.executeAction(userId, {
      action: 'BUY_ITEM',
      itemId: '4',
    });
  } catch (err) {
    if (err.statusCode === 400) dupBuyFailed = true;
  }
  assert(dupBuyFailed, 'Duplicate item purchase rejected (already owned)');

  // E3: Insufficient gold rejected
  let brokeBuyFailed = false;
  try {
    await progressService.executeAction(userId, {
      action: 'BUY_ITEM',
      itemId: '3', // Thuốc Nhân Đôi XP costs 600
    });
  } catch (err) {
    if (err.statusCode === 400) brokeBuyFailed = true;
  }
  assert(brokeBuyFailed, 'Purchase with insufficient gold rejected with 400');

  // -------------------------------------------------------------
  // TEST F: Mission Boundary (19 -> 20 words)
  // -------------------------------------------------------------
  console.log('\n▶ Test F: Mission Boundary (Words Mission)');

  // Create a clean user to test mission boundary exactly
  const boundaryEmail = `boundary_${Date.now()}@engjoy.com`;
  const bUserRes = await authService.register({
    email: boundaryEmail,
    password: 'Password123!',
    displayName: 'Boundary Tester',
  });
  const bUserId = bUserRes.user.id;

  // Save 19 unique words one by one
  for (let i = 1; i <= 19; i++) {
    await progressService.executeAction(bUserId, { action: 'SAVE_WORD', word: `word_${i}` });
  }

  const pAt19 = await progressService.getProfile(bUserId);
  const wordsMissionAt19 = pAt19.missions.find((m) => m.type === 'words');
  assert(wordsMissionAt19.done === 19, 'Words mission at 19/20');
  assert(wordsMissionAt19.done_flag === false, 'done_flag is false at 19/20');

  // Save 20th word -> must trigger mission completion bonus exactly once
  const pAt20Res = await progressService.executeAction(bUserId, {
    action: 'SAVE_WORD',
    word: 'word_20',
  });
  assert(pAt20Res.reward.missionBonus, 'Mission bonus triggered on 20th word');
  assert(pAt20Res.reward.missionBonus.xp === 100, 'Mission bonus +100 XP awarded');
  assert(pAt20Res.reward.missionBonus.gold === 50, 'Mission bonus +50 Gold awarded');
  const wordsMissionAt20 = pAt20Res.profile.missions.find((m) => m.type === 'words');
  assert(wordsMissionAt20.done === 20, 'Words mission is 20/20');
  assert(wordsMissionAt20.done_flag === true, 'done_flag is true');

  // Save 21st word -> must NOT trigger mission bonus again
  const pAt21Res = await progressService.executeAction(bUserId, {
    action: 'SAVE_WORD',
    word: 'word_21',
  });
  assert(!pAt21Res.reward.missionBonus, '21st word does NOT trigger duplicate mission bonus');
  assert(pAt21Res.reward.xp === 15, 'Only normal 15 XP awarded for 21st word');

  // -------------------------------------------------------------
  // TEST G: Level Formula Consistency
  // -------------------------------------------------------------
  console.log('\n▶ Test G: Level Formula Consistency');
  assert(calculateLevel(0).level === 1, '0 XP = Level 1');
  assert(calculateLevel(199).level === 1, '199 XP = Level 1');
  assert(calculateLevel(200).level === 2, '200 XP = Level 2');
  assert(calculateLevel(499).level === 2, '499 XP = Level 2');
  assert(calculateLevel(500).level === 3, '500 XP = Level 3');
  assert(calculateLevel(899).level === 3, '899 XP = Level 3');
  assert(calculateLevel(900).level === 4, '900 XP = Level 4');

  // -------------------------------------------------------------
  // TEST H: Transaction Rollback on Error
  // -------------------------------------------------------------
  console.log('\n▶ Test H: Transaction Rollback on Error');
  const preXp = pAt21Res.profile.totalXp;
  let forcedFail = false;
  try {
    await progressService.executeAction(bUserId, {
      action: 'COMPLETE_UNIT',
      questId: 1,
      unitId: 9999, // Will throw 400 mid-action
    });
  } catch (err) {
    forcedFail = true;
  }
  assert(forcedFail, 'Action threw error as expected');
  const postFailProfile = await progressService.getProfile(bUserId);
  assert(postFailProfile.totalXp === preXp, 'State completely rolled back on error (no partial changes committed)');

  // -------------------------------------------------------------
  // TEST I: Security & IDOR Protection
  // -------------------------------------------------------------
  console.log('\n▶ Test I: Security & IDOR Protection');

  // User B attempts to pass body.userId = User A
  const idorRes = await progressService.executeAction(bUserId, {
    action: 'SAVE_WORD',
    word: 'security_word',
    userId: userId, // Body attempt to tamper with another user's profile
  });
  assert(idorRes.profile.userId === bUserId, 'Target profile strictly scoped to authenticated user (body userId ignored)');

  // Verify User A's profile was not modified
  const userAProfile = await progressService.getProfile(userId);
  assert(!userAProfile.savedWords.includes('security_word'), "Victim user's profile remains unmodified");

  // -------------------------------------------------------------
  // TEST J: Legacy Endpoints Compatibility
  // -------------------------------------------------------------
  console.log('\n▶ Test J: Legacy Endpoints Compatibility');
  const stats = await progressService.getUserStats(userId);
  assert(stats.total_xp >= 60, 'getUserStats reads authoritative total_xp from player_profiles');
  assert(stats.gold >= 0, 'getUserStats reads authoritative gold from player_profiles');
  assert(stats.current_level >= 1, 'getUserStats reads current_level');

  console.log('\n=================================================================');
  console.log(`🎉 ALL PHASE 2B.1 PROGRESSION ENGINE TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('=================================================================\n');

  await pool.end();
  process.exit(0);
}

runSuite().catch(async (err) => {
  console.error('\n❌ Test Suite Aborted due to error:', err);
  await pool.end();
  process.exit(1);
});
