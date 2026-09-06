/**
 * PHASE 2C.4B — REGISTER / LOGIN GUEST MIGRATION ORCHESTRATION TEST SUITE
 * 
 * Tests authentication-boundary orchestration in:
 * - frontend/src/pages/Register.jsx
 * - frontend/src/pages/Login.jsx
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
console.log("  PHASE 2C.4B — REGISTER / LOGIN MIGRATION ORCHESTRATION SUITE   ");
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

// Mock authApi object for testing
const mockAuthApi = {
  register: async () => {},
  login: async () => {},
};

// Orchestration Runner executing the exact sequence from Register.jsx handleSubmit
async function runRegisterHandler({ displayName, email, password, selectedChamp = 'Lux', navigate }) {
  // 1. Ranh giới Guest: Capture snapshot TRƯỚC KHI thực hiện xác thực
  const pendingSnapshot =
    useProgressStore.getState().capturePendingGuestMigration() ||
    useProgressStore.getState().pendingGuestMigration;

  // 2. Thực hiện đăng ký tài khoản qua authApi
  const res = await mockAuthApi.register({
    displayName: displayName.trim(),
    email: email.trim(),
    password,
  });

  if (res?.data) {
    const { user, accessToken, refreshToken } = res.data;
    const enhancedUser = {
      ...user,
      champion: selectedChamp,
    };

    // 3. Chuyển authStore sang trạng thái authenticated
    useAuthStore.getState().setAuth(enhancedUser, accessToken, refreshToken);

    // 4. Nếu có tiến trình Guest chờ migration, tiến hành migrate ngay
    if (pendingSnapshot) {
      await useProgressStore.getState().migrateGuestProgress();
    } else {
      // 5. Nếu không có snapshot Khách, nạp tiến trình người dùng bình thường
      await useProgressStore.getState().fetchUserProgress();
    }

    // 6. Điều hướng sau khi toàn bộ quy trình hydration / migration hoàn tất
    if (navigate) {
      navigate('/');
    }
  }
}

// Orchestration Runner executing the exact sequence from Login.jsx handleSubmit
async function runLoginHandler({ email, password, navigate }) {
  // 1. Ranh giới Guest: Capture snapshot TRƯỚC KHI thực hiện đăng nhập
  const pendingSnapshot =
    useProgressStore.getState().capturePendingGuestMigration() ||
    useProgressStore.getState().pendingGuestMigration;

  // 2. Thực hiện đăng nhập tài khoản qua authApi
  const res = await mockAuthApi.login({
    email: email.trim(),
    password,
  });

  if (res?.data) {
    const { user, accessToken, refreshToken } = res.data;

    // 3. Chuyển authStore sang trạng thái authenticated
    useAuthStore.getState().setAuth(user, accessToken, refreshToken);

    // 4. Nếu có tiến trình Guest chờ migration, tiến hành migrate ngay (KHÔNG fetchUserProgress trước!)
    if (pendingSnapshot) {
      await useProgressStore.getState().migrateGuestProgress();
    } else {
      // 5. Nếu không có snapshot Khách, nạp tiến trình người dùng bình thường
      await useProgressStore.getState().fetchUserProgress();
    }

    // 6. Điều hướng sau khi toàn bộ quy trình hydration / migration hoàn tất
    if (navigate) {
      navigate('/');
    }
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
  mockLocalStorage.clear();
}

// ─── STATIC AUDIT OF REGISTER.JSX AND LOGIN.JSX SOURCE FILES ────────────────
console.log("[STATIC SOURCE CODE AUDIT] Invariant Verification in Source Files");
const regSrc = fs.readFileSync('./src/pages/Register.jsx', 'utf8');
const loginSrc = fs.readFileSync('./src/pages/Login.jsx', 'utf8');

// Register Source checks
const regCaptureIdx = regSrc.indexOf('capturePendingGuestMigration');
const regAuthIdx = regSrc.indexOf('authApi.register');
const regSetAuthIdx = regSrc.indexOf('setAuth(');
const regMigrateIdx = regSrc.indexOf('migrateGuestProgress');
const regFetchIdx = regSrc.indexOf('fetchUserProgress');

assert(regCaptureIdx !== -1 && regCaptureIdx < regAuthIdx, 'Register.jsx: capturePendingGuestMigration() is called BEFORE authApi.register()');
assert(regAuthIdx < regSetAuthIdx, 'Register.jsx: authApi.register() completes BEFORE setAuth()');
assert(regSetAuthIdx < regMigrateIdx, 'Register.jsx: setAuth() is called BEFORE migrateGuestProgress()');
assert(regMigrateIdx < regSrc.indexOf("navigate('/')"), 'Register.jsx: migrateGuestProgress() completes BEFORE navigate()');
assert(regSrc.includes('if (loading) return;'), 'Register.jsx: Double submit guard (loading) is present');

// Login Source checks
const loginCaptureIdx = loginSrc.indexOf('capturePendingGuestMigration');
const loginAuthIdx = loginSrc.indexOf('authApi.login');
const loginSetAuthIdx = loginSrc.indexOf('setAuth(');
const loginMigrateIdx = loginSrc.indexOf('migrateGuestProgress');
const loginFetchIdx = loginSrc.indexOf('fetchUserProgress');

assert(loginCaptureIdx !== -1 && loginCaptureIdx < loginAuthIdx, 'Login.jsx: capturePendingGuestMigration() is called BEFORE authApi.login()');
assert(loginAuthIdx < loginSetAuthIdx, 'Login.jsx: authApi.login() completes BEFORE setAuth()');
assert(loginSetAuthIdx < loginMigrateIdx, 'Login.jsx: setAuth() is called BEFORE migrateGuestProgress()');
assert(loginMigrateIdx < loginSrc.indexOf("navigate('/')"), 'Login.jsx: migrateGuestProgress() completes BEFORE navigate()');
assert(loginSrc.includes('if (loading) return;'), 'Login.jsx: Double submit guard (loading) is present');

// ─── GROUP 1: REGISTER WITH GUEST PROGRESS ──────────────────────────────────
console.log("\n[GROUP 1] Register with Guest Progress");
resetAll();

useProgressStore.setState({
  xp: 350,
  gold: 75,
  streak: 3,
  wordsLearned: 15,
  savedWords: ['nexus', 'champion'],
  hasUnsyncedGuestProgress: true,
});

let navigatedTo = null;
const mockNavigate = (path) => { navigatedTo = path; };

let regPostUrl = null;
let migrationKeySent = null;
let snapshotCapturedBeforeAuth = null;

mockAuthApi.register = async (payload) => {
  snapshotCapturedBeforeAuth = useProgressStore.getState().pendingGuestMigration;
  return {
    success: true,
    data: {
      user: { id: 'u-101', email: 'lux@demacia.com', displayName: 'Luxanna' },
      accessToken: 'acc-tok-101',
      refreshToken: 'ref-tok-101',
    },
  };
};

const originalPost = axiosClient.post;
axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    regPostUrl = url;
    migrationKeySent = payload.migrationKey;
    return {
      success: true,
      data: {
        migrated: true,
        profile: {
          totalXp: 350,
          currentLevel: 2,
          gold: 75,
          streakDays: 3,
          wordsLearned: 15,
          savedWords: ['nexus', 'champion'],
          ownedItemIds: [],
          equippedIds: [],
          questUnits: INITIAL_QUEST_UNITS,
        },
        summary: { xpMerged: 350, goldMerged: 75 },
      },
    };
  }
  return originalPost(url, payload);
};

await runRegisterHandler({
  displayName: 'Luxanna',
  email: 'lux@demacia.com',
  password: 'Password123!',
  selectedChamp: 'Lux',
  navigate: mockNavigate,
});

assert(snapshotCapturedBeforeAuth !== null, 'Guest snapshot was captured BEFORE authApi.register executed');
assert(typeof snapshotCapturedBeforeAuth.migrationKey === 'string', 'Captured snapshot contained a valid migrationKey');
assert(snapshotCapturedBeforeAuth.xp === 350, 'Captured snapshot contained accurate guest XP (350)');
assert(useAuthStore.getState().isAuthenticated === true, 'setAuth was invoked on successful registration');
assert(useAuthStore.getState().user?.champion === 'Lux', 'User has selected champion attached');
assert(regPostUrl === '/progress/migrate-guest', 'migrateGuestProgress() was invoked via /progress/migrate-guest');
assert(migrationKeySent === snapshotCapturedBeforeAuth.migrationKey, 'Migration API request reused the exact migrationKey from captured snapshot');
assert(useProgressStore.getState().xp === 350, 'Authoritative server profile applied to store');
assert(useProgressStore.getState().pendingGuestMigration === null, 'pendingGuestMigration cleared to null after migration success');
assert(useProgressStore.getState().hasUnsyncedGuestProgress === false, 'hasUnsyncedGuestProgress set to false after migration success');
assert(navigatedTo === '/', 'Navigation occurs after migration has completed');

// ─── GROUP 2: LOGIN WITH GUEST PROGRESS ─────────────────────────────────────
console.log("\n[GROUP 2] Login with Guest Progress");
resetAll();

useProgressStore.setState({
  xp: 450,
  gold: 120,
  streak: 5,
  wordsLearned: 20,
  savedWords: ['shadow', 'blade'],
  hasUnsyncedGuestProgress: true,
});

navigatedTo = null;
let loginPostUrl = null;
let loginMigrationKeySent = null;
let snapshotCapturedBeforeLoginAuth = null;

mockAuthApi.login = async (payload) => {
  snapshotCapturedBeforeLoginAuth = useProgressStore.getState().pendingGuestMigration;
  return {
    success: true,
    data: {
      user: { id: 'u-102', email: 'zed@shadow.com', displayName: 'Zed' },
      accessToken: 'acc-tok-102',
      refreshToken: 'ref-tok-102',
    },
  };
};

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    loginPostUrl = url;
    loginMigrationKeySent = payload.migrationKey;
    return {
      success: true,
      data: {
        migrated: true,
        profile: {
          totalXp: 450,
          currentLevel: 2,
          gold: 120,
          streakDays: 5,
          wordsLearned: 20,
          savedWords: ['shadow', 'blade'],
          ownedItemIds: [],
          equippedIds: [],
          questUnits: INITIAL_QUEST_UNITS,
        },
      },
    };
  }
  return originalPost(url, payload);
};

await runLoginHandler({
  email: 'zed@shadow.com',
  password: 'Password123!',
  navigate: mockNavigate,
});

assert(snapshotCapturedBeforeLoginAuth !== null, 'Guest snapshot was captured BEFORE authApi.login executed');
assert(typeof snapshotCapturedBeforeLoginAuth.migrationKey === 'string', 'Captured snapshot contained valid migrationKey');
assert(useAuthStore.getState().isAuthenticated === true, 'setAuth was invoked on successful login');
assert(loginPostUrl === '/progress/migrate-guest', 'migrateGuestProgress() was invoked via /progress/migrate-guest');
assert(loginMigrationKeySent === snapshotCapturedBeforeLoginAuth.migrationKey, 'Same migrationKey reused in login migration request');
assert(useProgressStore.getState().xp === 450, 'Authoritative server profile applied after login migration');
assert(useProgressStore.getState().pendingGuestMigration === null, 'pendingGuestMigration cleared to null after login migration success');
assert(navigatedTo === '/', 'Navigation occurs after login migration completes');

// ─── GROUP 3: EXISTING PENDING SNAPSHOT (REUSE / IDEMPOTENCY) ───────────────
console.log("\n[GROUP 3] Existing Pending Snapshot Reused (No Duplicate / Key Generation)");
resetAll();

const preExistingKey = 'mig_preexisting_uuid_777';
const preExistingSnapshot = {
  migrationKey: preExistingKey,
  xp: 500,
  gold: 150,
  streak: 2,
  wordsLearned: 25,
  savedWords: ['archived'],
  missions: INITIAL_MISSIONS,
  questUnits: INITIAL_QUEST_UNITS,
  ownedItemIds: [],
  equippedIds: [],
  lastResetDate: '2026-09-06',
  snapshotAt: 1700000000000,
};

useProgressStore.setState({
  pendingGuestMigration: preExistingSnapshot,
  hasUnsyncedGuestProgress: true,
});

let keyUsedInRegister = null;
mockAuthApi.register = async () => ({
  success: true,
  data: { user: { id: 'u-103' }, accessToken: 'tok-103', refreshToken: 'ref-103' },
});

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    keyUsedInRegister = payload.migrationKey;
    return {
      success: true,
      data: {
        migrated: true,
        profile: { totalXp: 500, gold: 150, questUnits: INITIAL_QUEST_UNITS },
      },
    };
  }
  return originalPost(url, payload);
};

await runRegisterHandler({
  displayName: 'Ahri',
  email: 'ahri@ionia.com',
  password: 'Password123!',
  selectedChamp: 'Ahri',
  navigate: mockNavigate,
});

assert(keyUsedInRegister === preExistingKey, 'Pre-existing pending snapshot was reused without generating a new migrationKey');

// ─── GROUP 4: NO GUEST PROGRESS (FRESH ACCOUNT HYDRATION) ───────────────────
console.log("\n[GROUP 4] No Guest Progress (Normal Auth Hydration)");
resetAll();

let migrationCalledWhenZeroGuest = false;
let normalProfileFetchCalled = false;

mockAuthApi.login = async () => ({
  success: true,
  data: { user: { id: 'u-104', displayName: 'Ashe' }, accessToken: 'tok-104', refreshToken: 'ref-104' },
});

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    migrationCalledWhenZeroGuest = true;
  }
  return originalPost(url, payload);
};

const originalGet = axiosClient.get;
axiosClient.get = async (url, config) => {
  if (url === ENDPOINTS.PROGRESS.PROFILE) {
    normalProfileFetchCalled = true;
    return {
      success: true,
      data: {
        profile: {
          totalXp: 1200,
          currentLevel: 4,
          gold: 600,
          questUnits: INITIAL_QUEST_UNITS,
        },
      },
    };
  }
  return originalGet(url, config);
};

await runLoginHandler({
  email: 'ashe@freljord.com',
  password: 'Password123!',
  navigate: mockNavigate,
});

assert(useProgressStore.getState().pendingGuestMigration === null, 'No migration snapshot created when user has 0 guest progress');
assert(migrationCalledWhenZeroGuest === false, 'NO migration API request sent when no guest progress existed');
assert(normalProfileFetchCalled === true, 'Normal fetchUserProgress() executed to hydrate existing cloud profile');
assert(useProgressStore.getState().xp === 1200, 'Cloud profile loaded successfully (1200 XP)');

// ─── GROUP 5: 409 CONFLICT RESILIENCE ───────────────────────────────────────
console.log("\n[GROUP 5] HTTP 409 Conflict Safety (Preserve Snapshot & Key)");
resetAll();

const conflictSnapshot = {
  migrationKey: 'mig_conflict_key_999',
  xp: 300,
  gold: 80,
  streak: 1,
  wordsLearned: 10,
  savedWords: ['conflict_word'],
  missions: INITIAL_MISSIONS,
  questUnits: INITIAL_QUEST_UNITS,
  ownedItemIds: [],
  equippedIds: [],
  lastResetDate: '2026-09-06',
  snapshotAt: Date.now(),
};

useProgressStore.setState({
  pendingGuestMigration: conflictSnapshot,
  hasUnsyncedGuestProgress: true,
});

mockAuthApi.login = async () => ({
  success: true,
  data: { user: { id: 'u-105' }, accessToken: 'tok-105', refreshToken: 'ref-105' },
});

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    const err = {
      status: 409,
      code: 'MIGRATION_CONFLICT',
      conflict: true,
      reason: 'CLOUD_PROGRESS_EXISTS',
      existingSummary: { totalXp: 2000, gold: 900 },
      guestSummary: { xp: 300, gold: 80 },
      message: 'Tài khoản đã có tiến trình trên máy chủ',
    };
    throw err;
  }
  return originalPost(url, payload);
};

axiosClient.get = async (url, config) => {
  if (url === ENDPOINTS.PROGRESS.PROFILE) {
    return {
      success: true,
      data: {
        profile: {
          totalXp: 2000,
          currentLevel: 5,
          gold: 900,
          questUnits: INITIAL_QUEST_UNITS,
        },
      },
    };
  }
  return originalGet(url, config);
};

await runLoginHandler({
  email: 'ekko@zaun.com',
  password: 'Password123!',
  navigate: mockNavigate,
});

assert(useAuthStore.getState().isAuthenticated === true, 'User remains authenticated on 409 conflict');
const storeAfter409 = useProgressStore.getState();
assert(storeAfter409.pendingGuestMigration !== null, 'pendingGuestMigration is STRICTLY PRESERVED on 409 (Invariant C4-B7)');
assert(storeAfter409.pendingGuestMigration.migrationKey === 'mig_conflict_key_999', 'migrationKey is preserved intact');
assert(storeAfter409.hasUnsyncedGuestProgress === true, 'hasUnsyncedGuestProgress remains true');
assert(storeAfter409.migrationConflict !== null, 'migrationConflict is populated with conflict details');
assert(storeAfter409.migrationConflict.code === 'MIGRATION_CONFLICT', 'migrationConflict contains code');
assert(storeAfter409.xp === 2000, 'Authoritative cloud profile hydrated into store on 409 (2000 XP)');

// ─── GROUP 6: TRANSIENT MIGRATION FAILURE (NETWORK / 500 / 400) ─────────────
console.log("\n[GROUP 6] Transient Migration Failure (Network / 500)");
resetAll();

useProgressStore.setState({
  pendingGuestMigration: conflictSnapshot,
  hasUnsyncedGuestProgress: true,
});

mockAuthApi.register = async () => ({
  success: true,
  data: { user: { id: 'u-106' }, accessToken: 'tok-106', refreshToken: 'ref-106' },
});

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    const err = new Error('500 Internal Server Error');
    err.status = 500;
    throw err;
  }
  return originalPost(url, payload);
};

navigatedTo = null;
await runRegisterHandler({
  displayName: 'Ekko',
  email: 'ekko@zaun.com',
  password: 'Password123!',
  selectedChamp: 'Ekko',
  navigate: mockNavigate,
});

assert(useAuthStore.getState().isAuthenticated === true, 'User remains authenticated');
const storeAfter500 = useProgressStore.getState();
assert(storeAfter500.pendingGuestMigration === conflictSnapshot, 'pendingGuestMigration preserved on network/500 failure');
assert(storeAfter500.pendingGuestMigration.migrationKey === 'mig_conflict_key_999', 'migrationKey preserved on failure');
assert(storeAfter500.hasUnsyncedGuestProgress === true, 'hasUnsyncedGuestProgress remains true for future retry');
assert(navigatedTo === '/', 'Navigation occurs after flow completion (does not block user access)');

// ─── GROUP 7: EXACT CALL ORDERING VERIFICATION ──────────────────────────────
console.log("\n[GROUP 7] Strict Orchestration Sequence Verification (Invariant C4-B10)");
resetAll();

useProgressStore.setState({
  xp: 150,
  gold: 30,
  hasUnsyncedGuestProgress: true,
});

const callLog = [];

// Instrument capturePendingGuestMigration
const originalCapture = useProgressStore.getState().capturePendingGuestMigration;
useProgressStore.getState().capturePendingGuestMigration = () => {
  callLog.push({ call: 'capturePendingGuestMigration', auth: useAuthStore.getState().isAuthenticated });
  return originalCapture();
};

// Instrument authApi.register
mockAuthApi.register = async (payload) => {
  callLog.push({ call: 'authApi.register', auth: useAuthStore.getState().isAuthenticated });
  return {
    success: true,
    data: { user: { id: 'u-200' }, accessToken: 'tok-200', refreshToken: 'ref-200' },
  };
};

// Instrument setAuth
const originalSetAuth = useAuthStore.getState().setAuth;
useAuthStore.getState().setAuth = (...args) => {
  callLog.push({ call: 'setAuth' });
  return originalSetAuth(...args);
};

// Instrument migrateGuestProgress
const originalMigrate = useProgressStore.getState().migrateGuestProgress;
useProgressStore.getState().migrateGuestProgress = async (...args) => {
  callLog.push({ call: 'migrateGuestProgress', auth: useAuthStore.getState().isAuthenticated });
  return originalMigrate(...args);
};

// Instrument fetchUserProgress
const originalFetch = useProgressStore.getState().fetchUserProgress;
useProgressStore.getState().fetchUserProgress = async (...args) => {
  callLog.push({ call: 'fetchUserProgress', auth: useAuthStore.getState().isAuthenticated });
  return originalFetch(...args);
};

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    return {
      success: true,
      data: { migrated: true, profile: { totalXp: 150, questUnits: INITIAL_QUEST_UNITS } },
    };
  }
  return originalPost(url, payload);
};

await runRegisterHandler({
  displayName: 'Katarina',
  email: 'kat@noxus.com',
  password: 'Password123!',
  selectedChamp: 'Zed',
  navigate: (path) => { callLog.push({ call: 'navigate', path }); },
});

console.log("  Executed Call Sequence:");
callLog.forEach((entry, idx) => {
  console.log(`    ${idx + 1}. ${entry.call}${entry.auth !== undefined ? ` (auth=${entry.auth})` : ''}${entry.path ? ` -> ${entry.path}` : ''}`);
});

// Verify sequence: capture -> auth -> setAuth -> migrate -> navigate
assert(callLog[0].call === 'capturePendingGuestMigration' && callLog[0].auth === false, '1. capturePendingGuestMigration ran FIRST while unauthenticated (auth=false)');
assert(callLog[1].call === 'authApi.register' && callLog[1].auth === false, '2. authApi.register ran SECOND while unauthenticated');
assert(callLog[2].call === 'setAuth', '3. setAuth ran THIRD on auth success');
assert(callLog[3].call === 'migrateGuestProgress' && callLog[3].auth === true, '4. migrateGuestProgress ran FOURTH while authenticated (auth=true)');
assert(callLog[4].call === 'navigate' && callLog[4].path === '/', '5. navigate ran FIFTH after migration completed');

const hasIllegalFetchBeforeMigrate = callLog.some((e, i) => e.call === 'fetchUserProgress' && i < 3);
assert(hasIllegalFetchBeforeMigrate === false, 'Invariant C4-B10: Strictly NO fetchUserProgress before migrateGuestProgress');

const anyFetchUserProgressWhenPending = callLog.some((e) => e.call === 'fetchUserProgress');
assert(anyFetchUserProgressWhenPending === false, 'No fetchUserProgress at all when pending guest snapshot was present');

// Restore mocks
axiosClient.post = originalPost;
axiosClient.get = originalGet;
useProgressStore.getState().capturePendingGuestMigration = originalCapture;
useProgressStore.getState().migrateGuestProgress = originalMigrate;
useProgressStore.getState().fetchUserProgress = originalFetch;
useAuthStore.getState().setAuth = originalSetAuth;

console.log("\n=================================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=================================================================");

if (failed > 0) {
  process.exit(1);
}
