/**
 * PHASE 2C.4A — FRONTEND GUEST MIGRATION CORE TEST SUITE
 * 
 * Direct execution against actual production code:
 * - frontend/src/context/progressStore.js
 * - frontend/src/context/authStore.js
 * - frontend/src/api/userProgress.api.js
 * - frontend/src/api/endpoints.js
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

const { useProgressStore, INITIAL_MISSIONS, INITIAL_QUEST_UNITS } = await import('./src/context/progressStore.js');
const { useAuthStore } = await import('./src/context/authStore.js');
const { progressApi } = await import('./src/api/userProgress.api.js');
const { ENDPOINTS } = await import('./src/api/endpoints.js');
const axiosClient = (await import('./src/api/axiosClient.js')).default;

console.log("==================================================");
console.log("PHASE 2C.4A — FRONTEND MIGRATION CORE VERIFICATION");
console.log("==================================================");

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

function resetAll() {
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  useProgressStore.getState().resetProgress({ forceClearGuestSnapshot: true });
  useProgressStore.setState({
    xp: 0,
    level: 1,
    streak: 0,
    gold: 0,
    wordsLearned: 0,
    isSyncing: false,
    hasUnsyncedGuestProgress: false,
    pendingGuestMigration: null,
    isMigrating: false,
    migrationConflict: null,
  });
}

// ─── 1. ENDPOINTS & API HELPER VERIFICATION ─────────────────────────────────
console.log("\n[GROUP 1] API Endpoint & Helper Contract");
assert(ENDPOINTS.PROGRESS.MIGRATE_GUEST === '/progress/migrate-guest', 'ENDPOINTS.PROGRESS.MIGRATE_GUEST is defined correctly');
assert(typeof progressApi.migrateGuest === 'function', 'progressApi.migrateGuest helper is defined as a function');

// ─── 2. GUEST CAPTURE & MIGRATION KEY IMMUTABILITY ──────────────────────────
console.log("\n[GROUP 2] capturePendingGuestMigration() Contract");
resetAll();

// 2.1 Authenticated guard: cannot capture if user is authenticated
useAuthStore.setState({ isAuthenticated: true, user: { id: 1 } });
useProgressStore.setState({ xp: 500, gold: 100 });
const authCapture = useProgressStore.getState().capturePendingGuestMigration();
assert(authCapture === null, 'capturePendingGuestMigration() returns null when user is authenticated (Invariant C4-1 & C4-5)');
assert(useProgressStore.getState().pendingGuestMigration === null, 'pendingGuestMigration remains null when authenticated');

// 2.2 Unauthenticated with no progress: returns null
resetAll();
const emptyCapture = useProgressStore.getState().capturePendingGuestMigration();
assert(emptyCapture === null, 'capturePendingGuestMigration() returns null when guest has 0 progress');

// 2.3 Unauthenticated with progress: captures snapshot with migrationKey
useProgressStore.setState({
  xp: 350,
  gold: 75,
  streak: 3,
  wordsLearned: 15,
  savedWords: ['serendipity', 'ephemeral'],
  ownedItemIds: [1, 2],
  equippedIds: [1],
});
const snap1 = useProgressStore.getState().capturePendingGuestMigration();
assert(snap1 !== null, 'capturePendingGuestMigration() captures snapshot when guest has progress');
assert(typeof snap1.migrationKey === 'string' && snap1.migrationKey.length > 10, 'Snapshot contains a valid migrationKey string');
assert(snap1.xp === 350, 'Snapshot contains accurate xp (350)');
assert(snap1.gold === 75, 'Snapshot contains accurate gold (75)');
assert(snap1.streak === 3, 'Snapshot contains accurate streak (3)');
assert(snap1.wordsLearned === 15, 'Snapshot contains accurate wordsLearned (15)');
assert(Array.isArray(snap1.savedWords) && snap1.savedWords.length === 2, 'Snapshot contains savedWords array');
assert(Array.isArray(snap1.ownedItemIds) && snap1.ownedItemIds.length === 2, 'Snapshot contains ownedItemIds array');
assert(Array.isArray(snap1.equippedIds) && snap1.equippedIds.length === 1, 'Snapshot contains equippedIds array');
assert(typeof snap1.snapshotAt === 'number', 'Snapshot contains snapshotAt timestamp');
assert(useProgressStore.getState().hasUnsyncedGuestProgress === true, 'hasUnsyncedGuestProgress flag is set to true');

// 2.4 Idempotency: repeated capture calls REUSE the existing snapshot and NEVER generate a new key
const originalKey = snap1.migrationKey;
useProgressStore.setState({ xp: 999 }); // Even if state temporarily changed
const snap2 = useProgressStore.getState().capturePendingGuestMigration();
assert(snap2 === snap1, 'Repeated capturePendingGuestMigration() returns the exact existing snapshot object');
assert(snap2.migrationKey === originalKey, 'Repeated capturePendingGuestMigration() NEVER generates a new migrationKey');
assert(snap2.xp === 350, 'Snapshot content is frozen and preserved');

// ─── 3. migrateGuestProgress() GUARDS ───────────────────────────────────────
console.log("\n[GROUP 3] migrateGuestProgress() Guard Behaviors");
resetAll();

// 3.1 Unauthenticated guard
const unauthRes = await useProgressStore.getState().migrateGuestProgress();
assert(unauthRes.success === false && unauthRes.reason === 'unauthenticated', 'migrateGuestProgress() rejects unauthenticated calls');

// 3.2 Authenticated with null snapshot
useAuthStore.setState({ isAuthenticated: true, user: { id: 2 } });
const noDataRes = await useProgressStore.getState().migrateGuestProgress();
assert(noDataRes.success === true && noDataRes.noData === true, 'migrateGuestProgress() returns success with noData: true when snapshot is null');
assert(useProgressStore.getState().pendingGuestMigration === null, 'migrateGuestProgress() DID NOT call capturePendingGuestMigration()');

// 3.3 In-flight guard
useProgressStore.setState({
  pendingGuestMigration: { migrationKey: 'mig_test_key_123', xp: 100 },
  isMigrating: true,
});
const inFlightRes = await useProgressStore.getState().migrateGuestProgress();
assert(inFlightRes.success === false && inFlightRes.inFlight === true, 'migrateGuestProgress() rejects when isMigrating is already true');

// ─── 4. migrateGuestProgress() SUCCESS FLOW ─────────────────────────────────
console.log("\n[GROUP 4] migrateGuestProgress() HTTP 200 Success Flow");
resetAll();
useAuthStore.setState({ isAuthenticated: true, user: { id: 3 } });

const testSnapshot = {
  migrationKey: 'mig_key_success_456',
  xp: 250,
  gold: 50,
  streak: 2,
  wordsLearned: 10,
  savedWords: ['hello'],
  missions: INITIAL_MISSIONS,
  questUnits: INITIAL_QUEST_UNITS,
  ownedItemIds: [1],
  equippedIds: [],
  lastResetDate: '2026-09-06',
  snapshotAt: Date.now(),
};

useProgressStore.setState({
  pendingGuestMigration: testSnapshot,
  hasUnsyncedGuestProgress: true,
  isMigrating: false,
});

// Mock axiosClient.post
let capturedPostUrl = null;
let capturedPayload = null;
const originalPost = axiosClient.post;

axiosClient.post = async (url, payload) => {
  capturedPostUrl = url;
  capturedPayload = payload;
  return {
    success: true,
    data: {
      migrated: true,
      profile: {
        totalXp: 250,
        currentLevel: 1,
        gold: 50,
        streakDays: 2,
        wordsLearned: 10,
        savedWords: ['hello'],
        ownedItemIds: [1],
        equippedIds: [],
        questUnits: INITIAL_QUEST_UNITS,
      },
      summary: { xpMerged: 250, goldMerged: 50 },
    },
    message: 'Chuyển đổi thành công',
  };
};

const successRes = await useProgressStore.getState().migrateGuestProgress();

assert(successRes.success === true && successRes.migrated === true, 'migrateGuestProgress() returns success: true, migrated: true');
assert(capturedPostUrl === '/progress/migrate-guest', 'migrateGuestProgress() calls ENDPOINTS.PROGRESS.MIGRATE_GUEST');
assert(capturedPayload.migrationKey === 'mig_key_success_456', 'Payload uses frozen migrationKey from snapshot');
assert(capturedPayload.snapshot === testSnapshot, 'Payload passes snapshot through unchanged');

const stateAfterSuccess = useProgressStore.getState();
assert(stateAfterSuccess.isMigrating === false, 'isMigrating is set to false after success');
assert(stateAfterSuccess.pendingGuestMigration === null, 'pendingGuestMigration is cleared to null after success');
assert(stateAfterSuccess.hasUnsyncedGuestProgress === false, 'hasUnsyncedGuestProgress is set to false after success');
assert(stateAfterSuccess.migrationConflict === null, 'migrationConflict is cleared to null');
assert(stateAfterSuccess.xp === 250, 'Authoritative server profile applied to store (xp = 250)');
assert(stateAfterSuccess.gold === 50, 'Authoritative server profile applied to store (gold = 50)');

// ─── 5. migrateGuestProgress() RETRYABLE FAILURE (400 / 500 / NETWORK) ───────
console.log("\n[GROUP 5] migrateGuestProgress() Network / 500 Retryable Failure");
resetAll();
useAuthStore.setState({ isAuthenticated: true, user: { id: 4 } });

useProgressStore.setState({
  pendingGuestMigration: testSnapshot,
  hasUnsyncedGuestProgress: true,
  isMigrating: false,
});

axiosClient.post = async () => {
  const err = new Error('Network Error: Gateway Timeout');
  err.status = 504;
  throw err;
};

const failRes = await useProgressStore.getState().migrateGuestProgress();

assert(failRes.success === false && failRes.retryable === true, 'migrateGuestProgress() returns retryable failure on 504');
const stateAfterFail = useProgressStore.getState();
assert(stateAfterFail.isMigrating === false, 'isMigrating is reset to false after network failure');
assert(stateAfterFail.pendingGuestMigration === testSnapshot, 'pendingGuestMigration is strictly PRESERVED on network failure');
assert(stateAfterFail.pendingGuestMigration.migrationKey === 'mig_key_success_456', 'migrationKey is strictly PRESERVED');
assert(stateAfterFail.hasUnsyncedGuestProgress === true, 'hasUnsyncedGuestProgress remains true');

// ─── 6. migrateGuestProgress() 409 CONFLICT FLOW ────────────────────────────
console.log("\n[GROUP 6] migrateGuestProgress() HTTP 409 Conflict Flow");
resetAll();
useAuthStore.setState({ isAuthenticated: true, user: { id: 5 } });

useProgressStore.setState({
  pendingGuestMigration: testSnapshot,
  hasUnsyncedGuestProgress: true,
  isMigrating: false,
  migrationConflict: null,
});

const originalGet = axiosClient.get;

// Mock 409 conflict on migrateGuest
axiosClient.post = async () => {
  const err = {
    status: 409,
    code: 'MIGRATION_CONFLICT',
    conflict: true,
    reason: 'CLOUD_PROGRESS_EXISTS',
    existingSummary: { totalXp: 1000, gold: 500 },
    guestSummary: { xp: 250, gold: 50 },
    message: 'Tài khoản đã có tiến trình trên máy chủ',
  };
  throw err;
};

// Mock getProfile to return authoritative cloud profile
axiosClient.get = async (url) => {
  if (url === ENDPOINTS.PROGRESS.PROFILE) {
    return {
      success: true,
      data: {
        profile: {
          totalXp: 1000,
          currentLevel: 4,
          gold: 500,
          streakDays: 5,
          wordsLearned: 50,
          savedWords: ['cloud_word'],
          ownedItemIds: [10],
          equippedIds: [10],
          questUnits: INITIAL_QUEST_UNITS,
        },
      },
    };
  }
  return originalGet(url);
};

const conflictRes = await useProgressStore.getState().migrateGuestProgress();

assert(conflictRes.success === false && conflictRes.conflict === true, 'migrateGuestProgress() returns conflict result on 409');
assert(conflictRes.reason === 'CLOUD_PROGRESS_EXISTS', 'Conflict reason is preserved');

const stateAfterConflict = useProgressStore.getState();
assert(stateAfterConflict.isMigrating === false, 'isMigrating is set to false on 409');
assert(stateAfterConflict.pendingGuestMigration === testSnapshot, 'pendingGuestMigration is STRICTLY PRESERVED on 409 (Invariant C4-9 & Invariant C4-10)');
assert(stateAfterConflict.migrationConflict !== null, 'migrationConflict object is stored in Zustand state');
assert(stateAfterConflict.migrationConflict.code === 'MIGRATION_CONFLICT', 'migrationConflict contains code');
assert(stateAfterConflict.migrationConflict.pendingSnapshot === testSnapshot, 'migrationConflict contains original pendingSnapshot');
assert(stateAfterConflict.xp === 1000, 'Authoritative cloud profile was hydrated into Zustand (xp = 1000)');
assert(stateAfterConflict.gold === 500, 'Authoritative cloud profile was hydrated into Zustand (gold = 500)');

// Restore mocks
axiosClient.post = originalPost;
axiosClient.get = originalGet;

// ─── 7. discardPendingGuestMigration() ──────────────────────────────────────
console.log("\n[GROUP 7] discardPendingGuestMigration() Contract");
assert(typeof useProgressStore.getState().discardPendingGuestMigration === 'function', 'discardPendingGuestMigration is defined');

useProgressStore.getState().discardPendingGuestMigration();
const stateAfterDiscard = useProgressStore.getState();
assert(stateAfterDiscard.pendingGuestMigration === null, 'discardPendingGuestMigration() sets pendingGuestMigration to null');
assert(stateAfterDiscard.hasUnsyncedGuestProgress === false, 'discardPendingGuestMigration() sets hasUnsyncedGuestProgress to false');
assert(stateAfterDiscard.migrationConflict === null, 'discardPendingGuestMigration() clears migrationConflict');
assert(stateAfterDiscard.xp === 1000, 'discardPendingGuestMigration() DOES NOT modify server XP (remains 1000)');

// ─── 8. resetProgress() PRESERVATION & SAFETY ───────────────────────────────
console.log("\n[GROUP 8] resetProgress() State Preservation");
resetAll();

// Set snapshot and conflict
useProgressStore.setState({
  pendingGuestMigration: testSnapshot,
  hasUnsyncedGuestProgress: true,
  migrationConflict: { test: true },
  isMigrating: true,
});

// Regular resetProgress (e.g. logout) preserves snapshot and conflict
useProgressStore.getState().resetProgress();
const resetPreserved = useProgressStore.getState();
assert(resetPreserved.pendingGuestMigration === testSnapshot, 'resetProgress() preserves pendingGuestMigration');
assert(resetPreserved.migrationConflict !== null, 'resetProgress() preserves migrationConflict');
assert(resetPreserved.isMigrating === false, 'resetProgress() resets isMigrating to false');

// Force reset clears snapshot
useProgressStore.getState().resetProgress({ forceClearGuestSnapshot: true });
const resetForced = useProgressStore.getState();
assert(resetForced.pendingGuestMigration === null, 'resetProgress({ forceClearGuestSnapshot: true }) clears pendingGuestMigration');
assert(resetForced.migrationConflict === null, 'resetProgress({ forceClearGuestSnapshot: true }) clears migrationConflict');

// ─── 9. STATE PERSISTENCE SEMANTICS (TRANSIENT VS PERSISTED) ───────────────
console.log("\n[GROUP 9] State Persistence Semantics (Transient vs Persisted)");
resetAll();

useProgressStore.setState({
  xp: 100,
  gold: 25,
  pendingGuestMigration: testSnapshot,
  hasUnsyncedGuestProgress: true,
  isMigrating: true,
  migrationConflict: {
    code: 'MIGRATION_CONFLICT',
    reason: 'CLOUD_PROGRESS_EXISTS',
    message: 'Transient conflict context',
  },
});

const currentState = useProgressStore.getState();
assert(currentState.migrationConflict !== null, 'migrationConflict exists in active Zustand state');
assert(currentState.isMigrating === true, 'isMigrating is true in active Zustand state');

// Access the store's partialize function from persist options
const persistOptions = useProgressStore.persist.getOptions();
const partialized = persistOptions.partialize(currentState);

assert(partialized.migrationConflict === undefined, 'persist/partialize output does NOT contain migrationConflict');
assert(partialized.isMigrating === undefined, 'persist/partialize output does NOT contain isMigrating');
assert(partialized.pendingGuestMigration === testSnapshot, 'persist/partialize output DOES contain pendingGuestMigration');
assert(partialized.hasUnsyncedGuestProgress === true, 'persist/partialize output DOES contain hasUnsyncedGuestProgress');

// Check actual localStorage content written by Zustand persist
const storedRaw = mockLocalStorage.getItem('engjoy-guest-progress');
const parsed = JSON.parse(storedRaw);

assert(parsed?.state?.migrationConflict === undefined, 'localStorage does NOT contain migrationConflict');
assert(parsed?.state?.isMigrating === undefined, 'localStorage does NOT contain isMigrating');
assert(parsed?.state?.pendingGuestMigration !== null, 'localStorage DOES contain pendingGuestMigration');
assert(parsed?.state?.pendingGuestMigration?.migrationKey === testSnapshot.migrationKey, 'localStorage contains exact migrationKey');
assert(parsed?.state?.hasUnsyncedGuestProgress === true, 'localStorage DOES contain hasUnsyncedGuestProgress');

// Simulate page reload / rehydration from localStorage:
// 1. Reset in-memory state while keeping localStorage intact
useProgressStore.setState({
  migrationConflict: null,
  isMigrating: false,
  pendingGuestMigration: null,
  hasUnsyncedGuestProgress: false,
});
// Restore stored data to localStorage in case setState modified it
mockLocalStorage.setItem('engjoy-guest-progress', storedRaw);

// 2. Trigger rehydration
await useProgressStore.persist.rehydrate();

const rehydratedState = useProgressStore.getState();
assert(rehydratedState.migrationConflict === null, 'Browser reload does NOT resurrect stale migrationConflict (strictly transient)');
assert(rehydratedState.isMigrating === false, 'Browser reload does NOT resurrect isMigrating (strictly transient)');
assert(rehydratedState.pendingGuestMigration !== null, 'pendingGuestMigration survives browser reload intact');
assert(rehydratedState.pendingGuestMigration?.migrationKey === testSnapshot.migrationKey, 'migrationKey survives reload intact');
assert(rehydratedState.hasUnsyncedGuestProgress === true, 'hasUnsyncedGuestProgress survives browser reload intact');

console.log("\n==================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}

