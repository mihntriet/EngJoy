/**
 * Phase 4B.2 – Live Equipment Persistence & Anti-Bypass Verification
 * Executes direct HTTP requests against localhost:5000 with real JWT tokens
 * and verifies PostgreSQL equipped_ids before and after each step.
 */

const http = require('http');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT, 10) || 5432,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function registerUser(email, name) {
  const res = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email, password: 'Password123!', displayName: name }
  );
  return { token: res.data?.data?.accessToken, user: res.data?.data?.user };
}

async function runLiveEquipmentTests() {
  console.log('=================================================================');
  console.log('🛡️ Phase 4B.2 Live Equipment Persistence & Security Verification');
  console.log('=================================================================\n');

  const testUser = await registerUser(`equip_tester_${Date.now()}@engjoy.com`, 'Equip Tester');
  const userId = testUser.user.id;
  console.log(`Registered test user: ${userId}`);

  // Give user gold to buy items
  await pool.query('UPDATE player_profiles SET gold = 5000 WHERE user_id = $1', [userId]);

  // 1. Check initial DB equipped_ids
  const { rows: initialRows } = await pool.query('SELECT equipped_ids, owned_item_ids FROM player_profiles WHERE user_id = $1', [userId]);
  console.log('Initial DB equipped_ids:', initialRows[0].equipped_ids);
  if (initialRows[0].equipped_ids.length !== 0) throw new Error('Initial equipped_ids should be empty');

  // 2. Buy item 1 ("Khiên Chuỗi", price 400)
  console.log('\n1. Buying item 1 via BUY_ITEM...');
  const buyRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUser.token}`,
      },
    },
    {
      action: 'BUY_ITEM',
      itemId: '1',
      idempotencyKey: `buy_1_${Date.now()}`,
    }
  );
  console.log('   Buy status:', buyRes.status);
  console.log('   Owned items:', buyRes.data?.data?.profile?.ownedItemIds);

  // 3. Attack check: Try to equip an unowned item (e.g. item 2)
  console.log('\n2. Attack Check: Attempting to equip unowned item 2...');
  const unownedEquip = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUser.token}`,
      },
    },
    {
      action: 'EQUIP_ITEM',
      itemId: '2',
    }
  );
  console.log('   Unowned equip status:', unownedEquip.status);
  console.log('   Unowned equip response:', unownedEquip.data?.error || unownedEquip.data?.message);
  if (unownedEquip.status === 400) {
    console.log('   ✓ PASS: Unowned item equip rejected with HTTP 400');
  } else {
    throw new Error('Unowned item equip was NOT rejected!');
  }

  // 4. Attack check: Client passes forged equippedIds array
  console.log('\n3. Attack Check: Passing client-forged equippedIds array with item 1...');
  const equip1Key = `equip_1_${Date.now()}`;
  const forgedEquip = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUser.token}`,
      },
    },
    {
      action: 'EQUIP_ITEM',
      itemId: '1',
      equippedIds: ['1', '2', '3', '4'], // Forged
      idempotencyKey: equip1Key,
    }
  );
  console.log('   Forged equip status:', forgedEquip.status);
  console.log('   Server computed equippedIds:', forgedEquip.data?.data?.profile?.equippedIds);
  if (forgedEquip.data?.data?.profile?.equippedIds?.length === 1 && forgedEquip.data?.data?.profile?.equippedIds[0] === '1') {
    console.log('   ✓ PASS: Client-supplied equippedIds completely ignored, server set ["1"]');
  } else {
    throw new Error('Server trusted client-supplied equippedIds!');
  }

  // 5. Inspect PostgreSQL: equipped_ids contains ['1']
  const { rows: dbRowsAfterEquip } = await pool.query('SELECT equipped_ids FROM player_profiles WHERE user_id = $1', [userId]);
  console.log('\n4. Inspecting PostgreSQL after equip:');
  console.log('   PostgreSQL equipped_ids:', dbRowsAfterEquip[0].equipped_ids);
  if (dbRowsAfterEquip[0].equipped_ids?.includes('1')) {
    console.log('   ✓ PASS: PostgreSQL equipped_ids table row updated to ["1"]');
  } else {
    throw new Error('PostgreSQL equipped_ids not updated in DB!');
  }

  // 6. Test Idempotency: replay with SAME idempotencyKey
  console.log('\n5. Testing Idempotency (replay with identical key)...');
  const replayRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUser.token}`,
      },
    },
    {
      action: 'EQUIP_ITEM',
      itemId: '1',
      idempotencyKey: equip1Key, // Exact reuse
    }
  );
  console.log('   Replay status:', replayRes.status);
  console.log('   Replay equipped state:', replayRes.data?.data?.reward?.equipped);

  // 7. Unequip item 1 with NEW operation key
  console.log('\n6. Unequipping item 1 with NEW key...');
  const unequipRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUser.token}`,
      },
    },
    {
      action: 'EQUIP_ITEM',
      itemId: '1',
      idempotencyKey: `unequip_1_${Date.now()}`,
    }
  );
  console.log('   Unequip status:', unequipRes.status);
  console.log('   Server profile equippedIds:', unequipRes.data?.data?.profile?.equippedIds);
  if (unequipRes.data?.data?.reward?.equipped === false && unequipRes.data?.data?.profile?.equippedIds?.length === 0) {
    console.log('   ✓ PASS: Unequip succeeded and returned empty equippedIds');
  } else {
    throw new Error('Unequip failed!');
  }

  // 8. Inspect PostgreSQL after unequip
  const { rows: dbRowsAfterUnequip } = await pool.query('SELECT equipped_ids FROM player_profiles WHERE user_id = $1', [userId]);
  console.log('   PostgreSQL equipped_ids after unequip:', dbRowsAfterUnequip[0].equipped_ids);
  if (dbRowsAfterUnequip[0].equipped_ids?.length === 0) {
    console.log('   ✓ PASS: PostgreSQL equipped_ids table row cleared to []');
  } else {
    throw new Error('PostgreSQL equipped_ids was not cleared!');
  }

  // 9. Buy items 2 and 4 to test max-2 rule
  console.log('\n7. Buying items 2 and 4...');
  await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${testUser.token}` },
    },
    { action: 'BUY_ITEM', itemId: '2' }
  );
  await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${testUser.token}` },
    },
    { action: 'BUY_ITEM', itemId: '4' }
  );

  // Equip 1 and 2
  console.log('   Equipping item 1...');
  await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${testUser.token}` },
    },
    { action: 'EQUIP_ITEM', itemId: '1' }
  );
  console.log('   Equipping item 2...');
  const eq2Res = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${testUser.token}` },
    },
    { action: 'EQUIP_ITEM', itemId: '2' }
  );
  console.log('   Equipped 2 items:', eq2Res.data?.data?.profile?.equippedIds);

  // Attempt to equip 3rd item (item 4)
  console.log('\n8. Attempting to equip 3rd item (item 4) when 2 already equipped...');
  const eq3Res = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${testUser.token}` },
    },
    { action: 'EQUIP_ITEM', itemId: '4' }
  );
  console.log('   3rd equip status:', eq3Res.status);
  console.log('   3rd equip error:', eq3Res.data?.error || eq3Res.data?.message);
  if (eq3Res.status === 400 && (eq3Res.data?.error || eq3Res.data?.message)?.includes('Cannot equip more than 2 items')) {
    console.log('   ✓ PASS: Max 2 equipped items strictly enforced with HTTP 400');
  } else {
    throw new Error('3rd equip was NOT rejected with max-2 error!');
  }

  // Inspect PostgreSQL state
  const { rows: dbRowsFinal } = await pool.query('SELECT equipped_ids FROM player_profiles WHERE user_id = $1', [userId]);
  console.log('   Final PostgreSQL equipped_ids:', dbRowsFinal[0].equipped_ids);
  if (dbRowsFinal[0].equipped_ids?.length === 2) {
    console.log('   ✓ PASS: PostgreSQL equipped_ids table row preserves exactly 2 items');
  } else {
    throw new Error('PostgreSQL corrupted!');
  }

  console.log('\n=================================================================');
  console.log('🎉 ALL LIVE EQUIPMENT PERSISTENCE & SECURITY TESTS PASSED');
  console.log('=================================================================\n');

  await pool.end();
}

runLiveEquipmentTests().catch(async (err) => {
  console.error('\n❌ Live Equipment Test Failed:', err);
  await pool.end();
  process.exit(1);
});
