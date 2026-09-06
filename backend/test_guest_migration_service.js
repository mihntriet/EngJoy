/**
 * Comprehensive Integration & Concurrency Test Suite for
 * Guest Migration Transaction & Merge Service (Phase 2C.2)
 *
 * Uses REAL PostgreSQL to verify:
 * - Atomic transactions and rollback guarantees
 * - Row locking and concurrency safety (Promise.all concurrent requests)
 * - Single-migration invariant and 409 conflict handling
 * - Zero mission reward replay
 * - Direct DB state verification
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const assert = require('assert');
const { pool } = require('./src/config/db.postgres');
const progressService = require('./src/services/progress.service');
const { calculateLevel } = require('./src/constants/gameCatalog');

let passed = 0;
let failed = 0;

function logPass(msg) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

function logFail(msg, err) {
  console.error(`  ✗ FAIL: ${msg}`);
  if (err) console.error(err);
  failed++;
}

async function createTestUser(emailSuffix = '') {
  const email = `mig_user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${emailSuffix}@engjoy.com`;
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role)
     VALUES ($1, 'hash123', 'Test Warrior', 'student')
     RETURNING id, email`,
    [email]
  );
  return rows[0];
}

async function getProfileDirect(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM player_profiles WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function runSuite() {
  console.log('=================================================================');
  console.log('  PHASE 2C.2 — GUEST MIGRATION TRANSACTION & SERVICE SUITE       ');
  console.log('=================================================================\n');

  try {
    // ─── Test A: Fresh Account Migration ─────────────────────────────────────
    console.log('▶ Test A: Fresh Account Migration');
    {
      const user = await createTestUser('_a');
      const snapshot = {
        migrationKey: `mig_key_a_${Date.now()}`,
        xp: 120, // 2 units
        gold: 60,
        streak: 2,
        wordsLearned: 30,
        savedWords: ['crystal', 'shield'],
        questUnits: {
          '1': [{ id: 1, status: 'done' }, { id: 2, status: 'done' }],
        },
        ownedItemIds: ['4'],
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.migrated, true);
      assert.strictEqual(res.alreadyMigrated, false);
      assert.strictEqual(res.profile.totalXp, 120);
      assert.strictEqual(res.profile.currentLevel, 1);
      assert.strictEqual(res.profile.gold, 60);
      assert.strictEqual(res.profile.streakDays, 2);
      assert.strictEqual(res.profile.guestMigrated, true);
      assert.strictEqual(res.profile.savedWords.length, 2);

      // Verify PostgreSQL directly
      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(dbRow.guest_migrated, true);
      assert.strictEqual(dbRow.migration_key, snapshot.migrationKey);
      assert.strictEqual(dbRow.total_xp, 120);
      assert.strictEqual(dbRow.gold, 60);
      logPass('Fresh account migrated successfully and verified in DB');
    }

    // ─── Test B: Empty Snapshot ──────────────────────────────────────────────
    console.log('\n▶ Test B: Empty Snapshot Migration');
    {
      const user = await createTestUser('_b');
      const snapshot = {
        migrationKey: `mig_key_b_${Date.now()}`,
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.profile.totalXp, 0);
      assert.strictEqual(res.profile.currentLevel, 1);
      assert.strictEqual(res.profile.gold, 0);
      assert.strictEqual(res.profile.guestMigrated, true);

      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(dbRow.guest_migrated, true);
      assert.strictEqual(dbRow.total_xp, 0);
      logPass('Empty snapshot produces safe zero baseline and sets guest_migrated=true');
    }

    // ─── Test C & D & E: XP, Gold, Level Recalculation ────────────────────────
    console.log('\n▶ Test C & D & E: XP, Gold, and Canonical Level Recalculation');
    {
      const user = await createTestUser('_cde');
      // 5 units * 60 = 300 XP (enough for Level 2)
      const snapshot = {
        migrationKey: `mig_key_cde_${Date.now()}`,
        xp: 300,
        gold: 150,
        questUnits: {
          '1': Array.from({ length: 5 }, (_, i) => ({ id: i + 1, status: 'done' })),
        },
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      assert.strictEqual(res.profile.totalXp, 300);
      assert.strictEqual(res.profile.currentLevel, 2); // 300 XP threshold >= 200 -> Level 2
      assert.strictEqual(res.profile.gold, 150);

      const canonicalLevel = calculateLevel(300).level;
      assert.strictEqual(res.profile.currentLevel, canonicalLevel);
      logPass('XP, Gold, and canonical Level 2 accurately calculated');
    }

    // ─── Test F & G & H: Streak, WordsLearned, SavedWords Union/Dedup ─────────
    console.log('\n▶ Test F & G & H: Streak, wordsLearned, and savedWords Union');
    {
      const user = await createTestUser('_fgh');
      // Pre-seed server profile with existing saved words and streak
      await pool.query(
        `INSERT INTO player_profiles (user_id, total_xp, streak_days, words_learned, saved_words)
         VALUES ($1, 50, 4, 10, '{"dragon", "sword"}')`,
        [user.id]
      );

      const snapshot = {
        migrationKey: `mig_key_fgh_${Date.now()}`,
        streak: 7,
        savedWords: ['shield', 'dragon', 'potion'], // 'dragon' is duplicate
        questUnits: {
          '1': [{ id: 1, status: 'done' }],
        },
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      // Streak: max(4, 7) = 7
      assert.strictEqual(res.profile.streakDays, 7);
      // Saved words: union {"dragon", "sword", "shield", "potion"} -> 4 words
      assert.strictEqual(res.profile.savedWords.length, 4);
      assert(res.profile.savedWords.includes('dragon'));
      assert(res.profile.savedWords.includes('sword'));
      assert(res.profile.savedWords.includes('shield'));
      assert(res.profile.savedWords.includes('potion'));
      // wordsLearned: server (10) + guest reconstructed (1 unit*15 + 3 words*1 = 18) = 28
      assert.strictEqual(res.profile.wordsLearned, 28);
      logPass('Streak max merged, wordsLearned added, savedWords deduplicated union verified');
    }

    // ─── Test I: QuestUnits Merged Structurally ──────────────────────────────
    console.log('\n▶ Test I: QuestUnits Merged by Identity Contiguously');
    {
      const user = await createTestUser('_i');
      // Server already completed Unit 1
      await pool.query(
        `INSERT INTO player_profiles (user_id, quest_units)
         VALUES ($1, '{"1": [{"id": 1, "status": "done"}, {"id": 2, "status": "active"}]}')`,
        [user.id]
      );

      // Guest completed Unit 2 and Unit 3
      const snapshot = {
        migrationKey: `mig_key_i_${Date.now()}`,
        questUnits: {
          '1': [
            { id: 1, status: 'done' },
            { id: 2, status: 'done' },
            { id: 3, status: 'done' },
          ],
        },
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      const q1 = res.profile.questUnits['1'];
      assert.strictEqual(q1[0].status, 'done');
      assert.strictEqual(q1[1].status, 'done');
      assert.strictEqual(q1[2].status, 'done');
      assert.strictEqual(q1[3].status, 'active');
      logPass('Quest units merged with contiguous progression preserved');
    }

    // ─── Test J & K: Owned Items Union & Equipment Preservation ──────────────
    console.log('\n▶ Test J & K: Owned Items Union & Equipment Preservation');
    {
      const user = await createTestUser('_jk');
      // Server owns item '4', equipped item '4'
      await pool.query(
        `INSERT INTO player_profiles (user_id, owned_item_ids, equipped_ids)
         VALUES ($1, '{"4"}', '{"4"}')`,
        [user.id]
      );

      // Guest owns item '2' (250 gold, solvent with 1 unit + unlogged gold: 30 + 225 = 255 >= 250)
      const snapshot = {
        migrationKey: `mig_key_jk_${Date.now()}`,
        questUnits: { '1': [{ id: 1, status: 'done' }] },
        ownedItemIds: ['2', '4'],
        equippedIds: ['2'],
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      // Owned items union: '4' and '2'
      assert.strictEqual(res.profile.ownedItemIds.length, 2);
      assert(res.profile.ownedItemIds.includes('4'));
      assert(res.profile.ownedItemIds.includes('2'));
      // Server already had equipped item '4', so server equipment preserved
      assert.deepStrictEqual(res.profile.equippedIds, ['4']);
      logPass('Owned items unioned and server equipment preserved');
    }

    // ─── Test L: Missions Merged Without Reward Replay ────────────────────────
    console.log('\n▶ Test L: Missions Merged Without Reward Replay (INV-2)');
    {
      const user = await createTestUser('_l');
      // Server initial XP = 100
      await pool.query(
        `INSERT INTO player_profiles (user_id, total_xp, gold)
         VALUES ($1, 100, 50)`,
        [user.id]
      );

      // Guest completed words mission (100 XP, 50 gold bonus), but rawGuestXP = 60
      const snapshot = {
        migrationKey: `mig_key_l_${Date.now()}`,
        xp: 60,
        gold: 30,
        questUnits: { '1': [{ id: 1, status: 'done' }] },
        missions: [{ id: 1, type: 'words', done: 20, total: 20, done_flag: true }],
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      // Final XP must be exactly 100 + 60 = 160. MUST NOT mint mission bonus (+100)!
      assert.strictEqual(res.profile.totalXp, 160);
      assert.strictEqual(res.profile.gold, 80); // 50 + 30
      // Mission progress updated to done for display
      const m1 = res.profile.missions.find(m => m.id === 1);
      assert.strictEqual(m1.done, 20);
      assert.strictEqual(m1.done_flag, true);
      logPass('Missions merged visually with zero double-counting / reward replay');
    }

    // ─── Test M: First Migration Sets guest_migrated = true ──────────────────
    console.log('\n▶ Test M: First Migration Marks Profile As Migrated');
    {
      const user = await createTestUser('_m');
      const key = `mig_key_m_${Date.now()}`;
      await progressService.migrateGuestProgress(user.id, { migrationKey: key, xp: 60 });
      const row = await getProfileDirect(user.id);
      assert.strictEqual(row.guest_migrated, true);
      assert.strictEqual(row.migration_key, key);
      logPass('First migration successfully set guest_migrated=true and recorded migration_key');
    }

    // ─── Test N: Same Key Retry Is Idempotent ────────────────────────────────
    console.log('\n▶ Test N: Same Key Retry Is Idempotent (No Double Reward)');
    {
      const user = await createTestUser('_n');
      const key = `mig_key_n_${Date.now()}`;
      const snapshot = { migrationKey: key, xp: 60, gold: 30 };

      const firstRes = await progressService.migrateGuestProgress(user.id, snapshot);
      assert.strictEqual(firstRes.profile.totalXp, 60);

      // Repeat with EXACT SAME KEY
      const secondRes = await progressService.migrateGuestProgress(user.id, snapshot);
      assert.strictEqual(secondRes.success, true);
      assert.strictEqual(secondRes.profile.totalXp, 60); // Still 60! NOT 120!

      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(dbRow.total_xp, 60);
      logPass('Idempotent retry returns identical profile without duplicating rewards');
    }

    // ─── Test O: Same Key Concurrent Requests -> Exactly One Effect ──────────
    console.log('\n▶ Test O: Real Concurrent Requests with Same Key (Promise.all)');
    {
      const user = await createTestUser('_o');
      const key = `mig_key_concurrent_same_${Date.now()}`;
      const snapshot = {
        migrationKey: key,
        xp: 100,
        gold: 50,
        questUnits: { '1': [{ id: 1, status: 'done' }] },
      };

      // Launch two parallel asynchronous requests
      const [resA, resB] = await Promise.all([
        progressService.migrateGuestProgress(user.id, snapshot),
        progressService.migrateGuestProgress(user.id, snapshot),
      ]);

      assert.strictEqual(resA.profile.totalXp, 100);
      assert.strictEqual(resB.profile.totalXp, 100);

      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(dbRow.total_xp, 100, 'DB total_xp must be exactly 100 (no race condition)');
      assert.strictEqual(dbRow.gold, 50);

      // Verify idempotency record count
      const { rows: idempRows } = await pool.query(
        `SELECT * FROM idempotency_keys WHERE user_id = $1 AND key = $2`,
        [user.id, key]
      );
      assert.strictEqual(idempRows.length, 1, 'Exactly one idempotency record stored');
      logPass('Concurrent identical requests serialized cleanly with row locking');
    }

    // ─── Test P: Different Key After Migration -> 409 Conflict ───────────────
    console.log('\n▶ Test P: Different Key After Migration Rejection (409 Conflict)');
    {
      const user = await createTestUser('_p');
      const key1 = `mig_key_p1_${Date.now()}`;
      const key2 = `mig_key_p2_${Date.now()}`;

      await progressService.migrateGuestProgress(user.id, { migrationKey: key1, xp: 60 });

      let caughtErr = null;
      try {
        await progressService.migrateGuestProgress(user.id, { migrationKey: key2, xp: 120 });
      } catch (err) {
        caughtErr = err;
      }

      assert(caughtErr !== null, 'Must throw error');
      assert.strictEqual(caughtErr.statusCode, 409, 'Error status must be 409');

      // Verify DB total_xp was NOT modified by second attempt
      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(dbRow.total_xp, 60);
      logPass('Second migration with different key rejected with 409 Conflict');
    }

    // ─── Test Q: Concurrent Requests with Different Keys -> Only One Wins ────
    console.log('\n▶ Test Q: Real Concurrent Requests with Different Keys');
    {
      const user = await createTestUser('_q');
      const keyA = `mig_key_q_A_${Date.now()}`;
      const keyB = `mig_key_q_B_${Date.now()}`;

      const snapshotA = { migrationKey: keyA, xp: 60 };
      const snapshotB = { migrationKey: keyB, xp: 120 };

      // Launch two parallel requests with DIFFERENT keys
      const results = await Promise.allSettled([
        progressService.migrateGuestProgress(user.id, snapshotA),
        progressService.migrateGuestProgress(user.id, snapshotB),
      ]);

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');

      assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent request must succeed');
      assert.strictEqual(rejected.length, 1, 'The other request must be rejected');
      assert.strictEqual(rejected[0].reason.statusCode, 409, 'Rejected request threw 409');

      const dbRow = await getProfileDirect(user.id);
      assert(dbRow.total_xp === 60 || dbRow.total_xp === 120, 'Only one snapshot applied');
      logPass('Concurrent different-key requests: exactly one won, other rejected with 409');
    }

    // ─── Test R: Idempotency Response Persisted ──────────────────────────────
    console.log('\n▶ Test R: Idempotency Record Persisted in PostgreSQL');
    {
      const user = await createTestUser('_r');
      const key = `mig_key_r_${Date.now()}`;
      await progressService.migrateGuestProgress(user.id, { migrationKey: key, xp: 60 });

      const { rows } = await pool.query(
        `SELECT * FROM idempotency_keys WHERE user_id = $1 AND key = $2`,
        [user.id, key]
      );
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].action_type, 'MIGRATE_GUEST');
      assert(rows[0].response.profile.totalXp === 60);
      logPass('Idempotency response committed in PostgreSQL idempotency_keys table');
    }

    // ─── Test S: Foreign Key / DB Error Rollback ─────────────────────────────
    console.log('\n▶ Test S: Foreign Key / DB Error Rollback (Zero Partial State)');
    {
      const user = await createTestUser('_s');
      await pool.query(
        `INSERT INTO player_profiles (user_id, total_xp, gold, guest_migrated)
         VALUES ($1, 50, 20, FALSE)`,
        [user.id]
      );

      let caught = null;
      try {
        // Pass a non-existent user UUID to trigger foreign key error
        await progressService.migrateGuestProgress('00000000-0000-0000-0000-000000000000', {
          migrationKey: 'mig_fk_error',
          xp: 100,
        });
      } catch (err) {
        caught = err;
      }
      assert(caught !== null);

      const originalRow = await getProfileDirect(user.id);
      assert.strictEqual(originalRow.total_xp, 50);
      assert.strictEqual(originalRow.guest_migrated, false);
      logPass('DB error triggered complete rollback; original profile untouched');
    }

    // ─── Test T: Forced Failure After Profile UPDATE But Before COMMIT ────────
    console.log('\n▶ Test T: Forced Failure After Profile UPDATE But Before COMMIT');
    {
      const user = await createTestUser('_t');
      await pool.query(
        `INSERT INTO player_profiles (user_id, total_xp, gold, guest_migrated)
         VALUES ($1, 50, 20, FALSE)`,
        [user.id]
      );

      const rollbackKey = 'trigger_rollback_test';
      const snapshot = { migrationKey: rollbackKey, xp: 120, gold: 60 };

      // Add a real PostgreSQL constraint that fails specifically on idempotency insert
      // (AFTER player_profiles has already been updated in the transaction)
      await pool.query(
        `ALTER TABLE idempotency_keys 
         ADD CONSTRAINT test_simulated_fail CHECK (key != 'trigger_rollback_test')`
      );

      let caught = null;
      try {
        await progressService.migrateGuestProgress(user.id, snapshot);
      } catch (err) {
        caught = err;
      } finally {
        await pool.query(`ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS test_simulated_fail`);
      }

      assert(caught !== null, 'Must throw error on idempotency insert');
      assert(caught.message.includes('test_simulated_fail'), 'Threw check constraint violation');

      // Verify directly against PostgreSQL that entire transaction was rolled back
      const restoredProfile = await getProfileDirect(user.id);
      assert.strictEqual(restoredProfile.total_xp, 50, 'total_xp restored to pre-migration 50');
      assert.strictEqual(restoredProfile.gold, 20, 'gold restored to pre-migration 20');
      assert.strictEqual(restoredProfile.guest_migrated, false, 'guest_migrated remains FALSE');
      assert.strictEqual(restoredProfile.migration_key, null, 'migration_key remains NULL');

      const { rows: idempRows } = await pool.query(
        `SELECT * FROM idempotency_keys WHERE user_id = $1 AND key = $2`,
        [user.id, rollbackKey]
      );
      assert.strictEqual(idempRows.length, 0, 'Zero idempotency_keys rows persisted');
      logPass('Mid-transaction failure rolled back: profile restored, guest_migrated false, zero idempotency records');
    }



    // ─── Test V, W, X: Existing Server Progression + Guest Merge ─────────────
    console.log('\n▶ Test V, W, X: Existing Server Progression + Guest Additive Merge');
    {
      const user = await createTestUser('_vwx');
      // Existing server profile: 200 XP, 100 Gold, Level 2, Items: ['4'], Words: ['magic']
      await pool.query(
        `INSERT INTO player_profiles (user_id, total_xp, current_level, gold, streak_days, words_learned, saved_words, owned_item_ids)
         VALUES ($1, 200, 2, 100, 3, 20, '{"magic"}', '{"4"}')`,
        [user.id]
      );

      // Guest: 180 XP (3 units), 60 Gold, Items: ['2'] (250 gold), Words: ['rune', 'magic']
      // Lifetime capacity: 3*30 + 2*7 + 225 = 329. Item 2 = 250. Remaining budget: 79 >= 60. Solvent!
      const snapshot = {
        migrationKey: `mig_key_vwx_${Date.now()}`,
        xp: 180,
        gold: 60,
        streak: 5,
        savedWords: ['rune', 'magic'],
        ownedItemIds: ['2'],
        questUnits: {
          '1': [{ id: 1, status: 'done' }, { id: 2, status: 'done' }, { id: 3, status: 'done' }],
        },
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      // XP: 200 + 180 = 380 (Level 2)
      assert.strictEqual(res.profile.totalXp, 380);
      // Gold: 100 + 60 = 160
      assert.strictEqual(res.profile.gold, 160);

      // Streak: max(3, 5) = 5
      assert.strictEqual(res.profile.streakDays, 5);
      // Words: 'magic', 'rune'
      assert.strictEqual(res.profile.savedWords.length, 2);
      // Items: '4', '2'
      assert.strictEqual(res.profile.ownedItemIds.length, 2);
      logPass('Existing server state combined additively without data loss');
    }

    // ─── Test Y: Malformed Input Rejection ────────────────────────────────────
    console.log('\n▶ Test Y: Malformed Input Rejection');
    {
      const user = await createTestUser('_y');
      await assert.rejects(
        () => progressService.migrateGuestProgress(null, { migrationKey: 'mig_k' }),
        /userId is required/
      );
      await assert.rejects(
        () => progressService.migrateGuestProgress(user.id, { migrationKey: '' }),
        /migrationKey/
      );
      logPass('Missing userId and malformed migrationKey rejected with validation errors');
    }

    // ─── Test Z & AA: No Duplicate Rewards & No Negative Gold ────────────────
    console.log('\n▶ Test Z & AA: No Negative Balances Or Duplicate Rewards');
    {
      const user = await createTestUser('_zaa');
      const snapshot = {
        migrationKey: `mig_key_zaa_${Date.now()}`,
        xp: -500,
        gold: -300,
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      assert.strictEqual(res.profile.totalXp, 0);
      assert.strictEqual(res.profile.gold, 0);
      logPass('Negative balances normalized safely to zero baseline');
    }

    // ─── Test AB: Canonical Level Matches calculateLevel(totalXp) ────────────
    console.log('\n▶ Test AB: Canonical Level Matches calculateLevel Formula');
    {
      const user = await createTestUser('_ab');
      // 500 XP threshold: 0..199 (L1), 200..499 (L2), 500..899 (L3)
      // 8 units = 480 XP, 2 words = 30 XP -> 510 XP -> Level 3
      const snapshot = {
        migrationKey: `mig_key_ab_${Date.now()}`,
        xp: 510,
        questUnits: {
          '1': Array.from({ length: 8 }, (_, i) => ({ id: i + 1, status: 'done' })),
        },
        savedWords: ['potion', 'elixir'],
      };

      const res = await progressService.migrateGuestProgress(user.id, snapshot);
      assert.strictEqual(res.profile.totalXp, 510);
      assert.strictEqual(res.profile.currentLevel, 3);
      assert.strictEqual(res.profile.currentLevel, calculateLevel(510).level);
      logPass('Migrated level matches canonical calculateLevel formula (Level 3)');
    }

    // ─── Test AC: Returned Profile Matches Actual DB State ───────────────────
    console.log('\n▶ Test AC: Returned Profile Matches Actual PostgreSQL Record');
    {
      const user = await createTestUser('_ac');
      const key = `mig_key_ac_${Date.now()}`;
      const res = await progressService.migrateGuestProgress(user.id, {
        migrationKey: key,
        xp: 60,
        gold: 30,
        questUnits: { '1': [{ id: 1, status: 'done' }] },
      });

      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(res.profile.totalXp, dbRow.total_xp);
      assert.strictEqual(res.profile.currentLevel, dbRow.current_level);
      assert.strictEqual(res.profile.gold, dbRow.gold);
      assert.strictEqual(res.profile.streakDays, dbRow.streak_days);
      assert.strictEqual(res.profile.guestMigrated, dbRow.guest_migrated);
      assert.strictEqual(res.profile.userId, dbRow.user_id);
      logPass('Returned response fields strictly match live PostgreSQL row');
    }

    // ─── Test AD: Repeat GET /progress/profile Reads Same Merged State ────────
    console.log('\n▶ Test AD: Repeat GET Profile Reads Same Committed State');
    {
      const user = await createTestUser('_ad');
      const key = `mig_key_ad_${Date.now()}`;
      await progressService.migrateGuestProgress(user.id, {
        migrationKey: key,
        xp: 60,
        gold: 30,
        questUnits: { '1': [{ id: 1, status: 'done' }] },
      });

      const fetched = await progressService.getProfile(user.id);
      assert.strictEqual(fetched.totalXp, 60);
      assert.strictEqual(fetched.gold, 30);
      assert.strictEqual(fetched.guestMigrated, true);
      logPass('Standard getProfile() reads exact committed migration state');
    }
  } finally {
    console.log('\n=================================================================');
    console.log(`  PHASE 2C.2 SERVICE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=================================================================\n');
    await pool.end().catch(() => {});
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSuite().catch(err => {
  console.error('Test suite failed to run:', err);
  process.exit(1);
});

