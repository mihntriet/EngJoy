/**
 * Phase 4A.4 – Live HTTP Bypass & Attack Verification
 * Executes direct HTTP requests against localhost:5000 with real JWT tokens.
 */

const http = require('http');

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
  return { token: res.data?.data?.accessToken || res.data?.data?.tokens?.accessToken, user: res.data?.data?.user };
}

async function runLiveAttacks() {
  console.log('=================================================================');
  console.log('🛡️ Phase 4A.4 Live HTTP Attack & Bypass Verification (Port 5000)');
  console.log('=================================================================\n');

  const userA = await registerUser(`attacker_a_${Date.now()}@engjoy.com`, 'Attacker A');
  const userB = await registerUser(`victim_b_${Date.now()}@engjoy.com`, 'Victim B');

  console.log('1. Attack: Direct COMPLETE_UNIT with score=100 and no attempt');
  const attack1 = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
    },
    {
      action: 'COMPLETE_UNIT',
      questId: 1,
      unitId: 1,
      score: 100,
    }
  );
  console.log('   Response status:', attack1.status);
  console.log('   Response body:', attack1.data);
  const msg1 = attack1.data?.message || attack1.data?.error || '';
  if (attack1.status === 400 && msg1.includes('attemptId is required')) {
    console.log('   ✓ PASS: Direct COMPLETE_UNIT blocked with HTTP 400');
  } else {
    throw new Error('Attack 1 FAILED to block direct completion!');
  }

  console.log('\n2. Attack: COMPLETE_UNIT with fake attemptId and score=100');
  const attack2 = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/action',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
    },
    {
      action: 'COMPLETE_UNIT',
      questId: 1,
      unitId: 1,
      score: 100,
      attemptId: '11111111-2222-3333-4444-555555555555',
    }
  );
  console.log('   Response status:', attack2.status);
  console.log('   Response body:', attack2.data);
  const msg2 = attack2.data?.message || attack2.data?.error || '';
  if (attack2.status === 400 && msg2.includes('Invalid attemptId')) {
    console.log('   ✓ PASS: Fake attemptId blocked with HTTP 400');
  } else {
    throw new Error('Attack 2 FAILED to block fake attemptId!');
  }

  console.log('\n3. Attack: SUBMIT_LESSON with forged score=100 on wrong answers');
  // Start legitimate attempt first
  const startRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/lesson/start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
    },
    { questId: 1, unitId: 1 }
  );
  const attemptId = startRes.data?.data?.attemptId;
  console.log('   Created legitimate attemptId:', attemptId);

  // Submit wrong answers with forged score=100
  const submitWrong = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/lesson/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
    },
    {
      attemptId,
      answers: [
        { questionId: 'u1_q1', selected: 0 }, // wrong (correct 1)
        { questionId: 'u1_q2', selected: 0 }, // wrong (correct 1)
        { questionId: 'u1_q3', selected: 0 }, // wrong (correct 3)
        { questionId: 'u1_q4', selected: 1 }, // wrong (correct 0)
      ],
      score: 100, // Forged
      earnedXp: 9999, // Forged
    }
  );
  console.log('   Response status:', submitWrong.status);
  console.log('   Response body:', submitWrong.data);
  if (submitWrong.data?.data?.passed === false && submitWrong.data?.data?.score === 0) {
    console.log('   ✓ PASS: Server calculated 0% score from answers; forged score=100 completely ignored');
  } else {
    throw new Error('Attack 3 FAILED: Server trusted client score!');
  }

  console.log('\n4. Attack: User B attempts to submit User A attempt');
  const attackCross = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/lesson/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.token}`,
      },
    },
    {
      attemptId,
      answers: [
        { questionId: 'u1_q1', selected: 1 },
        { questionId: 'u1_q2', selected: 1 },
        { questionId: 'u1_q3', selected: 3 },
        { questionId: 'u1_q4', selected: 0 },
      ],
    }
  );
  console.log('   Response status:', attackCross.status);
  console.log('   Response body:', attackCross.data);
  if (attackCross.status === 403) {
    console.log('   ✓ PASS: Cross-user attempt rejected with HTTP 403');
  } else {
    throw new Error('Attack 4 FAILED: Cross-user attempt was not rejected!');
  }

  console.log('\n5. Legitimate Pass Flow: User A retries with new attempt and correct answers');
  const startResPass = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/lesson/start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
    },
    { questId: 1, unitId: 1 }
  );
  const passAttemptId = startResPass.data?.data?.attemptId;

  const submitPass = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/lesson/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
    },
    {
      attemptId: passAttemptId,
      answers: [
        { questionId: 'u1_q1', selected: 1 },
        { questionId: 'u1_q2', selected: 1 },
        { questionId: 'u1_q3', selected: 3 },
        { questionId: 'u1_q4', selected: 0 },
      ],
    }
  );
  console.log('   Submit pass status:', submitPass.status);
  console.log('   Submit pass passed:', submitPass.data?.data?.passed);
  console.log('   Submit pass reward:', submitPass.data?.data?.reward);
  if (submitPass.data?.data?.passed === true && submitPass.data?.data?.reward?.xp === 60) {
    console.log('   ✓ PASS: Legitimate attempt passed and rewarded 60 XP');
  } else {
    throw new Error('Legitimate pass flow failed!');
  }

  console.log('\n6. Attack: Duplicate submission of consumed attempt');
  const duplicateSubmit = await makeRequest(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/progress/lesson/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
    },
    {
      attemptId: passAttemptId,
      answers: [
        { questionId: 'u1_q1', selected: 1 },
        { questionId: 'u1_q2', selected: 1 },
        { questionId: 'u1_q3', selected: 3 },
        { questionId: 'u1_q4', selected: 0 },
      ],
    }
  );
  console.log('   Duplicate submit status:', duplicateSubmit.status);
  console.log('   Duplicate submit body:', duplicateSubmit.data);
  if (duplicateSubmit.status === 409 || duplicateSubmit.status === 400) {
    console.log('   ✓ PASS: Duplicate submission blocked with HTTP 409/400');
  } else {
    throw new Error('Attack 6 FAILED: Duplicate submission allowed!');
  }

  console.log('\n=================================================================');
  console.log('🎉 ALL LIVE HTTP ATTACK AND BYPASS TESTS PASSED');
  console.log('=================================================================\n');
}

runLiveAttacks().catch((err) => {
  console.error('\n❌ Live attack test failed:', err);
  process.exit(1);
});
