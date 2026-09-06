/**
 * PHASE 2B.2 — AUTHENTICATED FRONTEND INTEGRATION TEST SUITE
 * 
 * Tests real production code from:
 * - frontend/src/context/progressStore.js
 * - frontend/src/context/authStore.js
 * - frontend/src/api/userProgress.api.js
 * - frontend/src/api/axiosClient.js
 * 
 * Verifies all 10 specifications (A - J) required by Phase 2B.2.
 */

// 1. Polyfill environment for headless execution of frontend modules
const storage = {};
const mockLocalStorage = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const k in storage) delete storage[k]; },
};
global.document = {
  head: { appendChild: () => {} },
  createElement: () => ({ setAttribute: () => {}, innerHTML: '', style: {}, firstChild: { data: '' } }),
  querySelector: () => null,
};
global.window = {
  location: { href: '' },
  localStorage: mockLocalStorage,
  document: global.document,
};
global.localStorage = mockLocalStorage;

// 2. Real Production Imports
const { useProgressStore, INITIAL_MISSIONS, INITIAL_QUESTS, INITIAL_QUEST_UNITS } = await import('./src/context/progressStore.js');
const { useAuthStore } = await import('./src/context/authStore.js');
const { progressApi } = await import('./src/api/userProgress.api.js');
const axiosClient = (await import('./src/api/axiosClient.js')).default;

console.log("=================================================================");
console.log("       PHASE 2B.2 — AUTHENTICATED FRONTEND INTEGRATION SUITE     ");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function resetAll(customState = {}) {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  useProgressStore.getState().resetProgress({ forceClearGuestSnapshot: true });
  useProgressStore.setState({
    xp: 0,
    level: 1,
    streak: 0,
    gold: 0,
    wordsLearned: 0,
    hasUnsyncedGuestProgress: false,
    pendingGuestMigration: null,
    missions: JSON.parse(JSON.stringify(INITIAL_MISSIONS)),
    quests: JSON.parse(JSON.stringify(INITIAL_QUESTS)),
    questUnits: JSON.parse(JSON.stringify(INITIAL_QUEST_UNITS)),
    savedWords: [],
    ownedItemIds: [],
    equippedIds: [],
    ...customState,
  });
}

async function runPhase2B2Tests() {
  // ─── SUITE A: PROFILE HYDRATION ─────────────────────────────────────────────
  console.log("--- SUITE A: PROFILE HYDRATION ---");
  {
    resetAll(); // Clean initial client state
    useAuthStore.getState().setAuth({ id: 'user-77', displayName: 'Warrior' }, 'token-77', 'refresh-77');

    const mockProfile = {
      user_id: 'user-77',
      total_xp: 750,
      current_level: 3,
      gold: 520,
      streak_days: 7,
      words_learned: 42,
      saved_words: ['resilient', 'ephemeral', 'catalyst'],
      missions: [
        { id: 1, type: 'words', title: 'Học 20 từ mới', done: 12, total: 20, xp: 100, done_flag: false },
        { id: 2, type: 'quiz', title: 'Hoàn thành 1 quiz', done: 1, total: 1, xp: 75, done_flag: true },
        { id: 3, type: 'chat', title: 'Luyện chatbot 5 câu', done: 3, total: 5, xp: 50, done_flag: false },
      ],
      quest_units: {
        '1': [
          { id: 1, status: 'done' },
          { id: 2, status: 'done' },
          { id: 3, status: 'active' },
        ],
      },
      owned_item_ids: ['1', '3'],
      equipped_ids: ['1'],
      last_reset_date: '2026-09-06',
    };

    const originalGet = axiosClient.get;
    let fetchedUrl = null;
    axiosClient.get = async (url) => {
      fetchedUrl = url;
      return { profile: mockProfile };
    };

    try {
      await useProgressStore.getState().fetchUserProgress();
      const s = useProgressStore.getState();

      assert(fetchedUrl === '/progress/profile', 'Profile fetched from GET /progress/profile');
      assert(s.xp === 750, `XP applied authoritatively: 750 (was ${s.xp})`);
      assert(s.level === 3, `Level applied: 3`);
      assert(s.gold === 520, `Gold applied: 520`);
      assert(s.streak === 7, `Streak applied: 7`);
      assert(s.wordsLearned === 42, `wordsLearned applied: 42`);
      assert(s.savedWords.length === 3 && s.savedWords.includes('resilient'), 'savedWords array applied');
      assert(s.missions[1].done_flag === true && s.missions[0].done === 12, 'missions array applied');
      assert(s.questUnits[1][0].status === 'done' && s.questUnits[1][1].status === 'done', 'questUnits merged');
      assert(s.ownedItemIds.some(id => String(id) === '1') && s.ownedItemIds.some(id => String(id) === '3'), 'ownedItemIds applied');
      assert(s.equippedIds.some(id => String(id) === '1'), 'equippedIds applied');
      assert(s.hasUnsyncedGuestProgress === false, 'hasUnsyncedGuestProgress remains false when user had no guest progress');
    } finally {
      axiosClient.get = originalGet;
    }
  }

  // ─── SUITE B: COMPLETE_UNIT ─────────────────────────────────────────────────
  console.log("\n--- SUITE B: COMPLETE_UNIT ---");
  {
    resetAll({ xp: 100, gold: 50, wordsLearned: 5 });
    useAuthStore.getState().setAuth({ id: 'user-77' }, 'token-77', 'refresh-77');

    let postUrl = null;
    let postBody = null;
    const originalPost = axiosClient.post;

    axiosClient.post = async (url, body) => {
      postUrl = url;
      postBody = body;
      return {
        profile: {
          total_xp: 160,
          current_level: 1,
          gold: 80,
          words_learned: 20,
          quest_units: {
            '1': [{ id: 1, status: 'done' }, { id: 2, status: 'active' }],
          },
        },
        reward: {
          xp: 60,
          gold: 30,
          wordsLearned: 15,
        },
      };
    };

    try {
      const res = await useProgressStore.getState().completeUnitLesson(1, 1, 'unit_1_1_test_key');
      assert(res.success === true, 'Unit completion succeeds');
      assert(postUrl === '/progress/action', 'Authenticated request calls POST /progress/action');
      assert(postBody.action === 'COMPLETE_UNIT', 'Action is COMPLETE_UNIT');
      assert(postBody.questId === 1 && postBody.unitId === 1, 'Correct questId and unitId in payload');
      assert(postBody.idempotencyKey === 'unit_1_1_test_key', 'idempotencyKey correctly passed in payload');
      assert(postBody.earnedXp === undefined, 'No client earnedXp in payload');
      assert(postBody.goldEarned === undefined, 'No client goldEarned in payload');

      const s = useProgressStore.getState();
      assert(s.xp === 160, 'XP updated strictly from server profile: 160');
      assert(s.gold === 80, 'Gold updated strictly from server profile: 80');
      assert(s.wordsLearned === 20, 'wordsLearned updated strictly from server profile: 20');
      assert(s.questUnits[1][0].status === 'done', 'Unit 1 status is done');

      // Duplicate attempt should be rejected before or by duplicate check without local reward
      const prevXp = s.xp;
      const dupRes = await useProgressStore.getState().completeUnitLesson(1, 1);
      assert(dupRes.alreadyDone === true, 'Duplicate completion returns alreadyDone');
      assert(useProgressStore.getState().xp === prevXp, 'No duplicate local reward');
    } finally {
      axiosClient.post = originalPost;
    }
  }

  // ─── SUITE C: COMPLETE_QUIZ ─────────────────────────────────────────────────
  console.log("\n--- SUITE C: COMPLETE_QUIZ ---");
  {
    resetAll({ xp: 160, gold: 80 });
    useAuthStore.getState().setAuth({ id: 'user-77' }, 'token-77', 'refresh-77');

    let postBody = null;
    const stableKey = 'quiz_stable_key_123';
    const originalPost = axiosClient.post;

    axiosClient.post = async (url, body) => {
      postBody = body;
      return {
        profile: {
          total_xp: 310,
          current_level: 2,
          gold: 155,
        },
        reward: {
          xp: 150,
          gold: 75,
        },
      };
    };

    try {
      const res = await useProgressStore.getState().completeQuiz(100, stableKey);
      assert(res.success === true, 'Quiz completion succeeds');
      assert(postBody.action === 'COMPLETE_QUIZ', 'Action is COMPLETE_QUIZ');
      assert(postBody.score === 100, 'Score is sent: 100');
      assert(postBody.earnedXp === undefined, 'earnedXp is NOT sent in payload');
      assert(postBody.idempotencyKey === stableKey, 'stable idempotencyKey is sent');

      const s = useProgressStore.getState();
      assert(s.xp === 310, 'Server XP applied: 310');
      assert(s.gold === 155, 'Server Gold applied: 155');
      assert(s.level === 2, 'Server Level applied: 2');
    } finally {
      axiosClient.post = originalPost;
    }
  }

  // ─── SUITE D: SAVE_WORD ─────────────────────────────────────────────────────
  console.log("\n--- SUITE D: SAVE_WORD ---");
  {
    resetAll({ xp: 310, gold: 155, wordsLearned: 20 });
    useAuthStore.getState().setAuth({ id: 'user-77' }, 'token-77', 'refresh-77');

    let postBody = null;
    const originalPost = axiosClient.post;

    axiosClient.post = async (url, body) => {
      postBody = body;
      return {
        profile: {
          total_xp: 325,
          current_level: 2,
          gold: 162,
          words_learned: 21,
          saved_words: ['epiphany'],
        },
        reward: {
          xp: 15,
          gold: 7,
          wordsLearned: 1,
        },
      };
    };

    try {
      const res = await useProgressStore.getState().saveWord('Epiphany', 'custom_word_key');
      assert(res.success === true, 'saveWord succeeds');
      assert(postBody.action === 'SAVE_WORD', 'Action is SAVE_WORD');
      assert(postBody.word === 'epiphany', 'Word normalized and sent in payload');
      assert(postBody.idempotencyKey === 'custom_word_key', 'idempotencyKey correctly sent');
      assert(postBody.xp === undefined && postBody.gold === undefined, 'No client rewards in payload');

      const s = useProgressStore.getState();
      assert(s.xp === 325, 'XP updated strictly from server profile: 325');
      assert(s.gold === 162, 'Gold updated strictly from server profile: 162');
      assert(s.wordsLearned === 21, 'wordsLearned updated strictly from server profile: 21');
      assert(s.savedWords.includes('epiphany'), 'Word exists in savedWords');

      // Duplicate save
      const dupRes = await useProgressStore.getState().saveWord('epiphany');
      assert(dupRes.alreadySaved === true, 'Duplicate saveWord immediately rejected');
    } finally {
      axiosClient.post = originalPost;
    }
  }

  // ─── SUITE E: CHAT (JOYBUBBLE) ──────────────────────────────────────────────
  console.log("\n--- SUITE E: CHAT (JOYBUBBLE) ---");
  {
    resetAll({ xp: 325 });
    useAuthStore.getState().setAuth({ id: 'user-77' }, 'token-77', 'refresh-77');

    let postBody = null;
    let simulate429 = false;
    const originalPost = axiosClient.post;

    axiosClient.post = async (url, body) => {
      postBody = body;
      if (simulate429) {
        const err = new Error('Rate limit exceeded');
        err.statusCode = 429;
        throw err;
      }
      return {
        profile: {
          total_xp: 375, // +50 from completed chat mission
          missions: [
            { id: 1, type: 'words', title: 'Học 20 từ mới', done: 0, total: 20, xp: 100, done_flag: false },
            { id: 2, type: 'quiz', title: 'Hoàn thành 1 quiz', done: 0, total: 1, xp: 75, done_flag: false },
            { id: 3, type: 'chat', title: 'Luyện chatbot 5 câu', done: 5, total: 5, xp: 50, done_flag: true },
          ],
        },
        reward: {
          missionBonus: { completed: ['Luyện chatbot 5 câu'], xp: 50 },
        },
      };
    };

    try {
      // 1. Valid Chat Message
      const res = await useProgressStore.getState().sendChatMessage('Can you explain present perfect?');
      assert(res.success === true, 'sendChatMessage succeeds');
      assert(postBody.action === 'CHAT_MESSAGE', 'Action is CHAT_MESSAGE');
      assert(postBody.message === 'Can you explain present perfect?', 'Message text in payload');
      assert(postBody.idempotencyKey !== undefined, 'idempotencyKey generated');
      assert(useProgressStore.getState().missions[2].done_flag === true, 'Chat mission completed from server profile');
      assert(useProgressStore.getState().xp === 375, 'XP updated from server profile: 375');

      // 2. Cooldown 429 scenario
      simulate429 = true;
      const res429 = await useProgressStore.getState().sendChatMessage('Another immediate message');
      assert(res429.success === false && res429.cooldown === true, '429 returns cooldown flag without throwing');
      assert(useProgressStore.getState().xp === 375, 'Progression NOT altered on 429');
    } finally {
      axiosClient.post = originalPost;
    }
  }

  // ─── SUITE F: BUY_ITEM ──────────────────────────────────────────────────────
  console.log("\n--- SUITE F: BUY_ITEM ---");
  {
    resetAll({ gold: 1000, ownedItemIds: [] });
    useAuthStore.getState().setAuth({ id: 'user-77' }, 'token-77', 'refresh-77');

    let postBody = null;
    let simulateFailure = false;
    const originalPost = axiosClient.post;

    axiosClient.post = async (url, body) => {
      postBody = body;
      if (simulateFailure) {
        throw new Error('Not enough gold');
      }
      return {
        profile: {
          gold: 600, // 1000 - 400
          owned_item_ids: ['1'],
        },
      };
    };

    try {
      // 1. Successful purchase
      const res = await useProgressStore.getState().buyItem({ id: '1', name: 'Khiên Chuỗi', price: 999999 }, 'buy_1_key');
      assert(res === true, 'buyItem succeeds');
      assert(postBody.action === 'BUY_ITEM', 'Action is BUY_ITEM');
      assert(postBody.itemId === '1', 'itemId is sent: 1');
      assert(postBody.price === undefined, 'Client price is NEVER sent');
      assert(postBody.goldAfter === undefined, 'goldAfter is NEVER sent');
      assert(postBody.idempotencyKey === 'buy_1_key', 'idempotencyKey is passed');

      const s = useProgressStore.getState();
      assert(s.gold === 600, 'Gold deducted authoritatively to 600 (ignoring client 999999 price)');
      assert(s.ownedItemIds.some(id => String(id) === '1'), 'Item 1 marked as owned');

      // 2. Failed purchase (e.g. Insufficient gold)
      simulateFailure = true;
      const failRes = await useProgressStore.getState().buyItem({ id: '2', name: 'Kính Lúp', price: 250 });
      assert(failRes === false, 'Failed purchase returns false');
      assert(useProgressStore.getState().gold === 600, 'Gold NOT deducted on failure');
      assert(!useProgressStore.getState().ownedItemIds.some(id => String(id) === '2'), 'Item NOT added to inventory on failure');
    } finally {
      axiosClient.post = originalPost;
    }
  }

  // ─── SUITE G: GUEST ISOLATION ───────────────────────────────────────────────
  console.log("\n--- SUITE G: GUEST ISOLATION ---");
  {
    resetAll({ xp: 0, gold: 0, wordsLearned: 0 });
    // User is NOT authenticated
    let apiCalled = false;
    const originalPost = axiosClient.post;
    const originalGet = axiosClient.get;
    axiosClient.post = async () => { apiCalled = true; throw new Error('API should not be called'); };
    axiosClient.get = async () => { apiCalled = true; throw new Error('API should not be called'); };

    try {
      // Guest word save
      const wRes = await useProgressStore.getState().saveWord('apple', 15);
      assert(wRes.success === true, 'Guest saveWord succeeds locally');
      assert(apiCalled === false, 'No API called for Guest saveWord');

      // Guest unit completion
      const uRes = await useProgressStore.getState().completeUnitLesson(1, 1);
      assert(uRes.success === true, 'Guest completeUnitLesson succeeds locally');
      assert(apiCalled === false, 'No API called for Guest completeUnitLesson');

      const s = useProgressStore.getState();
      assert(s.xp === 75, `Guest XP updated locally: 75 (15 + 60)`);
      assert(s.gold === 37, `Guest Gold updated locally: 37 (7 + 30)`);
      assert(s.wordsLearned === 16, `Guest wordsLearned updated locally: 16 (1 + 15)`);
      assert(s.hasUnsyncedGuestProgress === true, 'Guest flag hasUnsyncedGuestProgress is true');
    } finally {
      axiosClient.post = originalPost;
      axiosClient.get = originalGet;
    }
  }

  // ─── SUITE H: LOGIN / LOGOUT & FULL GUEST SNAPSHOT SURVIVAL ────────────────
  console.log("\n--- SUITE H: LOGIN / LOGOUT & FULL GUEST SNAPSHOT SURVIVAL ---");
  {
    // Step 1: Realistic rich Guest progression state
    const guestMissions = [
      { id: 1, type: 'words', title: 'Học 20 từ mới', done: 12, total: 20, xp: 100, done_flag: false },
      { id: 2, type: 'quiz', title: 'Hoàn thành 1 quiz', done: 1, total: 1, xp: 75, done_flag: true },
      { id: 3, type: 'chat', title: 'Luyện chatbot 5 câu', done: 2, total: 5, xp: 50, done_flag: false },
    ];
    const guestUnits = {
      '1': [{ id: 1, status: 'done' }, { id: 2, status: 'done' }, { id: 3, status: 'active' }],
    };

    resetAll({
      xp: 500,
      gold: 250,
      streak: 3,
      wordsLearned: 31,
      savedWords: ['apple', 'brave'],
      missions: guestMissions,
      questUnits: guestUnits,
      ownedItemIds: ['1', '4'],
      equippedIds: ['1'],
      lastResetDate: '2026-09-06',
      hasUnsyncedGuestProgress: true,
    });

    // Step 2: User logs in
    useAuthStore.getState().setAuth({ id: 'user-real', displayName: 'Hero' }, 'jwt-token', 'refresh-token');

    const serverProfile = {
      user_id: 'user-real',
      total_xp: 990,
      current_level: 4,
      gold: 450,
      streak_days: 10,
      words_learned: 80,
      saved_words: ['galaxy'],
      missions: [
        { id: 1, type: 'words', title: 'Học 20 từ mới', done: 0, total: 20, xp: 100, done_flag: false },
      ],
      quest_units: { '1': [{ id: 1, status: 'done' }] },
      owned_item_ids: ['2'],
      equipped_ids: ['2'],
    };

    const originalGet = axiosClient.get;
    let getProfileCallCount = 0;
    axiosClient.get = async () => {
      getProfileCallCount++;
      return { profile: serverProfile };
    };

    try {
      // Step 3: Hydrate on login
      await useProgressStore.getState().fetchUserProgress();
      const s1 = useProgressStore.getState();

      // Active state MUST come strictly from server profile:
      assert(s1.xp === 990, 'Active state: Server XP (990) replaces guest XP (500)');
      assert(s1.gold === 450, 'Active state: Server Gold (450) replaces guest Gold (250)');
      assert(s1.wordsLearned === 80, 'Active state: Server wordsLearned (80) replaces guest words (31)');
      assert(s1.streak === 10, 'Active state: Server streak (10) applied');
      assert(s1.savedWords.length === 1 && s1.savedWords[0] === 'galaxy', 'Active state: Server savedWords applied');

      // CRITICAL CHECK: Guest migration state is PRESERVED in full fidelity
      assert(s1.hasUnsyncedGuestProgress === true, 'hasUnsyncedGuestProgress flag is preserved (NOT cleared)');
      assert(s1.pendingGuestMigration !== null, 'pendingGuestMigration snapshot created');

      const snap = s1.pendingGuestMigration;
      assert(snap.xp === 500, 'Snapshot: Original Guest XP preserved (500)');
      assert(snap.gold === 250, 'Snapshot: Original Guest Gold preserved (250)');
      assert(snap.streak === 3, 'Snapshot: Original Guest streak preserved (3)');
      assert(snap.wordsLearned === 31, 'Snapshot: Original Guest wordsLearned preserved (31)');
      assert(snap.savedWords.includes('apple') && snap.savedWords.includes('brave'), 'Snapshot: Original savedWords preserved');
      assert(snap.missions[0].done === 12 && snap.missions[1].done_flag === true, 'Snapshot: Original daily missions preserved');
      assert(snap.questUnits['1'][1].status === 'done', 'Snapshot: Original completed units preserved');
      assert(snap.ownedItemIds.includes('1') && snap.ownedItemIds.includes('4'), 'Snapshot: Original owned items preserved');
      assert(snap.equippedIds.includes('1'), 'Snapshot: Original equipped items preserved');
      assert(snap.lastResetDate === '2026-09-06', 'Snapshot: Original lastResetDate preserved');
      assert(typeof snap.snapshotAt === 'number', 'Snapshot: snapshotAt timestamp exists');

      // Step 4: Repeated fetchUserProgress MUST NOT overwrite or mutate existing snapshot
      await useProgressStore.getState().fetchUserProgress();
      const s1Repeat = useProgressStore.getState();
      assert(getProfileCallCount === 2, 'Profile fetched twice');
      assert(s1Repeat.pendingGuestMigration.xp === 500, 'Repeated profile fetch did NOT overwrite guest snapshot');
      assert(s1Repeat.pendingGuestMigration.gold === 250, 'Repeated profile fetch preserved guest gold');

      // Step 5: Persistence check (partialize includes pendingGuestMigration)
      const persisted = useProgressStore.persist.getOptions().partialize(s1Repeat);
      assert(persisted.pendingGuestMigration !== null, 'partialize includes pendingGuestMigration for localStorage');
      assert(persisted.pendingGuestMigration.xp === 500, 'persisted snapshot has 500 XP');

      // Step 6: Logout preserves pendingGuestMigration
      await useAuthStore.getState().logout();
      const s2 = useProgressStore.getState();
      assert(s2.xp === 0, 'Active progression reset on logout (0 XP)');
      assert(useAuthStore.getState().isAuthenticated === false, 'Auth state cleared on logout');
      assert(s2.pendingGuestMigration !== null, 'pendingGuestMigration survives logout intact');
      assert(s2.pendingGuestMigration.xp === 500, 'Guest snapshot still contains 500 XP after logout');
      assert(s2.hasUnsyncedGuestProgress === true, 'hasUnsyncedGuestProgress remains true after logout');

      // Step 7: Login again — snapshot remains intact
      useAuthStore.getState().setAuth({ id: 'user-real' }, 'jwt-token', 'refresh-token');
      await useProgressStore.getState().fetchUserProgress();
      const s3 = useProgressStore.getState();
      assert(s3.xp === 990, 'Re-login rehydrates exact same server progression (990 XP)');
      assert(s3.pendingGuestMigration.xp === 500, 'pendingGuestMigration still intact after re-login (500 XP)');
    } finally {
      axiosClient.get = originalGet;
    }
  }

  // ─── SUITE I: FAILED REQUEST PROTECTION (NO PHANTOM PROGRESS) ──────────────
  console.log("\n--- SUITE I: FAILED REQUEST PROTECTION ---");
  {
    resetAll({ xp: 200, gold: 100, wordsLearned: 10, ownedItemIds: [] });
    useAuthStore.getState().setAuth({ id: 'user-77' }, 'token-77', 'refresh-77');

    const originalPost = axiosClient.post;
    axiosClient.post = async () => {
      const err = new Error('Gateway Timeout');
      err.response = { status: 504 };
      throw err;
    };

    try {
      // Unit failure
      const uRes = await useProgressStore.getState().completeUnitLesson(1, 1);
      assert(uRes.success === false, 'Failed unit returns success: false');

      // Quiz failure
      const qRes = await useProgressStore.getState().completeQuiz(95);
      assert(qRes.success === false, 'Failed quiz returns success: false');

      // Buy failure
      const bRes = await useProgressStore.getState().buyItem({ id: '3', name: 'Thuốc XP', price: 600 });
      assert(bRes === false, 'Failed buy returns false');

      const s = useProgressStore.getState();
      assert(s.xp === 200, 'NO PHANTOM XP on network errors (remains 200)');
      assert(s.gold === 100, 'NO PHANTOM GOLD on network errors (remains 100)');
      assert(s.wordsLearned === 10, 'NO PHANTOM wordsLearned on network errors (remains 10)');
      assert(s.ownedItemIds.length === 0, 'NO PHANTOM inventory items on network errors');
    } finally {
      axiosClient.post = originalPost;
    }
  }

  // ─── SUITE J: RETRY WITH STABLE IDEMPOTENCY KEY ─────────────────────────────
  console.log("\n--- SUITE J: RETRY WITH STABLE IDEMPOTENCY KEY ---");
  {
    resetAll({ xp: 200, gold: 100 });
    useAuthStore.getState().setAuth({ id: 'user-77' }, 'token-77', 'refresh-77');

    let callCount = 0;
    const interceptedKeys = [];
    const clientGeneratedQuizKey = 'quiz_attempt_uuid_999';

    const originalPost = axiosClient.post;
    axiosClient.post = async (url, body) => {
      callCount++;
      interceptedKeys.push(body.idempotencyKey);
      if (callCount === 1) {
        throw new Error('503 Service Unavailable');
      }
      return {
        profile: {
          total_xp: 350,
          current_level: 2,
          gold: 175,
        },
        reward: { xp: 150, gold: 75 },
      };
    };

    try {
      // Attempt 1: Fails
      const attempt1 = await useProgressStore.getState().completeQuiz(100, clientGeneratedQuizKey);
      assert(attempt1.success === false, 'First attempt failed due to 503');

      // Attempt 2: Retry with the SAME stable idempotency key
      const attempt2 = await useProgressStore.getState().completeQuiz(100, clientGeneratedQuizKey);
      assert(attempt2.success === true, 'Second attempt succeeded on recovery');

      assert(interceptedKeys.length === 2, 'Two API calls made');
      assert(interceptedKeys[0] === clientGeneratedQuizKey, 'Call 1 used key: ' + clientGeneratedQuizKey);
      assert(interceptedKeys[1] === clientGeneratedQuizKey, 'Call 2 reused EXACT SAME key: ' + clientGeneratedQuizKey);
      assert(interceptedKeys[0] === interceptedKeys[1], 'ONE ACTION = ONE KEY invariant preserved across retry');

      const s = useProgressStore.getState();
      assert(s.xp === 350, 'Authoritative state applied after retry: 350 XP');
    } finally {
      axiosClient.post = originalPost;
    }
  }

  // ─── FINAL SUMMARY ──────────────────────────────────────────────────────────
  console.log("\n=================================================================");
  console.log(`PHASE 2B.2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2B2Tests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
