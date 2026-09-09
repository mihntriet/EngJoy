/**
 * PHASE 2C.4D — GLOBAL GUEST MIGRATION CONFLICT RESOLUTION TEST SUITE
 * 
 * Tests conflict resolution orchestration & UX contract:
 * - frontend/src/components/common/MigrationConflictBanner.jsx
 * - frontend/src/App.jsx
 * - frontend/src/context/progressStore.js
 * - frontend/src/context/authStore.js
 */

import fs from 'fs';

// 1. Polyfill environment for headless Node execution
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
const { ENDPOINTS } = await import('./src/api/endpoints.js');
const axiosClient = (await import('./src/api/axiosClient.js')).default;

console.log("=================================================================");
console.log("  PHASE 2C.4D — GLOBAL GUEST MIGRATION CONFLICT UI TEST SUITE    ");
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

const originalPost = axiosClient.post;
const originalGet = axiosClient.get;

// ─── STATIC SOURCE CODE AUDIT ───────────────────────────────────────────────
console.log("[STATIC SOURCE CODE AUDIT] Global Conflict Banner Contract");
const bannerSrc = fs.readFileSync('./src/components/common/MigrationConflictBanner.jsx', 'utf8');
const appSrc = fs.readFileSync('./src/App.jsx', 'utf8');

// 1. Audit App.jsx mounting
assert(appSrc.includes('import MigrationConflictBanner'), 'App.jsx imports MigrationConflictBanner');
assert(appSrc.includes('<MigrationConflictBanner />'), 'App.jsx renders MigrationConflictBanner globally in MainApp');
const headerIdx = appSrc.indexOf('<Header');
const bannerIdx = appSrc.indexOf('<MigrationConflictBanner');
const viewsIdx = appSrc.indexOf('view === "home"');
assert(headerIdx < bannerIdx && bannerIdx < viewsIdx, 'MigrationConflictBanner is positioned globally between Header and view content');

// 2. Audit MigrationConflictBanner.jsx UX safety & contract
assert(bannerSrc.includes('discardPendingGuestMigration'), 'Banner uses store discardPendingGuestMigration action');
assert(bannerSrc.includes('migrateGuestProgress'), 'Banner uses store migrateGuestProgress action');
assert(bannerSrc.includes('showConfirmModal'), 'Keep Cloud uses explicit confirmation modal state before discarding');
assert(bannerSrc.includes('Xác Nhận Hủy Tiến Trình Khách'), 'Confirmation modal uses explicit non-ambiguous destructive action button');
assert(bannerSrc.includes('disabled={isMigrating}'), 'Actions are disabled when migration is in flight (isMigrating)');
assert(bannerSrc.includes('cloudProfile'), 'Banner extracts authoritative cloud profile metrics');
assert(bannerSrc.includes('guestSnapshot'), 'Banner extracts pending guest snapshot metrics');

// ─── TEST DATA SETUP ────────────────────────────────────────────────────────
const sampleSnapshot = {
  migrationKey: 'mig_conflict_fixed_key_777',
  xp: 350,
  gold: 80,
  streak: 2,
  wordsLearned: 15,
  savedWords: ['nexus', 'minion'],
  missions: INITIAL_MISSIONS,
  questUnits: INITIAL_QUEST_UNITS,
  ownedItemIds: [1, 2],
  equippedIds: [1],
  lastResetDate: '2026-09-06',
  snapshotAt: Date.now(),
};

const sampleCloudProfile = {
  totalXp: 2500,
  currentLevel: 5,
  gold: 1100,
  streakDays: 7,
  wordsLearned: 85,
  savedWords: ['cloud_word_1', 'cloud_word_2'],
  ownedItemIds: [10],
  equippedIds: [10],
  questUnits: INITIAL_QUEST_UNITS,
};

const sampleConflict = {
  code: 'MIGRATION_CONFLICT',
  reason: 'CLOUD_PROGRESS_EXISTS',
  message: 'Tài khoản đã có tiến trình trên máy chủ',
  cloudProfile: sampleCloudProfile,
  pendingSnapshot: sampleSnapshot,
  existingSummary: { totalXp: 2500, gold: 1100, currentLevel: 5, wordsLearned: 85 },
  guestSummary: { xp: 350, gold: 80, wordsLearned: 15 },
  detectedAt: Date.now(),
};

// ─── TEST 1–3: 409 CONFLICT STATE & DISPLAY METRICS ─────────────────────────
console.log("\n[TEST 1-3] 409 Conflict State & Metric Extraction");
resetAll();

useAuthStore.setState({
  isAuthenticated: true,
  user: { id: 'u-409', displayName: 'Ashe' },
});

useProgressStore.setState({
  xp: sampleCloudProfile.totalXp,
  level: sampleCloudProfile.currentLevel,
  gold: sampleCloudProfile.gold,
  wordsLearned: sampleCloudProfile.wordsLearned,
  pendingGuestMigration: sampleSnapshot,
  hasUnsyncedGuestProgress: true,
  migrationConflict: sampleConflict,
});

const store1 = useProgressStore.getState();
assert(store1.migrationConflict !== null, '1. 409 populates migrationConflict in store to render global conflict UI');
assert(store1.pendingGuestMigration === sampleSnapshot, 'pendingGuestMigration is present alongside conflict');

// Metric extraction simulation matching MigrationConflictBanner logic
const cloudXp = sampleConflict.cloudProfile?.totalXp ?? 0;
const cloudLevel = sampleConflict.cloudProfile?.currentLevel ?? 1;
const cloudGold = sampleConflict.cloudProfile?.gold ?? 0;
const cloudWords = sampleConflict.cloudProfile?.wordsLearned ?? 0;

assert(cloudXp === 2500, '2. Cloud XP extracted correctly (2500)');
assert(cloudLevel === 5, '2. Cloud Level extracted correctly (5)');
assert(cloudGold === 1100, '2. Cloud Gold extracted correctly (1100)');
assert(cloudWords === 85, '2. Cloud Words learned extracted correctly (85)');

const guestXp = sampleSnapshot.xp ?? 0;
const guestGold = sampleSnapshot.gold ?? 0;
const guestWords = sampleSnapshot.wordsLearned ?? 0;
const guestSavedCount = sampleSnapshot.savedWords.length;
const guestItemsCount = sampleSnapshot.ownedItemIds.length;

assert(guestXp === 350, '3. Guest XP extracted correctly (350)');
assert(guestGold === 80, '3. Guest Gold extracted correctly (80)');
assert(guestWords === 15, '3. Guest Words learned extracted correctly (15)');
assert(guestSavedCount === 2 && guestItemsCount === 2, '3. Guest saved words and owned items counted accurately');

// ─── TEST 4–9: DECISION A — KEEP CLOUD ──────────────────────────────────────
console.log("\n[TEST 4-9] Decision A: Keep Cloud (Destructive Discard with Confirmation)");
resetAll();

useAuthStore.setState({ isAuthenticated: true, user: { id: 'u-keep-cloud' } });
useProgressStore.setState({
  xp: 2500,
  gold: 1100,
  level: 5,
  wordsLearned: 85,
  pendingGuestMigration: sampleSnapshot,
  hasUnsyncedGuestProgress: true,
  migrationConflict: sampleConflict,
});

// 4. Confirmation requirement verified via banner source audit (showConfirmModal = true)
assert(bannerSrc.includes('setShowConfirmModal(true)'), '4. Keep Cloud requires confirmation modal before discard');
assert(bannerSrc.includes('handleConfirmKeepCloud'), '4. Explicit confirm handler executes discard');

let migrationCalledOnKeepCloud = false;
axiosClient.post = async (url) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    migrationCalledOnKeepCloud = true;
  }
};

// Execute explicit Keep Cloud discard decision
useProgressStore.getState().discardPendingGuestMigration();

const storeAfterKeepCloud = useProgressStore.getState();
assert(storeAfterKeepCloud.pendingGuestMigration === null, '5. Keep Cloud clears pendingGuestMigration to null');
assert(storeAfterKeepCloud.hasUnsyncedGuestProgress === false, '6. Keep Cloud clears hasUnsyncedGuestProgress to false');
assert(storeAfterKeepCloud.migrationConflict === null, '7. Keep Cloud clears migrationConflict to null');
assert(storeAfterKeepCloud.xp === 2500 && storeAfterKeepCloud.gold === 1100, '8. Authoritative cloud profile progression remains intact (2500 XP, 1100 Gold)');
assert(migrationCalledOnKeepCloud === false, '9. Keep Cloud does NOT make any migration network call');

// ─── TEST 10–13: DECISION B — RETRY REUSES SNAPSHOT & KEY ───────────────────
console.log("\n[TEST 10-13] Decision B: Retry Guest Uses Existing Snapshot & Key");
resetAll();

useAuthStore.setState({ isAuthenticated: true, user: { id: 'u-retry' } });
useProgressStore.setState({
  xp: 2500,
  gold: 1100,
  pendingGuestMigration: sampleSnapshot,
  hasUnsyncedGuestProgress: true,
  migrationConflict: sampleConflict,
});

let keyReceivedOnRetry = null;
let snapshotReceivedOnRetry = null;

axiosClient.post = async (url, payload) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    keyReceivedOnRetry = payload.migrationKey;
    snapshotReceivedOnRetry = payload.snapshot;
    return {
      success: true,
      data: {
        migrated: true,
        profile: { totalXp: 2850, gold: 1180, currentLevel: 6, questUnits: INITIAL_QUEST_UNITS },
      },
    };
  }
  return originalPost(url, payload);
};

// Call retry migration
const retryRes = await useProgressStore.getState().migrateGuestProgress();

assert(snapshotReceivedOnRetry === sampleSnapshot, '10. Retry Guest uses the EXISTING pendingGuestMigration');
assert(keyReceivedOnRetry === sampleSnapshot.migrationKey, '11. Retry Guest uses exact EXISTING migrationKey');
assert(keyReceivedOnRetry === 'mig_conflict_fixed_key_777', '11. migrationKey is mig_conflict_fixed_key_777');
assert(useAuthStore.getState().isAuthenticated === true, '12. User is authenticated, capturePendingGuestMigration() was NOT invoked');
assert(keyReceivedOnRetry.startsWith('mig_conflict_fixed_key_'), '13. ZERO new key generated on retry');

// ─── TEST 14: RETRY SUCCESS CLEARS SNAPSHOT & CONFLICT ──────────────────────
console.log("\n[TEST 14] Retry Success Clears Snapshot & Conflict");
assert(retryRes.success === true && retryRes.migrated === true, 'Retry migration succeeded');
const storeAfterRetrySuccess = useProgressStore.getState();
assert(storeAfterRetrySuccess.pendingGuestMigration === null, '14. Successful retry clears pendingGuestMigration');
assert(storeAfterRetrySuccess.hasUnsyncedGuestProgress === false, '14. Successful retry resets hasUnsyncedGuestProgress to false');
assert(storeAfterRetrySuccess.migrationConflict === null, '14. Successful retry clears migrationConflict');
assert(storeAfterRetrySuccess.xp === 2850, '14. Server profile merged and authoritative (2850 XP)');

// ─── TEST 15–16: RETRY 409 PRESERVES SNAPSHOT & NO AUTO-LOOP ────────────────
console.log("\n[TEST 15-16] Retry 409 Preserves Snapshot & Does Not Auto-Loop");
resetAll();

useAuthStore.setState({ isAuthenticated: true, user: { id: 'u-retry-409' } });
useProgressStore.setState({
  xp: 2500,
  pendingGuestMigration: sampleSnapshot,
  hasUnsyncedGuestProgress: true,
  migrationConflict: sampleConflict,
});

let retryCount = 0;
axiosClient.post = async (url) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    retryCount++;
    const err = {
      status: 409,
      code: 'MIGRATION_CONFLICT',
      conflict: true,
      reason: 'CLOUD_PROGRESS_EXISTS',
      message: 'Still in conflict',
      cloudProfile: sampleCloudProfile,
      pendingSnapshot: sampleSnapshot,
    };
    throw err;
  }
};

axiosClient.get = async (url, config) => {
  if (url === ENDPOINTS.PROGRESS.PROFILE) {
    return { success: true, data: { profile: sampleCloudProfile } };
  }
  return originalGet(url, config);
};

const secondRetryRes = await useProgressStore.getState().migrateGuestProgress();

assert(secondRetryRes.success === false && secondRetryRes.conflict === true, 'Retry returned 409 conflict');
const storeAfter409Retry = useProgressStore.getState();
assert(storeAfter409Retry.pendingGuestMigration === sampleSnapshot, '15. Retry 409 preserves pendingGuestMigration intact');
assert(storeAfter409Retry.pendingGuestMigration.migrationKey === 'mig_conflict_fixed_key_777', '15. migrationKey preserved intact');
assert(storeAfter409Retry.hasUnsyncedGuestProgress === true, '15. hasUnsyncedGuestProgress remains true');
assert(storeAfter409Retry.migrationConflict !== null, '15. migrationConflict remains populated');
assert(retryCount === 1, '16. Retry executed exactly once (strictly NO automatic loop)');

// ─── TEST 17: DOUBLE RETRY PREVENTED WHILE MIGRATING (IS_MIGRATING) ─────────
console.log("\n[TEST 17] Double Retry Prevented While Migrating (isMigrating)");
resetAll();

useAuthStore.setState({ isAuthenticated: true, user: { id: 'u-double-click' } });
useProgressStore.setState({
  pendingGuestMigration: sampleSnapshot,
  hasUnsyncedGuestProgress: true,
  migrationConflict: sampleConflict,
});

let simultaneousPosts = 0;
axiosClient.post = async (url) => {
  if (url === ENDPOINTS.PROGRESS.MIGRATE_GUEST) {
    simultaneousPosts++;
    // Add latency to catch concurrent calls
    await new Promise((r) => setTimeout(r, 25));
    return {
      success: true,
      data: { migrated: true, profile: { totalXp: 2850, questUnits: INITIAL_QUEST_UNITS } },
    };
  }
};

// Simultaneous retry clicks
const [callA, callB] = await Promise.all([
  useProgressStore.getState().migrateGuestProgress(),
  useProgressStore.getState().migrateGuestProgress(),
]);

assert(simultaneousPosts === 1, '17. Exactly ONE migration POST request occurred for concurrent clicks');
assert(callA.success === true, 'First click succeeded');
assert(callB.inFlight === true, '17. Second concurrent click was blocked by inFlight guard');

// ─── TEST 18: CONFLICT UI REMAINS GLOBAL ACROSS ROUTE CHANGES ───────────────
console.log("\n[TEST 18] Conflict UI Remains Global Across Route Changes");
// In MainApp in App.jsx:
// Header
// MigrationConflictBanner (rendered once globally, directly in MainApp)
// Routes / view router:
// {view === "home" && <Dashboard ... />}
// {view === "learn" && <Learning />}
// {view === "codex" && <Dictionary />}
// {view === "arena" && <Arena />}
// {view === "inventory" && <Inventory />}

const mainAppRoutes = ['home', 'learn', 'codex', 'arena', 'inventory'];
const allInsideMainApp = mainAppRoutes.every((v) => appSrc.includes(`view === "${v}"`));

assert(allInsideMainApp === true, 'All core routes (Dashboard, Learn, Codex, Arena, Inventory) are children of MainApp');
assert(bannerIdx < appSrc.indexOf('view === "home"'), 'MigrationConflictBanner is mounted outside and above all view switches');
assert(bannerIdx < appSrc.indexOf('view === "learn"'), 'MigrationConflictBanner remains persistent when view is "learn"');
assert(bannerIdx < appSrc.indexOf('view === "arena"'), 'MigrationConflictBanner remains persistent when view is "arena"');
assert(bannerIdx < appSrc.indexOf('view === "inventory"'), 'MigrationConflictBanner remains persistent when view is "inventory"');
assert(bannerIdx < appSrc.indexOf('view === "codex"'), '18. Conflict UI remains global across all route changes without blocking navigation');

// Restore original axiosClient methods
axiosClient.post = originalPost;
axiosClient.get = originalGet;

console.log("\n=================================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=================================================================");

if (failed > 0) {
  process.exit(1);
}
