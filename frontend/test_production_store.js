/**
 * PRODUCTION STORE DIRECT VERIFICATION SUITE
 * 
 * Imports and executes the ACTUAL PRODUCTION code from:
 * - frontend/src/context/progressStore.js
 * - frontend/src/context/authStore.js
 * - frontend/src/api/axiosClient.js
 */

// Polyfill window, document & localStorage for Node execution BEFORE module imports
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

const { useProgressStore, INITIAL_MISSIONS, INITIAL_QUESTS, INITIAL_QUEST_UNITS } = await import('./src/context/progressStore.js');
const { useAuthStore } = await import('./src/context/authStore.js');
const axiosClient = (await import('./src/api/axiosClient.js')).default;

console.log("=== EXECUTING PRODUCTION STORE DIRECT TEST SUITE ===");

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

// Reset store helper
function resetStore(customState = {}) {
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
    lastResetDate: new Date().toISOString().slice(0, 10),
    ...customState,
  });
}

async function runProductionTests() {
  console.log("\n--- TEST A: Save new word in production store (Guest) ---");
  {
    resetStore();
    const res = await useProgressStore.getState().saveWord("serendipity", 15);
    const s = useProgressStore.getState();
    assert(res.success === true, "saveWord returns success: true");
    assert(s.xp === 15, "Store XP is exactly 15");
    assert(s.gold === 7, "Store Gold is exactly 7 (Math.floor(15/2))");
    assert(s.wordsLearned === 1, "Store wordsLearned is exactly 1");
    assert(s.savedWords.includes("serendipity"), "Word recorded in savedWords");
    assert(s.missions.find(m => m.type === 'words').done === 1, "Word mission progress is 1/20");
    assert(s.hasUnsyncedGuestProgress === true, "Guest flag is true");
  }

  console.log("\n--- TEST B: Save duplicate word in production store ---");
  {
    resetStore();
    await useProgressStore.getState().saveWord("hello", 15);
    const xpBefore = useProgressStore.getState().xp;
    const goldBefore = useProgressStore.getState().gold;
    const wordsBefore = useProgressStore.getState().wordsLearned;

    const res = await useProgressStore.getState().saveWord("hello", 15);
    const s = useProgressStore.getState();
    assert(res.success === false && res.alreadySaved === true, "Duplicate save returns alreadySaved: true");
    assert(s.xp === xpBefore, "XP unchanged on duplicate word");
    assert(s.gold === goldBefore, "Gold unchanged on duplicate word");
    assert(s.wordsLearned === wordsBefore, "wordsLearned unchanged on duplicate word");
  }

  console.log("\n--- TEST C: Complete unit first time in production store ---");
  {
    resetStore();
    const res = await useProgressStore.getState().completeUnitLesson(1, 1);
    const s = useProgressStore.getState();
    assert(res.success === true, "completeUnitLesson returns success: true");
    assert(s.xp === 60, "Store XP is exactly 60");
    assert(s.gold === 30, "Store Gold is exactly 30");
    assert(s.wordsLearned === 15, "wordsLearned is exactly 15 (NO DOUBLE COUNTING!)");
    assert(s.questUnits[1][0].status === "done", "Unit 1 marked done");
    assert(s.questUnits[1][1].status === "active", "Unit 2 unlocked as active");
    assert(s.missions.find(m => m.type === 'words').done === 15, "Word mission is 15/20");
  }

  console.log("\n--- TEST D: Complete same unit second time in production store ---");
  {
    resetStore();
    await useProgressStore.getState().completeUnitLesson(1, 1);
    const xpAfter1 = useProgressStore.getState().xp;
    const wordsAfter1 = useProgressStore.getState().wordsLearned;

    const res = await useProgressStore.getState().completeUnitLesson(1, 1);
    const s = useProgressStore.getState();
    assert(res.alreadyDone === true, "Repeated completion returns alreadyDone: true");
    assert(s.xp === xpAfter1, "XP unchanged on repeat");
    assert(s.wordsLearned === wordsAfter1, "wordsLearned unchanged on repeat");
  }

  console.log("\n--- TEST E: Complete mission in production store (19/20 -> 20/20) ---");
  {
    resetStore({
      xp: 100,
      gold: 50,
      wordsLearned: 19,
      missions: [
        { id: 1, type: "words", title: "Học 20 từ mới", done: 19, total: 20, xp: 100, done_flag: false }
      ]
    });
    // Save 20th word: +15 XP (word) + 100 XP (bonus) = +115 XP; +7 (word) + 50 (bonus) = +57 Gold
    await useProgressStore.getState().saveWord("finalword", 15);
    const s = useProgressStore.getState();
    assert(s.xp === 100 + 15 + 100, "XP awarded is 215 (100 base + 15 word + 100 mission bonus)");
    assert(s.gold === 50 + 7 + 50, "Gold awarded is 107 (50 base + 7 word + 50 mission bonus)");
    const m = s.missions.find(x => x.type === 'words');
    assert(m.done === 20 && m.done_flag === true, "Mission marked done with done_flag: true");
  }

  console.log("\n--- TEST F: Try completing same mission again in production store ---");
  {
    resetStore({
      xp: 215,
      gold: 107,
      wordsLearned: 20,
      missions: [
        { id: 1, type: "words", title: "Học 20 từ mới", done: 20, total: 20, xp: 100, done_flag: true }
      ]
    });
    await useProgressStore.getState().saveWord("extra_word", 15);
    const s = useProgressStore.getState();
    assert(s.xp === 215 + 15, "Only +15 XP awarded for the word, NO second bonus");
    assert(s.gold === 107 + 7, "Only +7 Gold awarded for the word, NO second bonus");
  }

  console.log("\n--- TEST G: Quiz completion via production submitScore ---");
  {
    resetStore();
    await useProgressStore.getState().submitScore(150, { score: 100, isQuiz: true });
    const s = useProgressStore.getState();
    const quizMission = s.missions.find(m => m.type === 'quiz');
    assert(s.xp === 150 + 75, "XP is 150 (quiz) + 75 (quiz mission bonus) = 225");
    assert(s.gold === 75 + 37, "Gold is 75 + 37 = 112");
    assert(quizMission.done === 1 && quizMission.done_flag === true, "Quiz mission completed");
  }

  console.log("\n--- TEST H: Joy chat mission progress in production store ---");
  {
    resetStore();
    // Messages 1-4: 0 XP awarded, done increments 1..4
    for (let i = 1; i <= 4; i++) {
      await useProgressStore.getState().submitScore(0, { isChat: true, silent: true });
      const s = useProgressStore.getState();
      assert(s.xp === 0, `Message ${i}: 0 XP awarded`);
      assert(s.missions.find(m => m.type === 'chat').done === i, `Chat mission done=${i}/5`);
    }
    // Message 5: completes mission!
    await useProgressStore.getState().submitScore(0, { isChat: true, silent: true });
    const s = useProgressStore.getState();
    assert(s.xp === 50, "5th message completes mission: +50 XP");
    assert(s.gold === 25, "+25 Gold");
    assert(s.missions.find(m => m.type === 'chat').done_flag === true, "Chat mission done_flag is true");
  }

  console.log("\n--- TEST I: Level up caused by normal XP in production store ---");
  {
    resetStore({ xp: 180, level: 1 });
    await useProgressStore.getState().submitScore(50);
    const s = useProgressStore.getState();
    assert(s.xp === 230, "XP is 230");
    assert(s.level === 2, "Level raised from 1 to 2");
  }

  console.log("\n--- TEST J: Level up caused by mission bonus in production store ---");
  {
    resetStore({
      xp: 150,
      level: 1,
      missions: [{ id: 2, type: "quiz", done: 0, total: 1, xp: 75, done_flag: false }]
    });
    await useProgressStore.getState().submitScore(15, { isQuiz: true });
    const s = useProgressStore.getState();
    assert(s.xp === 150 + 15 + 75, "XP is 240 (150 base + 15 action + 75 bonus)");
    assert(s.level === 2, "Level raised to 2 by combined action + mission bonus");
  }

  console.log("\n--- TEST K: Guest mode flags in production store ---");
  {
    resetStore();
    const res = await useProgressStore.getState().submitScore(20);
    assert(res.isGuest === true, "Guest response has isGuest: true");
    assert(useProgressStore.getState().hasUnsyncedGuestProgress === true, "hasUnsyncedGuestProgress is true");
  }

  console.log("\n--- TEST L: Authenticated mode submitScore protection (No arbitrary reward injection) ---");
  {
    resetStore({ xp: 100, level: 1, gold: 50 });
    useAuthStore.getState().setAuth({ id: 'user-1' }, 'token-1', 'refresh-1');

    // Authenticated user calling legacy submitScore directly
    const res = await useProgressStore.getState().submitScore(60, { wordsLearned: 15 });
    assert(res.success === true, "Authenticated submitScore handled safely");
    const s = useProgressStore.getState();
    assert(s.xp === 100, "Store XP remains 100 (No client reward injection for auth user)");
    assert(s.gold === 50, "Store Gold remains 50");
    assert(s.hasUnsyncedGuestProgress === false, "hasUnsyncedGuestProgress is false for auth");
  }

  console.log("\n--- TEST M: Authenticated action API failure preserves state (No phantom rewards) ---");
  {
    resetStore({ xp: 100, gold: 50 });
    useAuthStore.getState().setAuth({ id: 'user-1' }, 'token-1', 'refresh-1');

    const originalPost = axiosClient.post;
    axiosClient.post = async () => {
      throw new Error('500 Internal Server Error');
    };

    try {
      const res = await useProgressStore.getState().completeUnitLesson(1, 1);
      assert(res.success === false, "Returns failure on API error");
      const s = useProgressStore.getState();
      assert(s.xp === 100, "Store XP remains 100 (NO PHANTOM XP!)");
      assert(s.gold === 50, "Store Gold remains 50 (NO PHANTOM GOLD!)");
      assert(s.questUnits[1][0].status === 'active', "Unit status not changed on API error");
    } finally {
      axiosClient.post = originalPost;
    }
  }

  console.log("\n--- TEST N.1: Concurrent double-click on completeUnitLesson ---");
  {
    resetStore();
    // Rapid simultaneous invocations of the SAME unit
    const [r1, r2] = await Promise.all([
      useProgressStore.getState().completeUnitLesson(1, 1),
      useProgressStore.getState().completeUnitLesson(1, 1),
    ]);
    const s = useProgressStore.getState();
    assert((r1.success && (r2.inProgress || r2.alreadyDone)) || (r2.success && (r1.inProgress || r1.alreadyDone)), "One call succeeds and the duplicate is locked out");
    assert(s.xp === 60, "XP awarded exactly once: 60");
    assert(s.wordsLearned === 15, "wordsLearned awarded exactly once: 15");
  }

  console.log("\n--- TEST N.2: Concurrent double-save on saveWord ---");
  {
    resetStore();
    // Rapid simultaneous invocations of the SAME word
    const [r1, r2] = await Promise.all([
      useProgressStore.getState().saveWord("simultaneous", 15),
      useProgressStore.getState().saveWord("simultaneous", 15),
    ]);
    const s = useProgressStore.getState();
    assert((r1.success && r2.alreadySaved) || (r2.success && r1.alreadySaved), "One save succeeds and the concurrent duplicate is rejected");
    assert(s.xp === 15, "XP awarded exactly once: 15");
    assert(s.savedWords.filter(w => w === "simultaneous").length === 1, "Word exists in savedWords exactly once");
  }

  console.log("\n--- TEST N.3: Concurrent simultaneous submitScore race for Mission Completion ---");
  {
    // Mission at 19/20. Two simultaneous submitScores with wordsLearned: 1
    // Without transaction serialization, both would see 19/20 and BOTH would claim the 100 bonus XP!
    resetStore({
      xp: 0,
      gold: 0,
      missions: [
        { id: 1, type: "words", title: "Học 20 từ mới", done: 19, total: 20, xp: 100, done_flag: false }
      ]
    });

    const [r1, r2] = await Promise.all([
      useProgressStore.getState().submitScore(15, { wordsLearned: 1 }),
      useProgressStore.getState().submitScore(15, { wordsLearned: 1 }),
    ]);

    const s = useProgressStore.getState();
    // First call: 15 + 100 (bonus) = 115 XP
    // Second call: 15 + 0 (already done) = 15 XP
    // Total XP must be 115 + 15 = 130 XP! (If race bug existed, total would be 230 XP)
    assert(s.xp === 130, `Total XP is exactly 130 (15+100 bonus for first, 15+0 for second). Actual: ${s.xp}`);
    assert(s.missions.find(m => m.type === 'words').done === 20, "Mission done is capped at 20");
    assert(s.missions.find(m => m.type === 'words').done_flag === true, "Mission done_flag is true");
  }

  console.log("\n--- TEST N.4: Authenticated Network Failure and Retry Safety ---");
  {
    resetStore();
    useAuthStore.getState().setAuth({ id: 'user-1' }, 'token-1', 'refresh-1');

    let shouldFail = true;
    const originalPost = axiosClient.post;
    axiosClient.post = async (url, payload) => {
      if (shouldFail) throw new Error('Network timeout');
      return {
        data: {
          profile: {
            total_xp: 60,
            current_level: 1,
            streak_days: 1,
            gold: 30,
            quest_units: {
              '1': [{ id: 1, status: 'done' }, { id: 2, status: 'active' }],
            },
          },
          reward: {
            xp: 60,
            gold: 30,
            wordsLearned: 15,
          },
        },
      };
    };

    try {
      // 1. First attempt fails
      const attempt1 = await useProgressStore.getState().completeUnitLesson(1, 1);
      assert(attempt1.success === false, "First attempt reports failure due to network error");
      const s1 = useProgressStore.getState();
      assert(s1.questUnits[1][0].status === "active", "Unit remains 'active' (NOT locked as done)");
      assert(s1.xp === 0, "No phantom XP stored");

      // 2. Network recovers, user retries the unit
      shouldFail = false;
      const attempt2 = await useProgressStore.getState().completeUnitLesson(1, 1);
      assert(attempt2.success === true, "Retry succeeds once network recovers");
      const s2 = useProgressStore.getState();
      assert(s2.questUnits[1][0].status === "done", "Unit is now marked 'done'");
      assert(s2.xp === 60, "XP persisted and loaded from server: 60");
    } finally {
      axiosClient.post = originalPost;
    }
  }

  console.log("\n--- TEST O: State consistency simulation after reload ---");
  {
    resetStore({
      xp: 240,
      gold: 120,
      level: 2,
      wordsLearned: 20,
      missions: [
        { id: 1, type: "words", title: "Học 20 từ mới", done: 20, total: 20, xp: 100, done_flag: true }
      ]
    });
    await useProgressStore.getState().saveWord("post_reload_word", 15);
    const s = useProgressStore.getState();
    assert(s.xp === 240 + 15, "Post-reload XP is 255 (only word reward, no replayed mission)");
    assert(s.gold === 120 + 7, "Post-reload Gold is 127");
  }

  console.log("\n--- TEST P.1: Guest Equipment Management (Max 2 rule) ---");
  {
    resetStore({ ownedItemIds: [1, 2, 4], equippedIds: [] });

    // P1.1: Cannot equip unowned item
    const unownedRes = await useProgressStore.getState().toggleEquip(3);
    assert(unownedRes.success === false && unownedRes.notOwned === true, "Guest cannot equip unowned item");
    assert(useProgressStore.getState().equippedIds.length === 0, "equippedIds remains empty");

    // P1.2: Equip item 1
    const eq1 = await useProgressStore.getState().toggleEquip(1);
    assert(eq1.success === true && eq1.equipped === true, "Guest equipped item 1");
    assert(useProgressStore.getState().equippedIds.includes(1), "Store equippedIds contains 1");

    // P1.3: Equip item 2
    const eq2 = await useProgressStore.getState().toggleEquip(2);
    assert(eq2.success === true && eq2.equipped === true, "Guest equipped item 2");
    assert(useProgressStore.getState().equippedIds.length === 2, "Store equippedIds has 2 items");

    // P1.4: 3rd item blocked by max-2 rule
    const eq3 = await useProgressStore.getState().toggleEquip(4);
    assert(eq3.success === false && eq3.maxReached === true, "Guest equipping 3rd item blocked by max-2 rule");
    assert(useProgressStore.getState().equippedIds.length === 2, "Store equippedIds remains 2");

    // P1.5: Unequip item 1
    const un1 = await useProgressStore.getState().toggleEquip(1);
    assert(un1.success === true && un1.equipped === false, "Guest unequipped item 1");
    assert(!useProgressStore.getState().equippedIds.includes(1), "Store equippedIds no longer contains 1");
    assert(useProgressStore.getState().equippedIds.length === 1, "Store equippedIds has exactly 1 item remaining");
  }

  console.log("\n--- TEST P.2: Authenticated Server-Authoritative Equipment Flow ---");
  {
    resetStore({ ownedItemIds: [1, 2], equippedIds: [] });
    useAuthStore.getState().setAuth({ id: 'user-auth-equip' }, 'token-equip', 'refresh-equip');

    const originalPost = axiosClient.post;
    let postedPayload = null;

    axiosClient.post = async (url, payload) => {
      postedPayload = payload;
      return {
        data: {
          success: true,
          reward: { equipped: true, itemId: payload.itemId, equippedIds: [payload.itemId] },
          profile: {
            userId: 'user-auth-equip',
            totalXp: 100,
            currentLevel: 1,
            gold: 500,
            ownedItemIds: ['1', '2'],
            equippedIds: [payload.itemId],
          },
        },
      };
    };

    try {
      // P2.1: Call toggleEquip(1)
      const res = await useProgressStore.getState().toggleEquip(1);
      assert(res.success === true, "Authenticated toggleEquip succeeded");
      assert(postedPayload.action === "EQUIP_ITEM", "Action sent to backend is EQUIP_ITEM");
      assert(postedPayload.itemId === "1", "itemId correctly sent as string");
      assert(postedPayload.equippedIds === undefined, "equippedIds array NOT sent in request body");
      assert(useProgressStore.getState().equippedIds.includes(1), "Store hydrated from authoritative server profile");

      // P2.2: Server failure preserves state without optimistic corruption
      axiosClient.post = async () => {
        throw new Error('500 Server Error');
      };

      const failRes = await useProgressStore.getState().toggleEquip(2);
      assert(failRes.success === false, "Failed equip returns failure");
      assert(!useProgressStore.getState().equippedIds.includes(2), "Store NOT optimistically modified on failure");
      assert(useProgressStore.getState().equippedIds.includes(1), "Existing equipment intact");
    } finally {
      axiosClient.post = originalPost;
      resetStore();
    }
  }

  console.log(`\n======================================================`);
  console.log(`PRODUCTION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runProductionTests().catch(err => {
  console.error(err);
  process.exit(1);
});
