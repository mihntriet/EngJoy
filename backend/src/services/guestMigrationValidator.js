/**
 * Guest Migration Validator & Reconstruction Engine (Phase 2C.1)
 *
 * Structurally Validated / Bounded Guest State:
 * Pure, deterministic validation layer for untrusted Guest snapshots.
 * Verifies that submitted state is structurally consistent with canonical
 * curriculum, catalog, and reward rules. Does NOT claim historical gameplay
 * is cryptographically verifiable (since Guest mode lacks an immutable event log).
 * Does NOT access PostgreSQL, does NOT mutate state, does NOT perform migrations.
 */

const {
  QUEST_CURRICULUM,
  STORE_ITEMS,
  DEFAULT_MISSIONS,
  MISSION_BONUS,
  ACTION_REWARDS,
} = require('../constants/gameCatalog');

// ─── Migration Constants ─────────────────────────────────────────────────────
// Current frontend only provides playable units for Quests 1, 2, 3
const GUEST_PLAYABLE_QUESTS = [1, 2, 3];

// Security-bound migration heuristic (NOT a gameplay rule)
const MAX_GUEST_STREAK = 30;

// Security-bounded allowances for unlogged guest activities (Arena quizzes / Chat practice)
const UNLOGGED_XP_ALLOWANCE = 450;
const UNLOGGED_GOLD_ALLOWANCE = 225;

// Maximum acceptable guest saved words ceiling to prevent memory/payload attacks
const MAX_GUEST_SAVED_WORDS = 200;

/**
 * Validate and reconstruct a Guest snapshot into a safe, authoritative payload.
 *
 * @param {object} rawSnapshot - Untrusted client-supplied guest snapshot
 * @returns {object} Deterministically validated migration payload
 */
function validateGuestSnapshot(rawSnapshot) {
  const snapshot = rawSnapshot && typeof rawSnapshot === 'object' ? rawSnapshot : {};

  // ─── 1. Migration Key Validation ───────────────────────────────────────────
  const rawKey = snapshot.migrationKey;
  if (!rawKey || typeof rawKey !== 'string') {
    const err = new Error('Invalid or missing migrationKey');
    err.statusCode = 400;
    throw err;
  }

  const trimmedKey = rawKey.trim();
  // Valid key: alphanumeric, hyphens, underscores, 1 to 255 characters
  const keyRegex = /^[a-zA-Z0-9_-]{1,255}$/;
  if (trimmedKey.length === 0 || trimmedKey.length > 255 || !keyRegex.test(trimmedKey)) {
    const err = new Error('Invalid migrationKey format or length');
    err.statusCode = 400;
    throw err;
  }
  const migrationKey = trimmedKey;

  // ─── 2. Snapshot Timestamp (Metadata Only) ──────────────────────────────────
  const snapshotAt =
    typeof snapshot.snapshotAt === 'number' && !isNaN(snapshot.snapshotAt) && snapshot.snapshotAt > 0
      ? snapshot.snapshotAt
      : null;

  // ─── 3. Quest Units Validation (Contiguous Prefix & Gating) ─────────────────
  const rawUnitsMap =
    snapshot.questUnits && typeof snapshot.questUnits === 'object' && !Array.isArray(snapshot.questUnits)
      ? snapshot.questUnits
      : {};

  let validUnitCount = 0;
  const sanitizedQuestUnits = {};
  let previousQuestFullyCompleted = true; // Q1 requires no prior quest

  for (const qId of GUEST_PLAYABLE_QUESTS) {
    const qKey = String(qId);
    const curriculum = QUEST_CURRICULUM[qId];
    if (!curriculum) continue;

    const maxUnits = curriculum.maxUnits;
    const rawQuestUnits = Array.isArray(rawUnitsMap[qKey]) ? rawUnitsMap[qKey] : [];

    // Map raw units by unit ID
    const rawUnitLookup = new Map();
    for (const u of rawQuestUnits) {
      if (u && typeof u === 'object' && typeof u.id === 'number') {
        rawUnitLookup.set(u.id, u);
      }
    }

    // Determine contiguous legitimate completed prefix
    let contiguousDoneCount = 0;

    if (previousQuestFullyCompleted) {
      for (let uId = 1; uId <= maxUnits; uId++) {
        const u = rawUnitLookup.get(uId);
        if (u && u.status === 'done') {
          contiguousDoneCount++;
        } else {
          // Break at first non-done unit; no skipped units allowed
          break;
        }
      }
    }

    validUnitCount += contiguousDoneCount;

    // Reconstruct clean unit array for this quest
    const reconstructedList = [];
    for (let uId = 1; uId <= maxUnits; uId++) {
      let status = 'locked';
      if (uId <= contiguousDoneCount) {
        status = 'done';
      } else if (uId === contiguousDoneCount + 1 && previousQuestFullyCompleted) {
        status = 'active';
      }
      reconstructedList.push({ id: uId, status });
    }

    sanitizedQuestUnits[qKey] = reconstructedList;
    previousQuestFullyCompleted = contiguousDoneCount === maxUnits;
  }

  // Authoritative unit rewards
  const verifiedUnitXP = validUnitCount * ACTION_REWARDS.COMPLETE_UNIT.xp; // 60 XP
  const verifiedUnitGold = validUnitCount * ACTION_REWARDS.COMPLETE_UNIT.gold; // 30 Gold
  const verifiedUnitWords = validUnitCount * ACTION_REWARDS.COMPLETE_UNIT.wordsLearned; // 15 words

  // ─── 4. Saved Words Validation (Sanitization & Deduplication) ───────────────
  const rawSavedWords = Array.isArray(snapshot.savedWords) ? snapshot.savedWords : [];
  const wordRegex = /^[a-z0-9\s\-',.!?_]+$/i;
  const uniqueWordsSet = new Set();

  for (const item of rawSavedWords) {
    if (typeof item !== 'string') continue;
    const cleaned = item.trim().toLowerCase();
    if (cleaned.length >= 1 && cleaned.length <= 100 && wordRegex.test(cleaned)) {
      uniqueWordsSet.add(cleaned);
      if (uniqueWordsSet.size >= MAX_GUEST_SAVED_WORDS) break;
    }
  }

  const sanitizedSavedWords = Array.from(uniqueWordsSet);
  const validSavedWordCount = sanitizedSavedWords.length;

  const verifiedSavedWordXP = validSavedWordCount * ACTION_REWARDS.SAVE_WORD.xp; // 15 XP
  const verifiedSavedWordGold = validSavedWordCount * ACTION_REWARDS.SAVE_WORD.gold; // 7 Gold
  const verifiedSavedWordWords = validSavedWordCount * ACTION_REWARDS.SAVE_WORD.wordsLearned; // 1 word

  // ─── 5. Reconstructed wordsLearned Metric ──────────────────────────────────
  // Client snapshot.wordsLearned is completely ignored
  const reconstructedWordsLearned = verifiedUnitWords + verifiedSavedWordWords;

  // ─── 6. Missions Validation (Allowance Cap Only — Zero Replay) ─────────────
  const rawMissions = Array.isArray(snapshot.missions) ? snapshot.missions : [];
  const rawMissionMap = new Map();
  for (const m of rawMissions) {
    if (m && typeof m === 'object' && m.id) {
      rawMissionMap.set(Number(m.id), m);
    }
  }

  let missionAllowanceXP = 0;
  let missionAllowanceGold = 0;
  const sanitizedMissions = DEFAULT_MISSIONS.map((catalogMission) => {
    const rawM = rawMissionMap.get(catalogMission.id);
    let doneCount = 0;
    if (rawM && typeof rawM.done === 'number' && !isNaN(rawM.done)) {
      doneCount = Math.max(0, Math.min(catalogMission.total, Math.floor(rawM.done)));
    }

    const isComplete = doneCount >= catalogMission.total;
    if (isComplete) {
      const bonus = MISSION_BONUS[catalogMission.type] || { xp: 0, gold: 0 };
      missionAllowanceXP += bonus.xp;
      missionAllowanceGold += bonus.gold;
    }

    return {
      id: catalogMission.id,
      type: catalogMission.type,
      title: catalogMission.title,
      done: doneCount,
      total: catalogMission.total,
      xp: catalogMission.xp,
      done_flag: isComplete,
    };
  });

  // ─── 7. XP Reconstruction & Security Bounding ──────────────────────────────
  const verifiedBaseXP = verifiedUnitXP + verifiedSavedWordXP;
  const maximumAcceptedGuestXP = verifiedBaseXP + missionAllowanceXP + UNLOGGED_XP_ALLOWANCE;

  const rawXP =
    typeof snapshot.xp === 'number' && !isNaN(snapshot.xp)
      ? Math.floor(snapshot.xp)
      : parseInt(snapshot.xp, 10) || 0;

  // Mission allowance expands the ceiling; it NEVER adds to raw XP
  const finalGuestXP = Math.min(Math.max(0, rawXP), maximumAcceptedGuestXP);

  // ─── 8. Gold / Item Solvency Accounting & Deterministic Pruning ─────────────
  const verifiedBaseGold = verifiedUnitGold + verifiedSavedWordGold;
  const lifetimeGoldCapacity =
    verifiedBaseGold + missionAllowanceGold + UNLOGGED_GOLD_ALLOWANCE;

  // Filter and deduplicate owned item IDs against authoritative store catalog
  const rawOwned = Array.isArray(snapshot.ownedItemIds) ? snapshot.ownedItemIds : [];
  const candidateOwnedSet = new Set();
  for (const id of rawOwned) {
    const strId = String(id).trim();
    if (STORE_ITEMS[strId]) {
      candidateOwnedSet.add(strId);
    }
  }

  const candidateItemIds = Array.from(candidateOwnedSet);
  const claimedItemCost = candidateItemIds.reduce(
    (sum, id) => sum + STORE_ITEMS[id].price,
    0
  );

  const rawGold =
    typeof snapshot.gold === 'number' && !isNaN(snapshot.gold)
      ? Math.floor(snapshot.gold)
      : parseInt(snapshot.gold, 10) || 0;
  const safeRawGold = Math.max(0, rawGold);

  let acceptedOwnedItemIds = [];
  let prunedItemIds = [];
  let fundedItemCost = 0;

  if (claimedItemCost <= lifetimeGoldCapacity) {
    // Completely solvent: all valid items accepted
    acceptedOwnedItemIds = candidateItemIds;
    fundedItemCost = claimedItemCost;
  } else {
    // Insolvent: deterministic pruning (highest price first, then id ascending)
    const sortedCandidates = [...candidateItemIds].sort((a, b) => {
      const priceDiff = STORE_ITEMS[b].price - STORE_ITEMS[a].price;
      if (priceDiff !== 0) return priceDiff;
      return a.localeCompare(b);
    });

    let currentCost = 0;
    for (const itemId of sortedCandidates) {
      const price = STORE_ITEMS[itemId].price;
      if (currentCost + price <= lifetimeGoldCapacity) {
        acceptedOwnedItemIds.push(itemId);
        currentCost += price;
      } else {
        prunedItemIds.push(itemId);
      }
    }
    fundedItemCost = currentCost;
  }

  // Preserve current balance up to remaining legitimate budget
  const remainingGoldBudget = lifetimeGoldCapacity - fundedItemCost;
  const finalGuestGold = Math.min(safeRawGold, Math.max(0, remainingGoldBudget));

  // ─── 9. Equipment Validation ───────────────────────────────────────────────
  const rawEquipped = Array.isArray(snapshot.equippedIds) ? snapshot.equippedIds : [];
  const equippedSet = new Set();
  for (const eqId of rawEquipped) {
    const strEq = String(eqId).trim();
    // Must be an accepted owned item
    if (acceptedOwnedItemIds.includes(strEq)) {
      equippedSet.add(strEq);
    }
  }
  // Max 2 equipped items
  const acceptedEquippedIds = Array.from(equippedSet).slice(0, 2);

  // ─── 10. Streak Validation (Security Heuristic) ─────────────────────────────
  const rawStreak =
    typeof snapshot.streak === 'number' && !isNaN(snapshot.streak)
      ? Math.floor(snapshot.streak)
      : parseInt(snapshot.streak, 10) || 0;
  const finalStreak = Math.min(Math.max(0, rawStreak), MAX_GUEST_STREAK);

  // ─── 11. Last Reset Date (Metadata Only) ───────────────────────────────────
  let sanitizedLastResetDate = null;
  if (typeof snapshot.lastResetDate === 'string') {
    const trimmedDate = snapshot.lastResetDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      sanitizedLastResetDate = trimmedDate;
    }
  }

  // ─── 12. Validated Output Object ───────────────────────────────────────────
  return {
    migrationKey,
    xp: finalGuestXP,
    gold: finalGuestGold,
    streak: finalStreak,
    wordsLearned: reconstructedWordsLearned,
    savedWords: sanitizedSavedWords,
    missions: sanitizedMissions,
    questUnits: sanitizedQuestUnits,
    ownedItemIds: acceptedOwnedItemIds,
    equippedIds: acceptedEquippedIds,
    lastResetDate: sanitizedLastResetDate,
    snapshotAt,
    reconstruction: {
      validUnitCount,
      validSavedWordCount,
      verifiedBaseXP,
      verifiedBaseGold,
      missionAllowanceXP,
      missionAllowanceGold,
      unloggedAllowanceXP: UNLOGGED_XP_ALLOWANCE,
      unloggedAllowanceGold: UNLOGGED_GOLD_ALLOWANCE,
      lifetimeGoldCapacity,
      claimedItemCost,
      fundedItemCost,
      prunedItemIds,
    },
  };
}

module.exports = {
  validateGuestSnapshot,
  GUEST_PLAYABLE_QUESTS,
  MAX_GUEST_STREAK,
  UNLOGGED_XP_ALLOWANCE,
  UNLOGGED_GOLD_ALLOWANCE,
  MAX_GUEST_SAVED_WORDS,
};
