/**
 * Phase 2A – Database Foundation Verification Test Suite
 *
 * Tests:
 * 1. Fresh database migration (--force)
 * 2. Existing database migration
 * 3. Migration run twice (Idempotency)
 * 4. Existing user backward-compatible profile seeding
 * 5. New user registration profile initialization
 * 6. Foreign-key CASCADE behavior (users -> player_profiles & idempotency_keys)
 * 7. Unique constraint behavior (player_profiles PK & idempotency_keys composite unique)
 * 8. Existing user_progress preservation
 */

const path = require('path');
const { Client, Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const authService = require('./src/services/auth.service');
const { execSync } = require('child_process');

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
  console.log('🧪 Starting Phase 2A Database Foundation Verification Suite');
  console.log('=================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Fresh Database Migration (--force)
  // -------------------------------------------------------------
  console.log('▶ Test 1: Fresh Database Migration (--force)');
  execSync('node database/migrate.js --force', { stdio: 'pipe' });
  
  const client = await pool.connect();
  try {
    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const tableNames = tables.map(t => t.table_name);
    assert(tableNames.includes('player_profiles'), 'player_profiles table created on fresh database');
    assert(tableNames.includes('idempotency_keys'), 'idempotency_keys table created on fresh database');
    assert(tableNames.includes('user_progress'), 'user_progress table exists');
    assert(tableNames.includes('users'), 'users table exists');
    assert(tableNames.includes('learning_phases'), 'learning_phases table exists');
  } finally {
    client.release();
  }

  // -------------------------------------------------------------
  // TEST 2 & 3: Migration on Existing DB & Run Twice (Idempotency)
  // -------------------------------------------------------------
  console.log('\n▶ Test 2 & 3: Migration Run Twice on Existing DB (Idempotency)');
  // First normal run on existing DB
  execSync('node database/migrate.js', { stdio: 'pipe' });
  assert(true, 'First migration run on existing DB succeeded without error');
  
  // Second run on existing DB
  execSync('node database/migrate.js', { stdio: 'pipe' });
  assert(true, 'Second migration run on existing DB succeeded without error (100% idempotent)');

  // -------------------------------------------------------------
  // TEST 4: Existing User Profile Seeding (Backward Compatibility)
  // -------------------------------------------------------------
  console.log('\n▶ Test 4: Existing User Profile Seeding');
  const c4 = await pool.connect();
  let existingUserId;
  try {
    // Simulate an existing user created before Phase 2 (only in users and user_progress)
    const userRes = await c4.query(`
      INSERT INTO users (email, password_hash, display_name)
      VALUES ('legacy_player@engjoy.com', 'hashed_pw', 'Legacy Gamer')
      RETURNING id;
    `);
    existingUserId = userRes.rows[0].id;

    // Simulate existing user_progress with total_xp = 420, current_level = 2, streak_days = 5
    await c4.query(`
      INSERT INTO user_progress (user_id, status, total_xp, current_level, streak_days, started_at)
      VALUES ($1, 'in_progress', 420, 2, 5, NOW());
    `, [existingUserId]);

    // Ensure legacy user does NOT yet have a player_profiles row
    await c4.query(`DELETE FROM player_profiles WHERE user_id = $1`, [existingUserId]);

    // Run the migration
    execSync('node database/migrate.js', { stdio: 'pipe' });

    // Verify player_profiles was automatically seeded with inherited metrics
    const profileRes = await c4.query(`
      SELECT * FROM player_profiles WHERE user_id = $1;
    `, [existingUserId]);

    assert(profileRes.rows.length === 1, 'Legacy user received exactly 1 player_profiles row');
    const profile = profileRes.rows[0];
    assert(profile.total_xp === 420, `total_xp correctly inherited from user_progress (expected 420, got ${profile.total_xp})`);
    assert(profile.current_level === 2, `current_level correctly inherited (expected 2, got ${profile.current_level})`);
    assert(profile.streak_days === 5, `streak_days correctly inherited (expected 5, got ${profile.streak_days})`);
    assert(profile.gold === 0, 'gold defaults to 0');
    assert(profile.words_learned === 0, 'words_learned defaults to 0');
    assert(Array.isArray(profile.saved_words) && profile.saved_words.length === 0, 'saved_words defaults to empty array');
    assert(Array.isArray(profile.missions) && profile.missions.length === 3, 'missions defaults to 3 baseline missions');
    assert(profile.guest_migrated === false, 'guest_migrated defaults to false');

    // Run migration again to ensure existing seeded profile is NOT overwritten or duplicated
    execSync('node database/migrate.js', { stdio: 'pipe' });
    const profileResAfter = await c4.query(`
      SELECT * FROM player_profiles WHERE user_id = $1;
    `, [existingUserId]);
    assert(profileResAfter.rows.length === 1, 'Subsequent migration did not duplicate player_profiles');
    assert(profileResAfter.rows[0].total_xp === 420, 'Subsequent migration preserved profile state');
  } finally {
    c4.release();
  }

  // -------------------------------------------------------------
  // TEST 5: New User Registration Profile Initialization
  // -------------------------------------------------------------
  console.log('\n▶ Test 5: New User Registration Profile Initialization');
  const regResult = await authService.register({
    email: 'new_adventurer@engjoy.com',
    password: 'Password123!',
    displayName: 'New Adventurer'
  });

  assert(regResult.user && regResult.user.id, 'User registered via AuthService');
  const newUserId = regResult.user.id;

  const c5 = await pool.connect();
  try {
    const { rows: profRows } = await c5.query(`
      SELECT * FROM player_profiles WHERE user_id = $1;
    `, [newUserId]);

    assert(profRows.length === 1, 'New user automatically received a player_profiles row');
    const newProf = profRows[0];
    assert(newProf.total_xp === 0, 'total_xp is 0');
    assert(newProf.current_level === 1, 'current_level is 1');
    assert(newProf.gold === 0, 'gold is 0');
    assert(newProf.streak_days === 0, 'streak_days is 0');
    assert(newProf.words_learned === 0, 'words_learned is 0');
    assert(Array.isArray(newProf.missions) && newProf.missions.length === 3, 'Missions initialized with 3 default items');
    assert(newProf.guest_migrated === false, 'guest_migrated is false');
  } finally {
    c5.release();
  }

  // -------------------------------------------------------------
  // TEST 6: Foreign-Key Behavior (CASCADE)
  // -------------------------------------------------------------
  console.log('\n▶ Test 6: Foreign-Key Behavior (CASCADE)');
  const c6 = await pool.connect();
  try {
    // Add an idempotency key for this user
    await c6.query(`
      INSERT INTO idempotency_keys (user_id, key, action_type, response)
      VALUES ($1, 'test-key-001', 'COMPLETE_UNIT', '{"success": true}'::jsonb);
    `, [newUserId]);

    // Verify rows exist before delete
    const { rows: preProf } = await c6.query(`SELECT 1 FROM player_profiles WHERE user_id = $1;`, [newUserId]);
    const { rows: preIdem } = await c6.query(`SELECT 1 FROM idempotency_keys WHERE user_id = $1;`, [newUserId]);
    assert(preProf.length === 1, 'player_profiles row exists prior to user deletion');
    assert(preIdem.length === 1, 'idempotency_keys row exists prior to user deletion');

    // Delete user from users table
    await c6.query(`DELETE FROM users WHERE id = $1;`, [newUserId]);

    // Verify cascade deletion
    const { rows: postProf } = await c6.query(`SELECT 1 FROM player_profiles WHERE user_id = $1;`, [newUserId]);
    const { rows: postIdem } = await c6.query(`SELECT 1 FROM idempotency_keys WHERE user_id = $1;`, [newUserId]);
    const { rows: postProg } = await c6.query(`SELECT 1 FROM user_progress WHERE user_id = $1;`, [newUserId]);
    assert(postProf.length === 0, 'player_profiles row was automatically CASCADE deleted');
    assert(postIdem.length === 0, 'idempotency_keys row was automatically CASCADE deleted');
    assert(postProg.length === 0, 'user_progress row was automatically CASCADE deleted');
  } finally {
    c6.release();
  }

  // -------------------------------------------------------------
  // TEST 7: Unique Constraint Behavior
  // -------------------------------------------------------------
  console.log('\n▶ Test 7: Unique Constraint Behavior');
  const c7 = await pool.connect();
  try {
    // Re-use existingUserId
    let duplicateProfileFailed = false;
    try {
      await c7.query(`
        INSERT INTO player_profiles (user_id, total_xp)
        VALUES ($1, 999);
      `, [existingUserId]);
    } catch (err) {
      if (err.code === '23505') { // unique_violation
        duplicateProfileFailed = true;
      }
    }
    assert(duplicateProfileFailed, 'Duplicate player_profiles insert for same user_id correctly rejected (PK constraint)');

    // Idempotency key scoped by user_id:
    // Insert key 'shared-key' for existingUserId
    await c7.query(`
      INSERT INTO idempotency_keys (user_id, key, action_type, response)
      VALUES ($1, 'shared-key', 'COMPLETE_QUIZ', '{"xp": 100}'::jsonb);
    `, [existingUserId]);

    // Attempt duplicate for SAME user -> must fail
    let duplicateKeyFailed = false;
    try {
      await c7.query(`
        INSERT INTO idempotency_keys (user_id, key, action_type, response)
        VALUES ($1, 'shared-key', 'COMPLETE_QUIZ', '{"xp": 100}'::jsonb);
      `, [existingUserId]);
    } catch (err) {
      if (err.code === '23505') {
        duplicateKeyFailed = true;
      }
    }
    assert(duplicateKeyFailed, 'Duplicate idempotency key for SAME user rejected (uq_idempotency_user_key constraint)');

    // Create a second user to test SAME key across DIFFERENT users
    const user2Res = await c7.query(`
      INSERT INTO users (email, password_hash, display_name)
      VALUES ('player_two@engjoy.com', 'hashed_pw', 'Player Two')
      RETURNING id;
    `);
    const user2Id = user2Res.rows[0].id;

    let differentUserKeySucceeded = false;
    try {
      await c7.query(`
        INSERT INTO idempotency_keys (user_id, key, action_type, response)
        VALUES ($1, 'shared-key', 'COMPLETE_QUIZ', '{"xp": 50}'::jsonb);
      `, [user2Id]);
      differentUserKeySucceeded = true;
    } catch (err) {
      differentUserKeySucceeded = false;
    }
    assert(differentUserKeySucceeded, 'Same key for a DIFFERENT user succeeded (keys are properly user-scoped)');
  } finally {
    c7.release();
  }

  // -------------------------------------------------------------
  // TEST 8: Preserving Existing user_progress Intact
  // -------------------------------------------------------------
  console.log('\n▶ Test 8: Preserving Existing user_progress Intact');
  const c8 = await pool.connect();
  try {
    const { rows: legacyProgress } = await c8.query(`
      SELECT * FROM user_progress WHERE user_id = $1;
    `, [existingUserId]);

    assert(legacyProgress.length === 1, 'user_progress row still exists for legacy user');
    assert(legacyProgress[0].total_xp === 420, 'user_progress total_xp is intact (420)');
    assert(legacyProgress[0].current_level === 2, 'user_progress current_level is intact (2)');
    assert(legacyProgress[0].streak_days === 5, 'user_progress streak_days is intact (5)');
  } finally {
    c8.release();
  }

  console.log('\n=================================================================');
  console.log(`🎉 ALL PHASE 2A DATABASE FOUNDATION TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('=================================================================\n');

  await pool.end();
  process.exit(0);
}

runSuite().catch(async (err) => {
  console.error('\n❌ Test Suite Aborted due to error:', err);
  await pool.end();
  process.exit(1);
});
