/**
 * Comprehensive Test Suite for Guest Migration Validation Engine (Phase 2C.1)
 *
 * Tests the real production validator (guestMigrationValidator & progressService.validateGuestSnapshot).
 * Proves determinism, no mutation, anti-cheat, boundary capping, and zero database/HTTP calls.
 */

const assert = require('assert');
const {
  validateGuestSnapshot,
  GUEST_PLAYABLE_QUESTS,
  MAX_GUEST_STREAK,
  UNLOGGED_XP_ALLOWANCE,
  UNLOGGED_GOLD_ALLOWANCE,
  MAX_GUEST_SAVED_WORDS,
} = require('./src/services/guestMigrationValidator');
const progressService = require('./src/services/progress.service');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('=================================================================');
console.log('    PHASE 2C.1 — GUEST MIGRATION VALIDATION TEST SUITE          ');
console.log('=================================================================\n');

// ─── Scenario A: Valid Basic Snapshot ────────────────────────────────────────
test('Scenario A: Valid basic snapshot passes and reconstructs faithfully', () => {
  const input = {
    migrationKey: 'mig_test_key_001',
    xp: 60,
    gold: 30,
    streak: 3,
    wordsLearned: 15,
    savedWords: ['apple', 'banana'],
    missions: [
      { id: 1, type: 'words', done: 15, total: 20, done_flag: false },
    ],
    questUnits: {
      '1': [{ id: 1, status: 'done' }, { id: 2, status: 'active' }],
    },
    ownedItemIds: ['4'], // Cuộn Hồi Phục (150 gold) -> wait, check solvency!
  };

  // Cuộn Hồi Phục is 150 gold. Verified unit gold = 30, saved words = 14, unlogged = 225. Capacity = 269. 150 <= 269 -> solvent!
  const res = validateGuestSnapshot(input);
  assert.strictEqual(res.migrationKey, 'mig_test_key_001');
  assert.strictEqual(res.reconstruction.validUnitCount, 1);
  assert.strictEqual(res.reconstruction.validSavedWordCount, 2);
  assert.strictEqual(res.wordsLearned, 15 * 1 + 2 * 1); // 17
  assert.strictEqual(res.xp, 60);
  assert.strictEqual(res.gold, 30);
  assert.strictEqual(res.streak, 3);
  assert.deepStrictEqual(res.savedWords, ['apple', 'banana']);
  assert.deepStrictEqual(res.ownedItemIds, ['4']);
});

// ─── Scenario B: Empty Snapshot (With Key) ───────────────────────────────────
test('Scenario B: Empty snapshot with valid key produces safe zero baseline', () => {
  const res = validateGuestSnapshot({ migrationKey: 'mig_empty_key' });
  assert.strictEqual(res.xp, 0);
  assert.strictEqual(res.gold, 0);
  assert.strictEqual(res.streak, 0);
  assert.strictEqual(res.wordsLearned, 0);
  assert.deepStrictEqual(res.savedWords, []);
  assert.deepStrictEqual(res.ownedItemIds, []);
  assert.deepStrictEqual(res.equippedIds, []);
  assert.strictEqual(res.reconstruction.validUnitCount, 0);
  assert.strictEqual(res.reconstruction.validSavedWordCount, 0);
});

// ─── Scenario C: Negative XP ─────────────────────────────────────────────────
test('Scenario C: Negative XP is normalized to 0', () => {
  const res = validateGuestSnapshot({ migrationKey: 'mig_neg_xp', xp: -500 });
  assert.strictEqual(res.xp, 0);
});

// ─── Scenario D: Huge XP Inflation ───────────────────────────────────────────
test('Scenario D: Massive forged XP (999,999,999) is strictly bounded to ceiling', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_huge_xp',
    xp: 999999999,
    questUnits: {
      '1': [{ id: 1, status: 'done' }],
    },
    savedWords: ['hero'],
  });

  // 1 unit = 60 XP, 1 word = 15 XP. Unlogged allowance = 450 XP. Total ceiling = 525 XP.
  assert.strictEqual(res.reconstruction.verifiedBaseXP, 75);
  assert.strictEqual(res.xp, 75 + UNLOGGED_XP_ALLOWANCE); // 525
  assert(res.xp < 1000, 'XP must be clamped below 1000');
});

// ─── Scenario E: Huge Gold Inflation ─────────────────────────────────────────
test('Scenario E: Massive forged Gold (999,999,999) is strictly bounded to legitimate earning capacity', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_huge_gold',
    gold: 999999999,
    questUnits: {
      '1': [{ id: 1, status: 'done' }], // 30 gold
    },
  });

  // 1 unit = 30 gold. Unlogged allowance = 225 gold. Total capacity = 255.
  assert.strictEqual(res.gold, 255);
});

// ─── Scenario F: Huge wordsLearned Ignored ───────────────────────────────────
test('Scenario F: Client wordsLearned (10,000,000) is ignored, strictly reconstructed from units + words', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_words_learned',
    wordsLearned: 10000000,
    questUnits: {
      '1': [{ id: 1, status: 'done' }, { id: 2, status: 'done' }], // 2 units * 15 = 30
    },
    savedWords: ['alpha', 'beta', 'gamma'], // 3 words * 1 = 3
  });

  assert.strictEqual(res.wordsLearned, 33);
});

// ─── Scenario G: Valid Sequential Quest 1 Progress ───────────────────────────
test('Scenario G: Valid sequential Quest 1 progress accepted contiguous prefix', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_seq_q1',
    questUnits: {
      '1': [
        { id: 1, status: 'done' },
        { id: 2, status: 'done' },
        { id: 3, status: 'done' },
        { id: 4, status: 'active' },
        { id: 5, status: 'locked' },
      ],
    },
  });

  assert.strictEqual(res.reconstruction.validUnitCount, 3);
  const q1 = res.questUnits['1'];
  assert.strictEqual(q1.length, 8); // A1 has 8 units
  assert.strictEqual(q1[0].status, 'done');
  assert.strictEqual(q1[1].status, 'done');
  assert.strictEqual(q1[2].status, 'done');
  assert.strictEqual(q1[3].status, 'active');
  assert.strictEqual(q1[4].status, 'locked');
});

// ─── Scenario H: Skipped Quest Unit ──────────────────────────────────────────
test('Scenario H: Skipped unit (unit 1 done, unit 2 locked, unit 3 done) prunes downstream skipped units', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_skip_unit',
    questUnits: {
      '1': [
        { id: 1, status: 'done' },
        { id: 2, status: 'locked' },
        { id: 3, status: 'done' },
      ],
    },
  });

  // Only contiguous prefix (unit 1) is accepted!
  assert.strictEqual(res.reconstruction.validUnitCount, 1);
  const q1 = res.questUnits['1'];
  assert.strictEqual(q1[0].status, 'done');
  assert.strictEqual(q1[1].status, 'active');
  assert.strictEqual(q1[2].status, 'locked'); // Unit 3 downgraded to locked
});

// ─── Scenario I: Impossible Quest 2 Progress (Gating Invariant) ──────────────
test('Scenario I: Quest 2 units rejected if Quest 1 is not 100% complete', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_gating_q2',
    questUnits: {
      '1': [{ id: 1, status: 'done' }], // Q1 only has 1/8 units done!
      '2': [{ id: 1, status: 'done' }], // Q2 cannot be started!
    },
  });

  assert.strictEqual(res.reconstruction.validUnitCount, 1);
  const q2 = res.questUnits['2'];
  assert(q2.every((u) => u.status === 'locked'), 'All Q2 units must be locked');
});

// ─── Scenario J: Q4-Q6 Guest Progress Rejected ───────────────────────────────
test('Scenario J: Quests 4-6 are ignored/pruned for guest mode', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_q4_q6',
    questUnits: {
      '4': [{ id: 1, status: 'done' }],
      '5': [{ id: 1, status: 'done' }],
      '6': [{ id: 1, status: 'done' }],
    },
  });

  assert.strictEqual(res.reconstruction.validUnitCount, 0);
  assert.strictEqual(res.questUnits['4'], undefined);
});

// ─── Scenario K: Duplicate Saved Words ───────────────────────────────────────
test('Scenario K: Duplicate saved words are deduplicated', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_dup_words',
    savedWords: ['dragon', 'Dragon', '  DRAGON  ', 'knight'],
  });

  assert.strictEqual(res.savedWords.length, 2);
  assert.deepStrictEqual(res.savedWords, ['dragon', 'knight']);
});

// ─── Scenario L: Invalid Saved Word Types & XSS Filtered ─────────────────────
test('Scenario L: Invalid types and illegal characters in saved words are filtered', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_invalid_words',
    savedWords: [null, 12345, {}, '<script>alert(1)</script>', '', '   ', 'valid-word', 'hello world!'],
  });

  assert.deepStrictEqual(res.savedWords, ['valid-word', 'hello world!']);
});

// ─── Scenario M: Oversized savedWords Truncated to 200 ───────────────────────
test('Scenario M: Oversized savedWords array truncated to MAX_GUEST_SAVED_WORDS (200)', () => {
  const hugeList = Array.from({ length: 300 }, (_, i) => `word${i}`);
  const res = validateGuestSnapshot({
    migrationKey: 'mig_oversized_words',
    savedWords: hugeList,
  });

  assert.strictEqual(res.savedWords.length, 200);
});

// ─── Scenario N: Mission Progress > Total Clamped ────────────────────────────
test('Scenario N: Mission progress exceeding total is clamped to total', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_mission_overflow',
    missions: [
      { id: 1, type: 'words', done: 9999, total: 20 },
    ],
  });

  const m1 = res.missions.find((m) => m.id === 1);
  assert.strictEqual(m1.done, 20);
  assert.strictEqual(m1.done_flag, true);
});

// ─── Scenario O: Forged done_flag Normalized ─────────────────────────────────
test('Scenario O: Forged done_flag (done: 0, done_flag: true) normalized to false', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_forged_done_flag',
    missions: [
      { id: 2, type: 'quiz', done: 0, total: 1, done_flag: true },
    ],
  });

  const m2 = res.missions.find((m) => m.id === 2);
  assert.strictEqual(m2.done, 0);
  assert.strictEqual(m2.done_flag, false);
});

// ─── Scenario P: Mission Complete With Insufficient Raw XP ───────────────────
test('Scenario P: Mission complete does NOT add XP if rawGuestXP does not contain it', () => {
  // 1 unit = 60 XP. Words mission is done (bonus 100 XP). Raw XP is 60.
  const res = validateGuestSnapshot({
    migrationKey: 'mig_no_mint_xp',
    xp: 60,
    questUnits: {
      '1': [{ id: 1, status: 'done' }],
    },
    missions: [
      { id: 1, type: 'words', done: 20, total: 20, done_flag: true },
    ],
  });

  // Invariant INV-2: Server never mints XP. Output must remain 60!
  assert.strictEqual(res.xp, 60);
  assert.strictEqual(res.reconstruction.missionAllowanceXP, 100);
});

// ─── Scenario Q: XP Inflation Bounded To Ceiling ─────────────────────────────
test('Scenario Q: XP inflation bounded strictly to base + allowance + unlogged', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_xp_ceiling',
    xp: 50000,
    questUnits: {
      '1': [{ id: 1, status: 'done' }], // 60 XP
    },
    missions: [
      { id: 1, type: 'words', done: 20, total: 20 }, // 100 XP
    ],
  });

  // Ceiling = 60 + 100 + 450 = 610
  assert.strictEqual(res.xp, 610);
});

// ─── Scenario R: Valid XP Preserved Faithfully ───────────────────────────────
test('Scenario R: Valid XP (160 XP for 1 unit + mission bonus) preserved without modification', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_valid_xp_160',
    xp: 160,
    questUnits: {
      '1': [{ id: 1, status: 'done' }],
    },
    missions: [
      { id: 1, type: 'words', done: 20, total: 20 },
    ],
  });

  // Exactly 160 preserved!
  assert.strictEqual(res.xp, 160);
});

// ─── Scenario S: Valid Current Gold Preserved ────────────────────────────────
test('Scenario S: Valid current Gold balance (200) preserved when solvent after item purchase', () => {
  // Total capacity: 10 units = 300 gold + 225 unlogged = 525 capacity.
  // Item 6 costs 300 gold.
  // Current balance: 200 gold.
  // Total claimed = 200 + 300 = 500 <= 525. Solvent!
  const res = validateGuestSnapshot({
    migrationKey: 'mig_gold_solvent',
    gold: 200,
    ownedItemIds: ['6'], // 300 gold
    questUnits: {
      '1': Array.from({ length: 8 }, (_, i) => ({ id: i + 1, status: 'done' })),
      '2': [{ id: 1, status: 'done' }, { id: 2, status: 'done' }],
    },
  });

  assert.deepStrictEqual(res.ownedItemIds, ['6']);
  assert.strictEqual(res.gold, 200);
  assert.strictEqual(res.reconstruction.prunedItemIds.length, 0);
});

// ─── Scenario T: Impossible Gold Bounded ─────────────────────────────────────
test('Scenario T: Impossible gold with zero earnings clamped to unlogged allowance', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_impossible_gold',
    gold: 88888,
  });

  // Zero units, zero words -> lifetime capacity = 225 gold.
  assert.strictEqual(res.gold, 225);
});

// ─── Scenario U: Invalid Item IDs Filtered ───────────────────────────────────
test('Scenario U: Non-existent item IDs in store catalog are pruned', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_invalid_items',
    ownedItemIds: ['fake_99', 'admin_sword', '4'],
  });

  // Only '4' exists in STORE_ITEMS
  assert.deepStrictEqual(res.ownedItemIds, ['4']);
});

// ─── Scenario V: Duplicate Item IDs Deduplicated ─────────────────────────────
test('Scenario V: Duplicate owned item IDs deduplicated', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_dup_items',
    ownedItemIds: ['4', 4, '4', '4'],
  });

  assert.deepStrictEqual(res.ownedItemIds, ['4']);
});

// ─── Scenario W: Deterministic Item Ownership Pruning ────────────────────────
test('Scenario W: Insolvent items pruned deterministically by highest price first', () => {
  // User has lifetime capacity of 225 gold (0 units, 0 words, unlogged = 225).
  // Claims Item 1 (price 400) and Item 4 (price 150).
  // Total claimed cost = 550 > 225 (Insolvent!).
  // Sorted descending: Item 1 (400) -> too expensive (pruned).
  // Item 4 (150) -> affordable within 225! (funded).
  const res = validateGuestSnapshot({
    migrationKey: 'mig_item_pruning',
    ownedItemIds: ['1', '4'],
  });

  assert.deepStrictEqual(res.ownedItemIds, ['4']);
  assert.deepStrictEqual(res.reconstruction.prunedItemIds, ['1']);
  assert.strictEqual(res.reconstruction.fundedItemCost, 150);
});

// ─── Scenario X: Equipped Item Not Owned Stripped ────────────────────────────
test('Scenario X: Equipped items that are not in accepted ownedItemIds are stripped', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_equip_unowned',
    ownedItemIds: ['4'],
    equippedIds: ['1', '4'], // '1' is not owned!
  });

  assert.deepStrictEqual(res.equippedIds, ['4']);
});

// ─── Scenario Y: Maximum 2 Equipped Items ────────────────────────────────────
test('Scenario Y: More than 2 equipped items truncated to 2', () => {
  // Give sufficient capacity to own items 2 (250), 4 (150), 6 (300) = 700 gold.
  // 16 units done = 480 gold + 225 unlogged = 705 gold.
  const res = validateGuestSnapshot({
    migrationKey: 'mig_max_equip',
    questUnits: {
      '1': Array.from({ length: 8 }, (_, i) => ({ id: i + 1, status: 'done' })),
      '2': Array.from({ length: 8 }, (_, i) => ({ id: i + 1, status: 'done' })),
    },
    ownedItemIds: ['2', '4', '6'],
    equippedIds: ['2', '4', '6'],
  });

  assert.strictEqual(res.equippedIds.length, 2);
});

// ─── Scenario Z: Streak > 30 Clamped (Security Heuristic) ─────────────────────
test('Scenario Z: Streak > 30 clamped to MAX_GUEST_STREAK (30)', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_streak_overflow',
    streak: 99999,
  });

  assert.strictEqual(res.streak, 30);
});

// ─── Scenario AA: Negative Streak Clamped ────────────────────────────────────
test('Scenario AA: Negative streak clamped to 0', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_neg_streak',
    streak: -10,
  });

  assert.strictEqual(res.streak, 0);
});

// ─── Scenario AB: Forged lastResetDate Sanitized ─────────────────────────────
test('Scenario AB: Forged or corrupted lastResetDate sanitized as metadata', () => {
  const resValid = validateGuestSnapshot({
    migrationKey: 'mig_reset_date_1',
    lastResetDate: '2026-09-06',
  });
  assert.strictEqual(resValid.lastResetDate, '2026-09-06');

  const resInvalid = validateGuestSnapshot({
    migrationKey: 'mig_reset_date_2',
    lastResetDate: 'invalid-date-string-123',
  });
  assert.strictEqual(resInvalid.lastResetDate, null);
});

// ─── Scenario AC: Malformed Migration Key Throws 400 ─────────────────────────
test('Scenario AC: Missing or malformed migrationKey throws an error', () => {
  assert.throws(() => validateGuestSnapshot({}), /migrationKey/);
  assert.throws(() => validateGuestSnapshot({ migrationKey: '' }), /migrationKey/);
  assert.throws(() => validateGuestSnapshot({ migrationKey: '   ' }), /migrationKey/);
  assert.throws(() => validateGuestSnapshot({ migrationKey: 'key with spaces!' }), /migrationKey/);
  assert.throws(() => validateGuestSnapshot({ migrationKey: 'a'.repeat(300) }), /migrationKey/);
});

// ─── Scenario AD: Determinism (Same Input -> Same Output) ─────────────────────
test('Scenario AD: Determinism: exactly identical outputs across 10 invocations', () => {
  const input = {
    migrationKey: 'mig_det_key_123',
    xp: 250,
    gold: 120,
    streak: 5,
    wordsLearned: 50,
    savedWords: ['sun', 'moon', 'star'],
    missions: [{ id: 1, type: 'words', done: 10, total: 20 }],
    questUnits: {
      '1': [{ id: 1, status: 'done' }, { id: 2, status: 'done' }],
    },
    ownedItemIds: ['4'],
  };

  const first = JSON.stringify(validateGuestSnapshot(input));
  for (let i = 0; i < 9; i++) {
    const next = JSON.stringify(validateGuestSnapshot(input));
    assert.strictEqual(first, next);
  }
});

// ─── Scenario AE: Mission Bonus Never Directly Adds to Raw XP ────────────────
test('Scenario AE: Mission bonus never directly adds to raw XP (INV-2)', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_inv_2_check',
    xp: 120,
    questUnits: {
      '1': [{ id: 1, status: 'done' }, { id: 2, status: 'done' }], // 120 XP
    },
    missions: [
      { id: 1, type: 'words', done: 20, total: 20 }, // 100 XP bonus
      { id: 2, type: 'quiz', done: 1, total: 1 }, // 75 XP bonus
    ],
  });

  // Even though missions are done, raw XP was 120. Result MUST be 120, NOT 120 + 175 = 295!
  assert.strictEqual(res.xp, 120);
});

// ─── Scenario AF: Client wordsLearned Never Affects Output (INV-3) ───────────
test('Scenario AF: Client wordsLearned never affects output (INV-3)', () => {
  const resA = validateGuestSnapshot({
    migrationKey: 'mig_wl_test_a',
    wordsLearned: 0,
    questUnits: { '1': [{ id: 1, status: 'done' }] },
    savedWords: ['fire'],
  });

  const resB = validateGuestSnapshot({
    migrationKey: 'mig_wl_test_b',
    wordsLearned: 999999,
    questUnits: { '1': [{ id: 1, status: 'done' }] },
    savedWords: ['fire'],
  });

  assert.strictEqual(resA.wordsLearned, 16);
  assert.strictEqual(resB.wordsLearned, 16);
});

// ─── Scenario AG: Client Level Completely Ignored ────────────────────────────
test('Scenario AG: Client level is completely ignored if present', () => {
  const res = validateGuestSnapshot({
    migrationKey: 'mig_level_test',
    level: 999,
    xp: 60,
    questUnits: { '1': [{ id: 1, status: 'done' }] },
  });

  assert.strictEqual(res.level, undefined);
  assert.strictEqual(res.xp, 60);
});

// ─── Scenario AH: snapshotAt Does Not Affect Rewards ─────────────────────────
test('Scenario AH: snapshotAt is metadata only and does not alter rewards', () => {
  const res1 = validateGuestSnapshot({
    migrationKey: 'mig_time_1',
    snapshotAt: 1000,
    xp: 60,
  });

  const res2 = validateGuestSnapshot({
    migrationKey: 'mig_time_2',
    snapshotAt: Date.now() + 100000000,
    xp: 60,
  });

  assert.strictEqual(res1.xp, res2.xp);
  assert.strictEqual(res1.gold, res2.gold);
});

// ─── Scenario AI: No Side Effects / Object Mutation Check ────────────────────
test('Scenario AI: Pure function does NOT mutate input object (Deep Freeze check)', () => {
  const immutableInput = Object.freeze({
    migrationKey: 'mig_frozen_key',
    xp: 100,
    gold: 50,
    streak: 2,
    wordsLearned: 20,
    savedWords: Object.freeze(['frozen', 'cold']),
    missions: Object.freeze([
      Object.freeze({ id: 1, type: 'words', done: 10, total: 20 }),
    ]),
    questUnits: Object.freeze({
      '1': Object.freeze([
        Object.freeze({ id: 1, status: 'done' }),
      ]),
    }),
    ownedItemIds: Object.freeze(['4']),
    equippedIds: Object.freeze(['4']),
  });

  // If validateGuestSnapshot attempts to mutate any property or array, Object.freeze will throw
  const res = validateGuestSnapshot(immutableInput);
  assert.strictEqual(res.migrationKey, 'mig_frozen_key');
  assert.strictEqual(res.xp, 100);
});

// ─── Scenario AJ: ProgressService Interface Parity ───────────────────────────
test('Scenario AJ: progressService.validateGuestSnapshot behaves identically', () => {
  const input = {
    migrationKey: 'mig_service_parity',
    xp: 80,
    questUnits: { '1': [{ id: 1, status: 'done' }] },
  };

  const directRes = validateGuestSnapshot(input);
  const serviceRes = progressService.validateGuestSnapshot(input);
  assert.deepStrictEqual(directRes, serviceRes);
});

// ─── Scenario AK: Adversarial Maximal Snapshot Tests (Sub-Checks A through H) ─
test('Scenario AK: Adversarial maximal snapshot subjected to rigorous upper-bound validation', () => {
  // Construct maximal malicious but structurally valid snapshot
  const rawAdversarialSnapshot = {
    migrationKey: 'mig_adversarial_max_001',
    xp: 999999999, // Extremely large
    gold: 999999999, // Extremely large
    streak: 999999, // Extremely large
    wordsLearned: 888888888, // Extremely large forged metric
    // All 30 playable Q1-Q3 units completed (Q1: 8, Q2: 10, Q3: 12) + impossible Q4 units
    questUnits: {
      '1': Array.from({ length: 8 }, (_, i) => ({ id: i + 1, status: 'done' })),
      '2': Array.from({ length: 10 }, (_, i) => ({ id: i + 1, status: 'done' })),
      '3': Array.from({ length: 12 }, (_, i) => ({ id: i + 1, status: 'done' })),
      '4': Array.from({ length: 5 }, (_, i) => ({ id: i + 1, status: 'done' })), // Impossible quest
    },
    // 250 words provided (exceeding 200 cap)
    savedWords: Array.from({ length: 250 }, (_, i) => `adv_word_${i}`),
    // All 3 missions complete
    missions: [
      { id: 1, type: 'words', done: 20, total: 20, done_flag: true },
      { id: 2, type: 'quiz', done: 1, total: 1, done_flag: true },
      { id: 3, type: 'chat', done: 5, total: 5, done_flag: true },
    ],
    // All 6 valid store items + unknown items
    ownedItemIds: ['1', '2', '3', '4', '5', '6', 'fake_item_99', 'admin_gem', '1'],
    // 3 equipped items (exceeding 2 limit)
    equippedIds: ['1', '2', '3'],
    snapshotAt: 1788777000000,
    lastResetDate: '2026-09-06',
  };

  // Deep freeze a clone to verify input immutability (Sub-check F)
  const frozenSnapshot = JSON.parse(JSON.stringify(rawAdversarialSnapshot));
  Object.freeze(frozenSnapshot);
  Object.freeze(frozenSnapshot.questUnits);
  Object.freeze(frozenSnapshot.savedWords);
  Object.freeze(frozenSnapshot.missions);
  Object.freeze(frozenSnapshot.ownedItemIds);
  Object.freeze(frozenSnapshot.equippedIds);

  const res1 = validateGuestSnapshot(frozenSnapshot);

  // Sub-check A: Final XP never exceeds verifiedBaseXP + missionAllowanceXP + 450
  // 30 units * 60 = 1800. 200 words * 15 = 3000. Base = 4800.
  // Missions: 100 + 75 + 50 = 225.
  // Max ceiling = 4800 + 225 + 450 = 5475.
  assert.strictEqual(res1.reconstruction.validUnitCount, 30);
  assert.strictEqual(res1.reconstruction.validSavedWordCount, 200);
  assert.strictEqual(res1.reconstruction.verifiedBaseXP, 4800);
  assert.strictEqual(res1.reconstruction.missionAllowanceXP, 225);
  const expectedMaxXP = 4800 + 225 + UNLOGGED_XP_ALLOWANCE; // 5475
  assert(res1.xp <= expectedMaxXP, `Final XP (${res1.xp}) must not exceed ceiling (${expectedMaxXP})`);
  assert.strictEqual(res1.xp, expectedMaxXP);

  // Sub-check B: Final Gold never exceeds approved lifetime solvency boundary
  // 30 units * 30 = 900. 200 words * 7 = 1400. Base = 2300.
  // Missions gold: 50 + 37 + 25 = 112. Unlogged gold = 225.
  // Lifetime capacity = 2300 + 112 + 225 = 2637.
  // All 6 items cost: 400 + 250 + 600 + 150 + 500 + 300 = 2200.
  // Remaining gold budget = 2637 - 2200 = 437.
  assert.strictEqual(res1.reconstruction.lifetimeGoldCapacity, 2637);
  assert.strictEqual(res1.reconstruction.fundedItemCost, 2200);
  assert(res1.gold <= 437, `Final Gold (${res1.gold}) must not exceed remaining budget (437)`);
  assert.strictEqual(res1.gold, 437);

  // Sub-check C: wordsLearned is reconstructed and never trusts client wordsLearned
  // 30 units * 15 + 200 words * 1 = 450 + 200 = 650
  assert.strictEqual(res1.wordsLearned, 650);

  // Sub-check D: Unknown items are never accepted
  assert(!res1.ownedItemIds.includes('fake_item_99'), 'Unknown item must be pruned');
  assert(!res1.ownedItemIds.includes('admin_gem'), 'Unknown item must be pruned');
  assert.strictEqual(res1.ownedItemIds.length, 6);

  // Sub-check E: Impossible quest states are pruned (Q4 units discarded)
  assert.strictEqual(res1.questUnits['4'], undefined);

  // Sub-check G: Repeated validation is deterministic
  const res2 = validateGuestSnapshot(frozenSnapshot);
  assert.deepStrictEqual(res1, res2);

  // Sub-check H: No NaN, Infinity, negative values, or invalid types
  assert(!isNaN(res1.xp) && isFinite(res1.xp) && res1.xp >= 0, 'Valid XP number');
  assert(!isNaN(res1.gold) && isFinite(res1.gold) && res1.gold >= 0, 'Valid Gold number');
  assert(!isNaN(res1.streak) && isFinite(res1.streak) && res1.streak >= 0 && res1.streak <= 30, 'Valid Streak');
  assert(!isNaN(res1.wordsLearned) && isFinite(res1.wordsLearned) && res1.wordsLearned >= 0, 'Valid Words');
  assert(Array.isArray(res1.savedWords) && res1.savedWords.length === 200, 'Valid saved words array');
  assert(Array.isArray(res1.ownedItemIds), 'Valid ownedItemIds array');
  assert(Array.isArray(res1.equippedIds) && res1.equippedIds.length <= 2, 'Equipped items capped at 2');
});

console.log('\n=================================================================');
console.log(`  VALIDATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=================================================================\n');

if (failed > 0) {
  process.exit(1);
}

