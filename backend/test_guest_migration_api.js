/**
 * Comprehensive HTTP API Integration & Concurrency Test Suite
 * for Guest Migration HTTP API (Phase 2C.3)
 *
 * Route: POST /api/v1/progress/migrate-guest
 *
 * Uses:
 * - REAL Express application & HTTP server (ephemeral port)
 * - REAL authMiddleware & real signed JWT tokens
 * - REAL Joi request validation & stripping
 * - REAL PostgreSQL database connection
 * - REAL HTTP concurrency (Promise.all / Promise.allSettled)
 */

const path = require('path');
// Ensure .env is loaded from backend/.env regardless of CWD
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const http = require('http');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const config = require('./src/config/env');
const { pool } = require('./src/config/db.postgres');

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

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeHttpRequest(server, options, body = null, rawString = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    let payload = rawString;
    if (payload === null && body !== null) {
      payload = JSON.stringify(body);
    }

    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'POST',
      headers: {
        ...(payload !== null ? {
          'Content-Type': options.contentType || 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        } : {}),
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch {
          parsed = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          rawText: rawData,
        });
      });
    });

    req.on('error', reject);
    if (payload !== null) {
      req.write(payload);
    }
    req.end();
  });
}

async function createTestUser(emailSuffix = '') {
  const email = `api_mig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${emailSuffix}@engjoy.com`;
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role)
     VALUES ($1, 'hash123', 'API Test Warrior', 'student')
     RETURNING id, email, role`,
    [email]
  );
  const user = rows[0];
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
  return { user, token };
}

async function getProfileDirect(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM player_profiles WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

// ─── Test Suite Execution ────────────────────────────────────────────────────

async function runSuite() {
  console.log('=================================================================');
  console.log('  PHASE 2C.3 — GUEST MIGRATION HTTP API TEST SUITE               ');
  console.log('=================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;
  console.log(`[INFO] Ephemeral test server running on 127.0.0.1:${serverPort}\n`);

  try {
    // ─── Test A: Valid authenticated migration → 200 ──────────────────────────
    console.log('▶ Test A: Valid Authenticated Migration → 200');
    let userAData;
    let keyA;
    {
      userAData = await createTestUser('_a');
      keyA = `mig_key_a_${Date.now()}`;
      const payload = {
        migrationKey: keyA,
        snapshot: {
          xp: 120, // 2 units done
          gold: 60,
          streak: 2,
          wordsLearned: 30,
          savedWords: ['crystal', 'shield'],
          questUnits: {
            '1': [{ id: 1, status: 'done' }, { id: 2, status: 'done' }],
          },
          ownedItemIds: ['4'],
        },
      };

      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${userAData.token}` },
        },
        payload
      );

      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${res.rawText}`);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.migrated, true);
      assert.strictEqual(res.data.data.alreadyMigrated, false);
      assert.strictEqual(res.data.data.profile.totalXp, 120);
      assert.strictEqual(res.data.data.profile.gold, 60);
      assert.strictEqual(res.data.data.profile.guestMigrated, true);
      assert.strictEqual(res.data.data.profile.savedWords.length, 2);

      // Verify direct PostgreSQL state
      const dbRow = await getProfileDirect(userAData.user.id);
      assert.strictEqual(dbRow.guest_migrated, true);
      assert.strictEqual(dbRow.migration_key, keyA);
      assert.strictEqual(dbRow.total_xp, 120);
      assert.strictEqual(dbRow.gold, 60);
      logPass('Valid authenticated migration succeeds with 200 and matches DB');
    }

    // ─── Test B: Missing JWT → 401 ───────────────────────────────────────────
    console.log('\n▶ Test B: Missing JWT → 401 Unauthorized');
    {
      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
        },
        { migrationKey: 'key_no_jwt', snapshot: {} }
      );

      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
      assert.strictEqual(res.data.success, false);
      logPass('Missing JWT authorization header rejected with 401');
    }

    // ─── Test C: Invalid JWT → 401 ───────────────────────────────────────────
    console.log('\n▶ Test C: Invalid JWT → 401 Unauthorized');
    {
      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: 'Bearer this.is.an.invalid.token' },
        },
        { migrationKey: 'key_bad_jwt', snapshot: {} }
      );

      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
      assert.strictEqual(res.data.success, false);
      logPass('Invalid or forged JWT rejected with 401');
    }

    // ─── Test D: Missing migrationKey → 400 ───────────────────────────────────
    console.log('\n▶ Test D: Missing migrationKey → 400 Bad Request');
    {
      const { token } = await createTestUser('_d');
      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        { snapshot: { xp: 60 } } // Missing migrationKey
      );

      assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
      assert.strictEqual(res.data.success, false);
      logPass('Missing migrationKey rejected with 400 Validation Error');
    }

    // ─── Test E: Malformed snapshot → 400 ─────────────────────────────────────
    console.log('\n▶ Test E: Malformed Snapshot Transport Shape → 400');
    {
      const { token } = await createTestUser('_e');

      // E1: snapshot is a string, not an object
      const res1 = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        { migrationKey: 'key_e1', snapshot: 'invalid_string' }
      );
      assert.strictEqual(res1.status, 400);

      // E2: savedWords is not an array
      const res2 = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        { migrationKey: 'key_e2', snapshot: { savedWords: 'not_an_array' } }
      );
      assert.strictEqual(res2.status, 400);

      // E3: negative XP
      const res3 = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        { migrationKey: 'key_e3', snapshot: { xp: -50 } }
      );
      assert.strictEqual(res3.status, 400);

      // E4: illegal characters in migrationKey
      const res4 = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        { migrationKey: 'invalid key with spaces and #$%' }
      );
      assert.strictEqual(res4.status, 400);

      logPass('Malformed snapshot shapes and illegal migration keys rejected with 400');
    }

    // ─── Test F: Forged reward fields → ignored/rejected safely ───────────────
    console.log('\n▶ Test F: Forged Reward Fields → Safely Rejected with 400');
    {
      const { token } = await createTestUser('_f');
      // Forged field inside snapshot
      const res1 = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        {
          migrationKey: 'key_f1',
          snapshot: {
            xp: 60,
            earnedXp: 999999, // Forged
            goldEarned: 999999, // Forged
          },
        }
      );
      assert.strictEqual(res1.status, 400, 'Expected 400 when client injects forged reward fields');
      assert.strictEqual(res1.data.success, false);

      // Forged field at root
      const res2 = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        {
          migrationKey: 'key_f2',
          snapshot: { xp: 60 },
          earnedXp: 50000, // Forged root field
        }
      );
      assert.strictEqual(res2.status, 400, 'Expected 400 when client injects root forged reward fields');
      logPass('Forged reward fields (earnedXp, goldEarned) safely blocked with 400');
    }

    // ─── Test G & Step 12: Security Test: Forged userId In Body ──────────────
    console.log('\n▶ Test G & Step 12: Forged userId In Body → JWT Identity Authoritative');
    {
      const victim = await createTestUser('_victim');
      const attacker = await createTestUser('_attacker');

      const payload = {
        userId: victim.user.id,       // Attacker tries to hijack victim profile
        user_id: victim.user.id,
        accountId: victim.user.id,
        migrationKey: `key_sec_${Date.now()}`,
        snapshot: {
          xp: 60,
          gold: 30,
          questUnits: { '1': [{ id: 1, status: 'done' }] },
        },
      };

      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${attacker.token}` },
        },
        payload
      );

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.profile.userId, attacker.user.id);

      // Direct DB verification:
      // Attacker profile was updated
      const attackerDb = await getProfileDirect(attacker.user.id);
      assert.strictEqual(attackerDb.total_xp, 60);
      assert.strictEqual(attackerDb.guest_migrated, true);

      // Victim profile was UNTOUCHED
      const victimDb = await getProfileDirect(victim.user.id);
      assert.strictEqual(victimDb, null); // Never created or modified
      logPass('Client-supplied userId in body is completely ignored; only req.user.id is affected');
    }

    // ─── Test H: Same migrationKey retry → Idempotent (No Double Reward) ──────
    console.log('\n▶ Test H: Same migrationKey Retry → 200 Idempotent Replay');
    {
      const payload = {
        migrationKey: keyA, // Key already used in Test A
        snapshot: {
          xp: 120,
          gold: 60,
        },
      };

      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${userAData.token}` },
        },
        payload
      );

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.migrated, true);
      assert.strictEqual(res.data.data.profile.totalXp, 120);
      assert.strictEqual(res.data.data.profile.gold, 60);

      // DB verification: total_xp remains 120, not 240
      const dbRow = await getProfileDirect(userAData.user.id);
      assert.strictEqual(dbRow.total_xp, 120);
      assert.strictEqual(dbRow.gold, 60);
      logPass('Same migrationKey retry returns 200 idempotent result with zero double-reward');
    }

    // ─── Test I: Different migrationKey after migration → 409 Conflict ─────────
    console.log('\n▶ Test I: Different migrationKey After Migration → 409 Conflict');
    {
      const payload = {
        migrationKey: `different_key_${Date.now()}`,
        snapshot: { xp: 60 },
      };

      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${userAData.token}` },
        },
        payload
      );

      assert.strictEqual(res.status, 409, `Expected 409, got ${res.status}`);
      assert.strictEqual(res.data.success, false);
      logPass('Second migration attempt with different key rejected with 409 Conflict');
    }

    // ─── Test J: Concurrent Same-Key HTTP Requests (Promise.all) ─────────────
    console.log('\n▶ Test J: Concurrent Same-Key HTTP Requests (Promise.all) → Exactly 1 Effect');
    {
      const { user, token } = await createTestUser('_j');
      const sameKey = `mig_key_j_${Date.now()}`;
      const payload = {
        migrationKey: sameKey,
        snapshot: {
          xp: 60,
          gold: 30,
          questUnits: { '1': [{ id: 1, status: 'done' }] },
        },
      };

      const [res1, res2] = await Promise.all([
        makeHttpRequest(
          server,
          {
            path: '/api/v1/progress/migrate-guest',
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          },
          payload
        ),
        makeHttpRequest(
          server,
          {
            path: '/api/v1/progress/migrate-guest',
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          },
          payload
        ),
      ]);

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res1.data.success, true);
      assert.strictEqual(res2.data.success, true);

      // Direct DB verification: XP should be 60, NOT 120
      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(dbRow.total_xp, 60);
      assert.strictEqual(dbRow.gold, 30);
      assert.strictEqual(dbRow.guest_migrated, true);
      logPass('Concurrent identical HTTP requests serialized cleanly into exactly 1 migration effect');
    }

    // ─── Test K: Concurrent Different-Key Requests (Promise.allSettled) ───────
    console.log('\n▶ Test K: Concurrent Different-Key Requests (Promise.allSettled) → 1 200, 1 409');
    {
      const { user, token } = await createTestUser('_k');
      const key1 = `mig_key_k1_${Date.now()}`;
      const key2 = `mig_key_k2_${Date.now()}`;

      const results = await Promise.allSettled([
        makeHttpRequest(
          server,
          {
            path: '/api/v1/progress/migrate-guest',
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          },
          { migrationKey: key1, snapshot: { xp: 60, gold: 30, questUnits: { '1': [{ id: 1, status: 'done' }] } } }
        ),
        makeHttpRequest(
          server,
          {
            path: '/api/v1/progress/migrate-guest',
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          },
          { migrationKey: key2, snapshot: { xp: 60, gold: 30, questUnits: { '1': [{ id: 1, status: 'done' }] } } }
        ),
      ]);

      const res1 = results[0].value;
      const res2 = results[1].value;

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(statuses, [200, 409], `Expected [200, 409], got ${JSON.stringify(statuses)}`);

      // Verify PostgreSQL row: exactly one won
      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(dbRow.total_xp, 60);
      assert.strictEqual(dbRow.gold, 30);
      assert.strictEqual(dbRow.guest_migrated, true);
      logPass('Concurrent competing HTTP requests: exactly one won (200), other received 409 Conflict');
    }

    // ─── Test L: Service/Database Failure → Safe Error (No Leak) ───────────────
    console.log('\n▶ Test L: Service/Database Failure → Safe 500 / Error Without DB Leak');
    {
      // Sign a JWT with a non-existent UUID format that cannot link to PostgreSQL, or invalid format
      const invalidUuidToken = jwt.sign(
        { id: 'not-a-valid-uuid-12345', email: 'fake@engjoy.com', role: 'student' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${invalidUuidToken}` },
        },
        { migrationKey: 'mig_key_err', snapshot: {} }
      );

      // Error middleware should respond with 400 or 500 without leaking stack trace
      assert([400, 500].includes(res.status), `Expected 400 or 500, got ${res.status}`);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(typeof res.data.message, 'string');
      // Verify no stack trace or internal SQL statements leaked to client
      assert.strictEqual(res.rawText.includes('SELECT * FROM'), false);
      assert.strictEqual(res.rawText.includes('at pg-pool'), false);
      logPass('Database/server errors handled gracefully without leaking stack trace or SQL details');
    }

    // ─── Test M: Response Profile Strictly Matches Actual PostgreSQL State ────
    console.log('\n▶ Test M: Response Profile Strictly Matches Actual PostgreSQL State');
    {
      const { user, token } = await createTestUser('_m');
      const key = `mig_key_m_${Date.now()}`;
      const payload = {
        migrationKey: key,
        snapshot: {
          xp: 60,
          gold: 30,
          streak: 3,
          savedWords: ['wisdom'],
          questUnits: { '1': [{ id: 1, status: 'done' }] },
        },
      };

      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        payload
      );

      assert.strictEqual(res.status, 200);
      const profile = res.data.data.profile;
      const dbRow = await getProfileDirect(user.id);

      assert.strictEqual(profile.userId, dbRow.user_id);
      assert.strictEqual(profile.totalXp, dbRow.total_xp);
      assert.strictEqual(profile.currentLevel, dbRow.current_level);
      assert.strictEqual(profile.gold, dbRow.gold);
      assert.strictEqual(profile.streakDays, dbRow.streak_days);
      assert.strictEqual(profile.guestMigrated, dbRow.guest_migrated);
      assert.deepStrictEqual(profile.savedWords, dbRow.saved_words);
      logPass('Returned response fields strictly match live PostgreSQL record');
    }

    // ─── Test N: Unknown Request Fields Cannot Alter Server State ─────────────
    console.log('\n▶ Test N: Unknown Request Fields Cannot Alter Server State');
    {
      const { user, token } = await createTestUser('_n');
      const key = `mig_key_n_${Date.now()}`;
      const payload = {
        migrationKey: key,
        snapshot: {
          xp: 60,
          gold: 30,
          questUnits: { '1': [{ id: 1, status: 'done' }] },
        },
        unknownField1: 'should_be_stripped',
        role: 'admin',
        isSuperUser: true,
      };

      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        payload
      );

      assert.strictEqual(res.status, 200);
      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(dbRow.total_xp, 60);

      // Verify user table role was not modified
      const { rows: uRows } = await pool.query(`SELECT role FROM users WHERE id = $1`, [user.id]);
      assert.strictEqual(uRows[0].role, 'student');
      logPass('Unknown payload fields stripped cleanly and cannot alter user or profile state');
    }

    // ─── Test O: Content-Type & Malformed JSON Express Conventions ────────────
    console.log('\n▶ Test O: Content-Type & Malformed JSON Express Conventions');
    {
      const { token } = await createTestUser('_o');
      // Send malformed JSON raw body
      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        null,
        '{"migrationKey": "broken_json_without_closing' // Malformed JSON
      );

      // Express body-parser should reject malformed JSON with 400
      assert.strictEqual(res.status, 400, `Expected 400 for malformed JSON, got ${res.status}`);
      logPass('Malformed JSON body correctly rejected by Express body-parser with 400');
    }

    // ─── Test P: Multi-Field Identity Spoofing (userId/user_id/accountId) ──────
    console.log('\n▶ Test P: Body userId/user_id/accountId Spoofing → Target Remains req.user.id');
    {
      const innocent = await createTestUser('_p_innocent');
      const attacker = await createTestUser('_p_attacker');

      const payload = {
        userId: innocent.user.id,
        user_id: innocent.user.id,
        accountId: innocent.user.id,
        migrationKey: `key_p_spoof_${Date.now()}`,
        snapshot: {
          xp: 60,
          gold: 30,
          questUnits: { '1': [{ id: 1, status: 'done' }] },
        },
      };

      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${attacker.token}` },
        },
        payload
      );

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.profile.userId, attacker.user.id);

      // Innocent user DB profile must be untouched
      const innocentDb = await getProfileDirect(innocent.user.id);
      assert.strictEqual(innocentDb, null);

      // Attacker DB profile received the migration
      const attackerDb = await getProfileDirect(attacker.user.id);
      assert.strictEqual(attackerDb.total_xp, 60);
      assert.strictEqual(attackerDb.gold, 30);
      logPass('Multiple spoofed identity fields (userId, user_id, accountId) safely ignored');
    }

    // ─── Test Q: All Common Forged Reward Fields Rejected / Zero Impact ─────────
    console.log('\n▶ Test Q: All Common Forged Reward Fields → Strictly Rejected (Zero Impact)');
    {
      const { token } = await createTestUser('_q');

      // Test injection of all common forged fields together
      const forgedFields = {
        earnedXp: 999999,
        goldEarned: 999999,
        missionBonusXp: 50000,
        currentLevel: 99,
        goldAfter: 1000000,
        reward: { xp: 5000 },
        price: 0,
      };

      // In snapshot
      const resSnapshot = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        {
          migrationKey: `key_q1_${Date.now()}`,
          snapshot: {
            xp: 60,
            ...forgedFields,
          },
        }
      );
      assert.strictEqual(resSnapshot.status, 400, 'Expected 400 for forged fields inside snapshot');

      // At root
      const resRoot = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        {
          migrationKey: `key_q2_${Date.now()}`,
          snapshot: { xp: 60 },
          ...forgedFields,
        }
      );
      assert.strictEqual(resRoot.status, 400, 'Expected 400 for forged fields at root level');
      logPass('All common forged reward fields (earnedXp, goldEarned, missionBonusXp, etc.) safely rejected');
    }

    // ─── Test R: Empty Snapshot Semantics ({ snapshot: {} }) ───────────────────
    console.log('\n▶ Test R (Step 7): Empty Snapshot Semantics ({ snapshot: {} })');
    {
      const { user, token } = await createTestUser('_r_empty');
      const key = `key_r_empty_${Date.now()}`;

      const res = await makeHttpRequest(
        server,
        {
          path: '/api/v1/progress/migrate-guest',
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        {
          migrationKey: key,
          snapshot: {},
        }
      );

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.migrated, true);
      assert.strictEqual(res.data.data.profile.totalXp, 0);
      assert.strictEqual(res.data.data.profile.gold, 0);
      assert.strictEqual(res.data.data.profile.currentLevel, 1);
      assert.strictEqual(res.data.data.profile.guestMigrated, true);

      // Verify PostgreSQL directly
      const dbRow = await getProfileDirect(user.id);
      assert.strictEqual(dbRow.guest_migrated, true);
      assert.strictEqual(dbRow.migration_key, key);
      assert.strictEqual(dbRow.total_xp, 0);
      assert.strictEqual(dbRow.gold, 0);
      logPass('Empty snapshot { snapshot: {} } accepted and produces safe baseline profile');
    }

  } catch (err) {
    logFail('Test suite encountered an unhandled exception', err);
  } finally {
    console.log('\n=================================================================');
    console.log(`  PHASE 2C.3 API TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=================================================================\n');
    server.close();
    await pool.end().catch(() => {});
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSuite().catch((err) => {
  console.error('Fatal suite runner error:', err);
  process.exit(1);
});
