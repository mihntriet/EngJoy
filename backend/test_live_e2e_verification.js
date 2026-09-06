/**
 * LIVE E2E VERIFICATION SCRIPT (PHASE 2B.2 CORRECTIVE PASS)
 * 
 * Verifies real HTTP request sequence with real PostgreSQL database:
 * 1. Authenticated registration/login
 * 2. GET /api/v1/progress/profile
 * 3. POST /api/v1/progress/action (COMPLETE_UNIT)
 * 4. Confirm PostgreSQL player_profiles updated directly in DB
 * 5. Re-query GET /api/v1/progress/profile (simulating refresh)
 * 6. Confirm profile remains consistent
 */

const http = require('http');
const app = require('./src/app');
const { pool } = require('./src/config/db.postgres');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const payloadStr = body ? JSON.stringify(body) : null;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(payloadStr ? { 'Content-Length': Buffer.byteLength(payloadStr) } : {}),
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: rawData });
        }
      });
    });

    req.on('error', reject);
    if (payloadStr) {
      req.write(payloadStr);
    }
    req.end();
  });
}

async function runLiveVerification() {
  console.log("=================================================================");
  console.log("       LIVE E2E POSTGRESQL & HTTP VERIFICATION                   ");
  console.log("=================================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const testEmail = `live_verify_${Date.now()}@engjoy.com`;
  const testPassword = 'Password123!';
  let userId = null;
  let token = null;

  try {
    // 1. Authenticated registration
    console.log("▶ Step 1: Register real test user via HTTP POST /api/v1/auth/register");
    const regRes = await makeRequest(server, { path: '/api/v1/auth/register', method: 'POST' }, {
      displayName: 'LiveHero',
      email: testEmail,
      password: testPassword,
    });
    if (regRes.status !== 201) console.log('Registration error details:', JSON.stringify(regRes));
    assert(regRes.status === 201, `Registration HTTP 201 (got ${regRes.status})`);
    assert(regRes.data?.data?.accessToken, 'Received valid JWT accessToken');
    token = regRes.data?.data?.accessToken;
    userId = regRes.data?.data?.user?.id;
    console.log(`  User registered with ID: ${userId}`);

    // 2. Fetch authoritative profile via GET /api/v1/progress/profile
    console.log("\n▶ Step 2: Fetch profile via HTTP GET /api/v1/progress/profile");
    const profileRes1 = await makeRequest(server, {
      path: '/api/v1/progress/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(profileRes1.status === 200, `Profile fetch HTTP 200 (got ${profileRes1.status})`);
    const initialProfile = profileRes1.data?.data;
    assert(parseInt(initialProfile?.totalXp ?? initialProfile?.total_xp, 10) === 0, 'Initial total_xp is 0');
    assert(parseInt(initialProfile?.gold, 10) === 0, 'Initial gold is 0');
    assert(parseInt(initialProfile?.currentLevel ?? initialProfile?.current_level, 10) === 1, 'Initial current_level is 1');

    // 3. Execute authoritative action: COMPLETE_UNIT
    console.log("\n▶ Step 3: Complete Unit 1 via HTTP POST /api/v1/progress/action");
    const actionRes = await makeRequest(server, {
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }, {
      action: 'COMPLETE_UNIT',
      questId: 1,
      unitId: 1,
      idempotencyKey: `live_unit_1_1_${Date.now()}`,
    });
    assert(actionRes.status === 200, `Action execution HTTP 200 (got ${actionRes.status})`);
    const actionResult = actionRes.data?.data;
    assert(parseInt(actionResult?.profile?.totalXp ?? actionResult?.profile?.total_xp, 10) === 60, 'Response profile total_xp is 60');
    assert(parseInt(actionResult?.profile?.gold, 10) === 30, 'Response profile gold is 30');
    assert(actionResult?.reward?.wordsLearned === 15, 'Reward wordsLearned is 15');

    // 4. Directly query PostgreSQL database table player_profiles
    console.log("\n▶ Step 4: Direct PostgreSQL inspection of player_profiles");
    const dbRows = await pool.query(`SELECT * FROM player_profiles WHERE user_id = $1`, [userId]);
    assert(dbRows.rows.length === 1, 'Exactly one row exists in PostgreSQL player_profiles');
    const dbProfile = dbRows.rows[0];
    assert(parseInt(dbProfile.total_xp, 10) === 60, `DB total_xp is 60 (got ${dbProfile.total_xp})`);
    assert(parseInt(dbProfile.gold, 10) === 30, `DB gold is 30 (got ${dbProfile.gold})`);
    assert(parseInt(dbProfile.words_learned, 10) === 15, `DB words_learned is 15 (got ${dbProfile.words_learned})`);
    const questUnits = dbProfile.quest_units || {};
    assert(questUnits['1'] && questUnits['1'][0].status === 'done', 'Unit 1 status in DB is "done"');

    // 5. Re-query profile via HTTP GET (simulating browser reload / tab refresh)
    console.log("\n▶ Step 5: Refresh simulation via HTTP GET /api/v1/progress/profile");
    const profileRes2 = await makeRequest(server, {
      path: '/api/v1/progress/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(profileRes2.status === 200, 'Profile reload HTTP 200');
    const reloadedProfile = profileRes2.data?.data;
    assert(parseInt(reloadedProfile?.totalXp ?? reloadedProfile?.total_xp, 10) === 60, 'Reloaded total_xp remains 60');
    assert(parseInt(reloadedProfile?.gold, 10) === 30, 'Reloaded gold remains 30');
    assert(parseInt(reloadedProfile?.wordsLearned ?? reloadedProfile?.words_learned, 10) === 15, 'Reloaded words_learned remains 15');

    // 6. Test Chat Cooldown on live server (3 seconds)
    console.log("\n▶ Step 6: Verify actual backend chat cooldown (3000ms)");
    const chat1 = await makeRequest(server, {
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }, {
      action: 'CHAT_MESSAGE',
      message: 'Hello Joy live test',
      idempotencyKey: `chat_live_1_${Date.now()}`,
    });
    assert(chat1.status === 200, 'First chat message HTTP 200');

    // Immediate second chat message
    const chat2 = await makeRequest(server, {
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }, {
      action: 'CHAT_MESSAGE',
      message: 'Immediate second chat message',
      idempotencyKey: `chat_live_2_${Date.now()}`,
    });
    assert(chat2.status === 429, `Immediate chat rejected with HTTP 429 (got ${chat2.status})`);
    assert(chat2.data?.error?.includes('giây'), 'Error message contains cooldown seconds notice');

  } finally {
    // Cleanup test user
    if (userId) {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
      console.log(`\n  Cleaned up test user ${userId}`);
    }
    server.close();
    await pool.end();
  }

  console.log("\n=================================================================");
  console.log(`LIVE E2E RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) process.exit(1);
}

runLiveVerification().catch((e) => {
  console.error("Fatal error in live verification:", e);
  process.exit(1);
});
