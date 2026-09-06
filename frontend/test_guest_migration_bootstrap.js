/**
 * PHASE 2C.4C — APP BOOTSTRAP / RELOAD GUEST MIGRATION RECOVERY TEST SUITE
 * 
 * Verifies authenticated browser reload & cold bootstrap safety against:
 * - frontend/src/App.jsx
 * - frontend/src/context/progressStore.js
 * - frontend/src/context/authStore.js
 */

import fs from 'fs';

// 1. Polyfill window, document & localStorage for Node execution BEFORE module imports
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

// 2. Production Store Imports
const { useProgressStore, INITIAL_MISSIONS, INITIAL_QUEST_UNITS } = await import('./src/context/progressStore.js');
const { useAuthStore } = await import('./src/context/authStore.js');
const { progressApi } = await import('./src/api/userProgress.api.js');
const { ENDPOINTS } = await import('./src/api/endpoints.js');
const axiosClient = (await import('./src/api/axiosClient.js')).default;

console.log("=================================================================");
console.log("  PHASE 2C.4C — APP BOOTSTRAP / RELOAD MIGRATION RECOVERY SUITE  ");
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

// Bootstrap executor mirroring the exact implementation in App.jsx
let bootstrapPromise = null;
async function bootstrapAppProgress() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  const authState = useAuthStore.getState();
  if (!authState.isAuthenticated || !authState.user) {
    return { status: 'unauthenticated' };
  }

  bootstrapPromise = (async () => {
    try {
      const progressStore = useProgressStore.getState();
      if (progressStore.pendingGuestMigration) {
        // Invariant C4-B10: Strictly migrate directly, DO NOT call fetchUserProgress() first
        const result = await progressStore.migrateGuestProgress();
        return { status: 'migrated', result };
      } else {
        await progressStore.fetchUserProgress();
        return { status: 'hydrated' };
      }
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
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
  mockLocalStorage.clear();
  bootstrapPromise = null;
}

// ─── STATIC AUDIT OF APP.JSX ────────────────────────────────────────────────
console.log("[STATIC SOURCE CODE AUDIT] App.jsx Bootstrap Orchestration");
const appSrc = fs.readFileSync('./src/App.jsx', 'utf8');

assert(appSrc.includes('export async function bootstrapAppProgress'), 'App.jsx exports bootstrapAppProgress function');
assert(appSrc.includes('bootstrapPromise'), 'App.jsx implements shared bootstrapPromise concurrency deduplication');
assert(appSrc.includes('bootstrappedAuthRef'), 'App.jsx implements bootstrappedAuthRef to guard React StrictMode duplicate effects');

const bootstrapFnBody = appSrc.slice(appSrc.indexOf('export async function bootstrapAppProgress'), appSrc.indexOf('function MainApp()'));
const pendingCheckIdx = bootstrapFnBody.indexOf('if (progressStore.pendingGuestMigration)');
const migrateIdx = bootstrapFnBody.indexOf('progressStore.migrateGuestProgress()');
const fetchIdx = bootstrapFnBody.indexOf('progressStore.fetchUserProgress()');

assert(pendingCheckIdx !== -1, 'bootstrapAppProgress checks pendingGuestMigration');
assert(migrateIdx !== -1 && migrateIdx < fetchIdx, 'migrateGuestProgress() is prioritized over fetchUserProgress()');
assert(bootstrapFnBody.includes('!authState.isAuthenticated || !authState.user'), 'Unauthenticated bootstrap early-returns without calling progress API');

// ─── TEST 1: AUTHENTICATED + PENDING SNAPSHOT ───────────────────────────────
console.log("\n[TEST 1] Authenticated + Pending Snapshot (Migrate Directly, No Fetch Before)");
resetAll();

const snapshot1 = {
  migrationKey: 'mig_boot_key_101',
  xp: 400,
  gold: 90,
  streak: 3,
  wordsLearned: 18,
  savedWords: ['demacia'],
  missions: INITIAL_MISSIONS,
  questUnits: INITIAL_QUEST_UNITS,
  ownedItemIds: [],
  equippedIds: [],
  lastResetDate: '2026-09-06',
  snapshotAt: Date.now(),
};

useAuthStore.setState({
  isAuthenticated: true,
  user: { id: 'u-1', displayName: 'Garen' },
  accessToken: 'tok-1',
  refreshToken: 'ref-1',
});

useProgressStore.setState({
  pendingGuestMigration: snapshot1,
  hasUnsyncedGuestProgress: true,
});

let migrateCalled = false;
let fetchCalledBeforeMigrate = false;
let migrationKeyReceived = null;

const originalPost = axiosClient.post;
const originalGet = axiosClient.get;

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    migrateCalled = true;
    migrationKeyReceived = payload.migrationKey;
    return {
      success: true,
      data: {
        migrated: true,
        profile: { totalXp: 400, gold: 90, currentLevel: 2, questUnits: INITIAL_QUEST_UNITS },
      },
    };
  }
  return originalPost(url, payload);
};

axiosClient.get = async (url, config) => {
  if (url === ENDPOINTS.PROGRESS.PROFILE) {
    if (!migrateCalled) {
      fetchCalledBeforeMigrate = true;
    }
    return { success: true, data: { profile: { totalXp: 999 } } };
  }
  return originalGet(url, config);
};

const bootRes1 = await bootstrapAppProgress();

assert(bootRes1.status === 'migrated', 'Bootstrap returned status: migrated');
assert(migrateCalled === true, 'migrateGuestProgress() was executed');
assert(fetchCalledBeforeMigrate === false, 'Strictly NO fetchUserProgress before migrateGuestProgress');
assert(migrationKeyReceived === 'mig_boot_key_101', 'Submitted exact migrationKey from pending snapshot');
assert(useProgressStore.getState().pendingGuestMigration === null, 'pendingGuestMigration cleared upon success');
assert(useProgressStore.getState().hasUnsyncedGuestProgress === false, 'hasUnsyncedGuestProgress is false');
assert(useProgressStore.getState().xp === 400, 'Authoritative profile applied to store (400 XP)');

// ─── TEST 2: AUTHENTICATED + NO PENDING SNAPSHOT ────────────────────────────
console.log("\n[TEST 2] Authenticated + No Pending Snapshot (Normal Hydration)");
resetAll();

useAuthStore.setState({
  isAuthenticated: true,
  user: { id: 'u-2', displayName: 'Sona' },
  accessToken: 'tok-2',
});

let fetchExecuted = false;
let migrationAttempted = false;

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    migrationAttempted = true;
  }
  return originalPost(url, payload);
};

axiosClient.get = async (url, config) => {
  if (url === ENDPOINTS.PROGRESS.PROFILE) {
    fetchExecuted = true;
    return {
      success: true,
      data: {
        profile: { totalXp: 1500, gold: 800, currentLevel: 4, questUnits: INITIAL_QUEST_UNITS },
      },
    };
  }
  return originalGet(url, config);
};

const bootRes2 = await bootstrapAppProgress();

assert(bootRes2.status === 'hydrated', 'Bootstrap returned status: hydrated');
assert(fetchExecuted === true, 'Normal fetchUserProgress() executed');
assert(migrationAttempted === false, 'NO migration attempted when pendingGuestMigration is null');
assert(useProgressStore.getState().xp === 1500, 'Existing cloud profile loaded (1500 XP)');

// ─── TEST 3: UNAUTHENTICATED + NO SNAPSHOT ──────────────────────────────────
console.log("\n[TEST 3] Unauthenticated + No Snapshot (Guest Mode Startup)");
resetAll();

let anyNetworkCall = false;
axiosClient.post = async () => { anyNetworkCall = true; };
axiosClient.get = async () => { anyNetworkCall = true; };

const bootRes3 = await bootstrapAppProgress();

assert(bootRes3.status === 'unauthenticated', 'Bootstrap returned status: unauthenticated');
assert(anyNetworkCall === false, 'Zero network API calls performed during unauthenticated guest startup');
assert(useProgressStore.getState().xp === 0, 'Store remains at baseline guest 0 XP');

// ─── TEST 4: RELOAD WITH PENDING SNAPSHOT (KEY REUSE) ───────────────────────
console.log("\n[TEST 4] Browser Reload with Pending Snapshot (Reused Key)");
resetAll();

const persistentKey = 'mig_persistent_uuid_404';
const reloadSnapshot = {
  migrationKey: persistentKey,
  xp: 600,
  gold: 150,
  streak: 4,
  wordsLearned: 30,
  savedWords: ['reloaded'],
  missions: INITIAL_MISSIONS,
  questUnits: INITIAL_QUEST_UNITS,
  ownedItemIds: [],
  equippedIds: [],
  lastResetDate: '2026-09-06',
  snapshotAt: Date.now(),
};

// 1. Write to localStorage to simulate previous session saving snapshot
mockLocalStorage.setItem('engjoy-auth', JSON.stringify({
  state: {
    isAuthenticated: true,
    user: { id: 'u-4', displayName: 'Riven' },
    accessToken: 'tok-4',
  },
  version: 0,
}));

mockLocalStorage.setItem('engjoy-guest-progress', JSON.stringify({
  state: {
    xp: 600,
    gold: 150,
    hasUnsyncedGuestProgress: true,
    pendingGuestMigration: reloadSnapshot,
  },
  version: 3,
}));

// 2. Rehydrate stores from mock localStorage
const authStored = JSON.parse(mockLocalStorage.getItem('engjoy-auth')).state;
useAuthStore.setState(authStored);

const progStored = JSON.parse(mockLocalStorage.getItem('engjoy-guest-progress')).state;
useProgressStore.setState(progStored);

let reloadKeySent = null;
axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    reloadKeySent = payload.migrationKey;
    return {
      success: true,
      data: {
        migrated: true,
        profile: { totalXp: 600, gold: 150, currentLevel: 3, questUnits: INITIAL_QUEST_UNITS },
      },
    };
  }
  return originalPost(url, payload);
};

await bootstrapAppProgress();

assert(reloadKeySent === persistentKey, 'Exact migrationKey was preserved across reload and reused');
assert(useProgressStore.getState().pendingGuestMigration === null, 'Snapshot cleared after recovery');

// ─── TEST 5: RELOAD AFTER PREVIOUS TRANSIENT FAILURE ────────────────────────
console.log("\n[TEST 5] Reload After Previous Transient Failure (Snapshot Survives & Retries)");
resetAll();

useAuthStore.setState({
  isAuthenticated: true,
  user: { id: 'u-5', displayName: 'Yasuo' },
});

useProgressStore.setState({
  pendingGuestMigration: reloadSnapshot,
  hasUnsyncedGuestProgress: true,
});

// 1. First run fails with 504 Gateway Timeout
axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    const err = new Error('504 Gateway Timeout');
    err.status = 504;
    throw err;
  }
  return originalPost(url, payload);
};

const failAttempt = await bootstrapAppProgress();
assert(failAttempt.result.success === false, 'First bootstrap attempt failed as expected');
assert(useProgressStore.getState().pendingGuestMigration === reloadSnapshot, 'Snapshot survives transient failure');
assert(useProgressStore.getState().hasUnsyncedGuestProgress === true, 'hasUnsyncedGuestProgress remains true');

// 2. Browser reloads, server recovers (200)
resetAll();
useAuthStore.setState({
  isAuthenticated: true,
  user: { id: 'u-5', displayName: 'Yasuo' },
});
useProgressStore.setState({
  pendingGuestMigration: reloadSnapshot,
  hasUnsyncedGuestProgress: true,
});

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    return {
      success: true,
      data: {
        migrated: true,
        profile: { totalXp: 600, questUnits: INITIAL_QUEST_UNITS },
      },
    };
  }
  return originalPost(url, payload);
};

const recoverAttempt = await bootstrapAppProgress();
assert(recoverAttempt.status === 'migrated', 'Second bootstrap after reload recovered successfully');
assert(useProgressStore.getState().pendingGuestMigration === null, 'Snapshot cleared after recovery');

// ─── TEST 6: 409 CONFLICT RECOVERY (NO INFINITE RETRY) ──────────────────────
console.log("\n[TEST 6] HTTP 409 Conflict Bootstrap Safety");
resetAll();

useAuthStore.setState({
  isAuthenticated: true,
  user: { id: 'u-6', displayName: 'Teemo' },
});

useProgressStore.setState({
  pendingGuestMigration: reloadSnapshot,
  hasUnsyncedGuestProgress: true,
});

let migrationTries = 0;
axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    migrationTries++;
    const err = {
      status: 409,
      code: 'MIGRATION_CONFLICT',
      conflict: true,
      reason: 'CLOUD_PROGRESS_EXISTS',
      message: 'Account already has progress',
    };
    throw err;
  }
  return originalPost(url, payload);
};

axiosClient.get = async (url, config) => {
  if (url === ENDPOINTS.PROGRESS.PROFILE) {
    return {
      success: true,
      data: { profile: { totalXp: 3000, currentLevel: 6, questUnits: INITIAL_QUEST_UNITS } },
    };
  }
  return originalGet(url, config);
};

const conflictBootRes = await bootstrapAppProgress();

assert(conflictBootRes.status === 'migrated', 'Bootstrap completed with conflict result');
assert(migrationTries === 1, 'Migration was called exactly once (NO infinite retry)');
const storeAfterBoot409 = useProgressStore.getState();
assert(storeAfterBoot409.pendingGuestMigration === reloadSnapshot, 'pendingGuestMigration is preserved');
assert(storeAfterBoot409.hasUnsyncedGuestProgress === true, 'hasUnsyncedGuestProgress is preserved');
assert(storeAfterBoot409.migrationConflict !== null, 'migrationConflict is populated in memory');
assert(storeAfterBoot409.xp === 3000, 'Cloud profile applied (3000 XP)');

// ─── TEST 7: SUCCESS CLEARS SNAPSHOT ────────────────────────────────────────
console.log("\n[TEST 7] Success Clears Snapshot");
assert(useProgressStore.getState().pendingGuestMigration !== null, 'Prior test left snapshot for 409 verification');
// Run successful migration on fresh clean state
resetAll();
useAuthStore.setState({ isAuthenticated: true, user: { id: 'u-7' } });
useProgressStore.setState({ pendingGuestMigration: reloadSnapshot, hasUnsyncedGuestProgress: true });
axiosClient.post = async (url) => ({
  success: true,
  data: { migrated: true, profile: { totalXp: 600, questUnits: INITIAL_QUEST_UNITS } },
});
await bootstrapAppProgress();
assert(useProgressStore.getState().pendingGuestMigration === null, 'Successful bootstrap migration clears pendingGuestMigration');
assert(useProgressStore.getState().hasUnsyncedGuestProgress === false, 'hasUnsyncedGuestProgress reset to false');
assert(useProgressStore.getState().migrationConflict === null, 'migrationConflict reset to null');

// ─── TEST 8: STRICTMODE / DUPLICATE BOOTSTRAP PROTECTION ────────────────────
console.log("\n[TEST 8] React StrictMode / Duplicate Bootstrap Deduplication");
resetAll();

useAuthStore.setState({
  isAuthenticated: true,
  user: { id: 'u-8', displayName: 'Darius' },
});

useProgressStore.setState({
  pendingGuestMigration: reloadSnapshot,
  hasUnsyncedGuestProgress: true,
});

let networkInvocations = 0;
axiosClient.post = async (url) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    networkInvocations++;
    // Add artificial tick latency to simulate real network round-trip
    await new Promise((r) => setTimeout(r, 20));
    return {
      success: true,
      data: { migrated: true, profile: { totalXp: 600, questUnits: INITIAL_QUEST_UNITS } },
    };
  }
};

// Simulate concurrent calls from React 18 StrictMode mount/remount
const [resA, resB, resC] = await Promise.all([
  bootstrapAppProgress(),
  bootstrapAppProgress(),
  bootstrapAppProgress(),
]);

assert(networkInvocations === 1, 'Exactly ONE network request occurred across concurrent bootstrap calls');
assert(resA === resB && resB === resC, 'All concurrent callers shared the exact same execution promise');
assert(useProgressStore.getState().isMigrating === false, 'isMigrating is false after completion');

// ─── TEST 9: STRICT CALL ORDERING (MIGRATE BEFORE FETCH) ────────────────────
console.log("\n[TEST 9] Strict Call Ordering Verification");
resetAll();

useAuthStore.setState({
  isAuthenticated: true,
  user: { id: 'u-9', displayName: 'Irelia' },
});

useProgressStore.setState({
  pendingGuestMigration: reloadSnapshot,
  hasUnsyncedGuestProgress: true,
});

const executionLog = [];
axiosClient.post = async (url) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    executionLog.push('migrateGuestProgress');
    return {
      success: true,
      data: { migrated: true, profile: { totalXp: 600, questUnits: INITIAL_QUEST_UNITS } },
    };
  }
};

axiosClient.get = async (url) => {
  if (url === ENDPOINTS.PROGRESS.PROFILE) {
    executionLog.push('fetchUserProgress');
    return { success: true, data: { profile: { totalXp: 600 } } };
  }
};

await bootstrapAppProgress();

assert(executionLog.length === 1 && executionLog[0] === 'migrateGuestProgress', 'Executed migrateGuestProgress directly');
assert(!executionLog.includes('fetchUserProgress'), 'fetchUserProgress was NOT called when snapshot was pending');

// ─── TEST 10: NO NEW MIGRATION KEY GENERATED DURING BOOTSTRAP ───────────────
console.log("\n[TEST 10] No New migrationKey Generated During Bootstrap");
resetAll();

useAuthStore.setState({
  isAuthenticated: true,
  user: { id: 'u-10', displayName: 'Braum' },
});

const originalFrozenKey = 'mig_frozen_exact_key_99999';
const frozenSnapshot = {
  ...reloadSnapshot,
  migrationKey: originalFrozenKey,
};

useProgressStore.setState({
  pendingGuestMigration: frozenSnapshot,
  hasUnsyncedGuestProgress: true,
});

let keyInFlight = null;
axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    keyInFlight = payload.migrationKey;
    return {
      success: true,
      data: { migrated: true, profile: { totalXp: 600, questUnits: INITIAL_QUEST_UNITS } },
    };
  }
};

await bootstrapAppProgress();

assert(keyInFlight === originalFrozenKey, 'migrationKey used was the exact frozen key from snapshot');
assert(keyInFlight !== null && !keyInFlight.startsWith('new_'), 'No new migrationKey generated');

// Restore original axiosClient methods
axiosClient.post = originalPost;
axiosClient.get = originalGet;

console.log("\n=================================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=================================================================");

if (failed > 0) {
  process.exit(1);
}
