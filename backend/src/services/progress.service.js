const { pool } = require('../config/db.postgres');
const logger = require('../utils/logger');
const {
  calculateLevel,
  QUEST_CURRICULUM,
  STORE_ITEMS,
  DEFAULT_MISSIONS,
  MISSION_BONUS,
  ACTION_REWARDS,
} = require('../constants/gameCatalog');

const { validateGuestSnapshot, GUEST_PLAYABLE_QUESTS } = require('./guestMigrationValidator');

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PASS_THRESHOLD = 60; // minimum score to pass a phase

function toDateStr(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

class ProgressService {
  /**
   * Pure, deterministic Guest snapshot validation and reconstruction (Phase 2C.1).
   *
   * @param {object} snapshot
   * @returns {object} Validated migration payload
   */
  validateGuestSnapshot(snapshot) {
    return validateGuestSnapshot(snapshot);
  }

  /**
   * Guest Migration Transaction & Merge Service (Phase 2C.2)
   *
   * Atomically merges a validated Guest progression snapshot into an authenticated
   * user's player_profiles row. Enforces single-migration invariant, idempotency,
   * row locking, deduplication, and zero mission reward replay.
   *
   * @param {string} userId - Authenticated user UUID
   * @param {object} snapshot - Raw or already validated guest snapshot
   * @returns {Promise<object>} Authoritative migration response
   */
  async migrateGuestProgress(userId, snapshot) {
    if (!userId) {
      const err = new Error('userId is required for guest migration');
      err.statusCode = 400;
      throw err;
    }

    // 1. Authority Boundary: Validate snapshot through pure deterministic validator
    // Ensures NO raw/unvalidated snapshot can ever mutate the database
    const validated =
      snapshot && snapshot.reconstruction && snapshot.migrationKey
        ? snapshot
        : validateGuestSnapshot(snapshot);

    const migrationKey = validated.migrationKey;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 2. Idempotency Check in idempotency_keys table
      const { rows: existingKeyRows } = await client.query(
        `SELECT * FROM idempotency_keys WHERE user_id = $1 AND key = $2 FOR UPDATE`,
        [userId, migrationKey]
      );

      if (existingKeyRows.length > 0) {
        const record = existingKeyRows[0];
        if (record.action_type !== 'MIGRATE_GUEST') {
          const err = new Error('Idempotency key already used for a different action');
          err.statusCode = 409;
          throw err;
        }
        // Same user + same key already committed: return stored response idempotently
        await client.query('COMMIT');
        return record.response;
      }

      // 3. Ensure baseline profile exists then lock row FOR UPDATE
      await client.query(
        `INSERT INTO player_profiles (
           user_id,
           total_xp,
           current_level,
           gold,
           streak_days,
           words_learned,
           saved_words,
           quest_units,
           owned_item_ids,
           equipped_ids,
           guest_migrated
         )
         VALUES ($1, 0, 1, 0, 0, 0, '{}', '{}', '{}', '{}', FALSE)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      const { rows: profileRows } = await client.query(
        `SELECT * FROM player_profiles WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      const profile = profileRows[0];


      // 4. Single-Migration Invariant Check
      if (profile.guest_migrated) {
        if (profile.migration_key === migrationKey) {
          // Idempotent retry: profile already committed under this key
          const formatted = this._formatProfile(profile);
          const responsePayload = {
            success: true,
            migrated: true,
            alreadyMigrated: true,
            profile: formatted,
          };
          await client.query('COMMIT');
          return responsePayload;
        } else {
          // Conflict: Account already migrated under a DIFFERENT migration key
          const err = new Error('Tài khoản đã hoàn tất chuyển giao tiến trình trước đó');
          err.statusCode = 409;
          throw err;
        }
      }

      // 5. Merge Semantics
      // A. XP & Level:
      const currentXP = parseInt(profile.total_xp, 10) || 0;
      const finalXP = currentXP + (validated.xp || 0);
      const { level: finalLevel } = calculateLevel(finalXP);

      // B. Gold:
      const currentGold = parseInt(profile.gold, 10) || 0;
      const finalGold = currentGold + (validated.gold || 0);

      // C. Streak:
      const currentStreak = parseInt(profile.streak_days, 10) || 0;
      const finalStreak = Math.max(currentStreak, validated.streak || 0);

      // D. Words Learned:
      const currentWords = parseInt(profile.words_learned, 10) || 0;
      const finalWordsLearned = currentWords + (validated.wordsLearned || 0);

      // E. Saved Words: Deduplicated union
      const existingSavedWords = Array.isArray(profile.saved_words) ? profile.saved_words : [];
      const incomingSavedWords = Array.isArray(validated.savedWords) ? validated.savedWords : [];
      const finalSavedWords = Array.from(new Set([...existingSavedWords, ...incomingSavedWords]));

      // F. Quest Units: Merge by quest/unit identity while preserving valid progression
      const serverQuestUnits =
        profile.quest_units && typeof profile.quest_units === 'object'
          ? profile.quest_units
          : {};
      const incomingQuestUnits =
        validated.questUnits && typeof validated.questUnits === 'object'
          ? validated.questUnits
          : {};

      const finalQuestUnits = { ...serverQuestUnits };

      for (const qId of GUEST_PLAYABLE_QUESTS) {
        const qKey = String(qId);
        const maxUnits = QUEST_CURRICULUM[qId]?.maxUnits || 8;
        const sUnits = Array.isArray(serverQuestUnits[qKey]) ? serverQuestUnits[qKey] : [];
        const gUnits = Array.isArray(incomingQuestUnits[qKey]) ? incomingQuestUnits[qKey] : [];

        // Count contiguous completed units
        // A unit done on server stays done. A validated guest done unit adds to done.
        let doneCount = 0;
        for (let uId = 1; uId <= maxUnits; uId++) {
          const sU = sUnits.find((u) => u && u.id === uId);
          const gU = gUnits.find((u) => u && u.id === uId);
          const isDone = (sU && sU.status === 'done') || (gU && gU.status === 'done');
          if (isDone) {
            doneCount++;
          } else {
            break; // Stop at first non-done unit to maintain contiguous sequence
          }
        }

        const mergedList = [];
        for (let uId = 1; uId <= maxUnits; uId++) {
          let status = 'locked';
          if (uId <= doneCount) {
            status = 'done';
          } else if (uId === doneCount + 1) {
            status = 'active';
          }
          mergedList.push({ id: uId, status });
        }
        finalQuestUnits[qKey] = mergedList;
      }

      // G. Owned Items: Deduplicated union
      const existingOwned = Array.isArray(profile.owned_item_ids) ? profile.owned_item_ids : [];
      const incomingOwned = Array.isArray(validated.ownedItemIds) ? validated.ownedItemIds : [];
      const finalOwnedItemIds = Array.from(new Set([...existingOwned, ...incomingOwned]));

      // H. Equipped Items:
      // If server already has equipment, keep server equipment; else apply guest equipment
      const existingEquipped = Array.isArray(profile.equipped_ids) ? profile.equipped_ids : [];
      const incomingEquipped = Array.isArray(validated.equippedIds) ? validated.equippedIds : [];
      let finalEquippedIds = existingEquipped.length > 0 ? existingEquipped : incomingEquipped;
      // Guarantee equipped items are subset of owned items and max 2
      finalEquippedIds = finalEquippedIds.filter((id) => finalOwnedItemIds.includes(id)).slice(0, 2);

      // I. Daily Missions: Zero reward replay
      const today = toDateStr(new Date());
      const lastReset = toDateStr(profile.last_reset_date);
      let missions = Array.isArray(profile.missions) ? profile.missions : DEFAULT_MISSIONS;

      if (lastReset !== today) {
        missions = DEFAULT_MISSIONS.map((m) => ({ ...m, done: 0, done_flag: false }));
        profile.last_reset_date = today;
      }

      // Merge progress into today's missions without paying any bonus
      if (Array.isArray(validated.missions)) {
        missions = missions.map((serverM) => {
          const guestM = validated.missions.find((gm) => gm.id === serverM.id);
          if (guestM) {
            const mergedDone = Math.min(serverM.total, Math.max(serverM.done || 0, guestM.done || 0));
            return {
              ...serverM,
              done: mergedDone,
              done_flag: mergedDone >= serverM.total,
            };
          }
          return serverM;
        });
      }

      // 6. Update player_profiles
      const { rows: updatedRows } = await client.query(
        `UPDATE player_profiles
         SET total_xp = $2,
             current_level = $3,
             gold = $4,
             streak_days = $5,
             words_learned = $6,
             saved_words = $7,
             missions = $8,
             quest_units = $9,
             owned_item_ids = $10,
             equipped_ids = $11,
             last_active_date = $12,
             last_reset_date = $13,
             guest_migrated = TRUE,
             migration_key = $14,
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          finalXP,
          finalLevel,
          finalGold,
          finalStreak,
          finalWordsLearned,
          finalSavedWords,
          JSON.stringify(missions),
          JSON.stringify(finalQuestUnits),
          finalOwnedItemIds,
          finalEquippedIds,
          profile.last_active_date || today,
          profile.last_reset_date || today,
          migrationKey,
        ]
      );

      const finalProfile = this._formatProfile(updatedRows[0]);
      const responsePayload = {
        success: true,
        migrated: true,
        alreadyMigrated: false,
        appliedRewards: {
          xpAwarded: validated.xp || 0,
          goldAwarded: validated.gold || 0,
          wordsAwarded: validated.wordsLearned || 0,
          unitsCount: validated.reconstruction?.validUnitCount || 0,
        },
        profile: finalProfile,
      };

      // 7. Persist Idempotency Record
      await client.query(
        `INSERT INTO idempotency_keys (user_id, key, action_type, response)
         VALUES ($1, $2, 'MIGRATE_GUEST', $3)
         ON CONFLICT (user_id, key) DO UPDATE SET response = EXCLUDED.response`,
        [userId, migrationKey, JSON.stringify(responsePayload)]
      );

      await client.query('COMMIT');
      return responsePayload;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }


  /**
   * Authoritative Progression Engine (Phase 2B.1)
   * Executes game actions, calculates rewards on the server, updates player_profiles
   * inside a strict PostgreSQL transaction with row locking, and ensures idempotency.
   *
   * @param {string} userId
   * @param {object} payload
   */
  async executeAction(userId, payload) {
    const { action, idempotencyKey } = payload;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Idempotency Check
      if (idempotencyKey) {
        const { rows: existingKey } = await client.query(
          `SELECT * FROM idempotency_keys WHERE user_id = $1 AND key = $2 FOR UPDATE`,
          [userId, idempotencyKey]
        );

        if (existingKey.length > 0) {
          const record = existingKey[0];
          if (record.action_type !== action) {
            const err = new Error('Idempotency key already used for a different action');
            err.statusCode = 409;
            throw err;
          }
          // Same action and key: commit and return previous response without re-executing
          await client.query('COMMIT');
          return record.response;
        }
      }

      // 2. Lock player_profiles row FOR UPDATE
      let { rows: profileRows } = await client.query(
        `SELECT * FROM player_profiles WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      // If no profile exists yet, seed one on the fly inside the transaction
      if (profileRows.length === 0) {
        const { rows: seeded } = await client.query(
          `INSERT INTO player_profiles (
             user_id,
             total_xp,
             current_level,
             gold,
             streak_days,
             words_learned,
             saved_words,
             quest_units,
             owned_item_ids,
             equipped_ids,
             guest_migrated
           )
           VALUES ($1, 0, 1, 0, 0, 0, '{}', '{}', '{}', '{}', FALSE)
           RETURNING *`,
          [userId]
        );
        profileRows = seeded;
      }

      const profile = profileRows[0];
      const today = toDateStr(new Date());

      // 3. Daily Reset Handling
      const lastReset = toDateStr(profile.last_reset_date);

      let missions = profile.missions || DEFAULT_MISSIONS;
      if (lastReset !== today) {
        // Reset daily missions to baseline 0 progress
        missions = DEFAULT_MISSIONS.map((m) => ({ ...m, done: 0, done_flag: false }));
        profile.last_reset_date = today;
      }

      // 4. Streak Tracking
      const lastActive = toDateStr(profile.last_active_date);

      let streakDays = parseInt(profile.streak_days, 10) || 0;
      if (lastActive !== today) {
        const yesterday = toDateStr(new Date(Date.now() - 86400000));
        if (lastActive === yesterday) {
          streakDays += 1;
        } else if (!lastActive) {
          streakDays = 1;
        } else {
          streakDays = 1;
        }
        profile.last_active_date = today;
      }
      profile.streak_days = streakDays;

      // Current balances
      let totalXp = parseInt(profile.total_xp, 10) || 0;
      let gold = parseInt(profile.gold, 10) || 0;
      let wordsLearned = parseInt(profile.words_learned, 10) || 0;
      let savedWords = profile.saved_words || [];
      let questUnits = profile.quest_units || {};
      let ownedItemIds = profile.owned_item_ids || [];
      let equippedIds = profile.equipped_ids || [];
      let lastChatAt = profile.last_chat_at;

      let rewardSummary = { xp: 0, gold: 0, wordsLearned: 0 };
      let missionBonus = { xp: 0, gold: 0, completed: [] };

      // Helper function to advance missions
      const advanceMissionHelper = (type, amount) => {
        missions = missions.map((m) => {
          if (m.type === type && !m.done_flag) {
            const newDone = Math.min(m.total, (m.done || 0) + amount);
            const isFinished = newDone >= m.total;
            if (isFinished) {
              const bonus = MISSION_BONUS[type] || { xp: 0, gold: 0 };
              missionBonus.xp += bonus.xp;
              missionBonus.gold += bonus.gold;
              missionBonus.completed.push(m.title);
              return { ...m, done: newDone, done_flag: true };
            }
            return { ...m, done: newDone, done_flag: false };
          }
          return m;
        });
      };

      // 5. Action Execution
      switch (action) {
        case 'COMPLETE_UNIT': {
          const questId = parseInt(payload.questId, 10);
          const unitId = parseInt(payload.unitId, 10);

          if (!questId || !QUEST_CURRICULUM[questId]) {
            const err = new Error(`Invalid questId: ${payload.questId}`);
            err.statusCode = 400;
            throw err;
          }

          const maxUnits = QUEST_CURRICULUM[questId].maxUnits;
          if (!unitId || unitId < 1 || unitId > maxUnits) {
            const err = new Error(
              `Invalid unitId: ${payload.unitId} for quest ${questId} (max ${maxUnits})`
            );
            err.statusCode = 400;
            throw err;
          }

          const qKey = String(questId);
          let currentUnits = Array.isArray(questUnits[qKey]) ? [...questUnits[qKey]] : [];

          const existingUnit = currentUnits.find((u) => u.id === unitId);
          if (existingUnit && existingUnit.status === 'done') {
            // Already completed: natural idempotency guard
            rewardSummary = { xp: 0, gold: 0, wordsLearned: 0, alreadyCompleted: true };
            break;
          }

          // Mark unit done and activate next unit
          let found = false;
          currentUnits = currentUnits.map((u) => {
            if (u.id === unitId) {
              found = true;
              return { ...u, status: 'done' };
            }
            return u;
          });

          if (!found) {
            currentUnits.push({ id: unitId, status: 'done' });
          }

          // Activate next unit if not done
          if (unitId < maxUnits) {
            const nextIdx = currentUnits.findIndex((u) => u.id === unitId + 1);
            if (nextIdx >= 0) {
              if (currentUnits[nextIdx].status !== 'done') {
                currentUnits[nextIdx] = { ...currentUnits[nextIdx], status: 'active' };
              }
            } else {
              currentUnits.push({ id: unitId + 1, status: 'active' });
            }
          }

          questUnits[qKey] = currentUnits;

          const baseReward = ACTION_REWARDS.COMPLETE_UNIT;
          rewardSummary.xp = baseReward.xp;
          rewardSummary.gold = baseReward.gold;
          rewardSummary.wordsLearned = baseReward.wordsLearned;

          totalXp += baseReward.xp;
          gold += baseReward.gold;
          wordsLearned += baseReward.wordsLearned;

          // Advance words mission by 15
          advanceMissionHelper('words', baseReward.wordsLearned);

          // Add any mission bonus earned
          totalXp += missionBonus.xp;
          gold += missionBonus.gold;
          break;
        }

        case 'COMPLETE_QUIZ': {
          if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
            const err = new Error('idempotencyKey is required for COMPLETE_QUIZ');
            err.statusCode = 400;
            throw err;
          }

          const score = Number(payload.score);
          if (isNaN(score) || score < 0 || score > 100) {
            const err = new Error('Score must be a number between 0 and 100');
            err.statusCode = 400;
            throw err;
          }

          // Authoritative quiz reward calculation
          const earnedXp = Math.min(150, Math.round((score / 100) * 150));
          const earnedGold = Math.floor(earnedXp / 2);

          rewardSummary.xp = earnedXp;
          rewardSummary.gold = earnedGold;

          totalXp += earnedXp;
          gold += earnedGold;

          // Advance quiz mission by 1
          advanceMissionHelper('quiz', 1);

          totalXp += missionBonus.xp;
          gold += missionBonus.gold;
          break;
        }

        case 'SAVE_WORD': {
          const rawWord = payload.word;
          if (!rawWord || typeof rawWord !== 'string' || rawWord.trim().length === 0) {
            const err = new Error('A valid word string is required');
            err.statusCode = 400;
            throw err;
          }

          const normalizedWord = rawWord.toLowerCase().trim();

          if (savedWords.includes(normalizedWord)) {
            // Already saved: natural idempotency guard
            rewardSummary = { xp: 0, gold: 0, wordsLearned: 0, alreadySaved: true };
            break;
          }

          savedWords = [...savedWords, normalizedWord];
          const baseReward = ACTION_REWARDS.SAVE_WORD;

          rewardSummary.xp = baseReward.xp;
          rewardSummary.gold = baseReward.gold;
          rewardSummary.wordsLearned = baseReward.wordsLearned;

          totalXp += baseReward.xp;
          gold += baseReward.gold;
          wordsLearned += baseReward.wordsLearned;

          // Advance words mission by 1
          advanceMissionHelper('words', 1);

          totalXp += missionBonus.xp;
          gold += missionBonus.gold;
          break;
        }

        case 'CHAT_MESSAGE': {
          const message = payload.message;
          if (!message || typeof message !== 'string' || message.trim().length < 3) {
            const err = new Error('Chat message must be at least 3 characters');
            err.statusCode = 400;
            throw err;
          }

          // Server-side Anti-spam / Cooldown (3 seconds)
          const now = Date.now();
          if (lastChatAt) {
            const lastChatTime = new Date(lastChatAt).getTime();
            if (now - lastChatTime < 3000) {
              const waitSeconds = Math.ceil((3000 - (now - lastChatTime)) / 1000);
              const err = new Error(`Vui lòng đợi ${waitSeconds} giây trước khi gửi tin nhắn tiếp theo`);
              err.statusCode = 429;
              throw err;
            }
          }

          lastChatAt = new Date();

          // Advance chat mission by 1 (max 5)
          advanceMissionHelper('chat', 1);

          totalXp += missionBonus.xp;
          gold += missionBonus.gold;

          rewardSummary = {
            xp: 0,
            gold: 0,
            message: 'Chat message recorded',
          };
          break;
        }

        case 'BUY_ITEM': {
          const itemId = String(payload.itemId || '');
          const catalogItem = STORE_ITEMS[itemId];

          if (!catalogItem) {
            const err = new Error(`Item ${itemId} not found in store catalog`);
            err.statusCode = 400;
            throw err;
          }

          if (ownedItemIds.includes(itemId)) {
            const err = new Error(`Item "${catalogItem.name}" is already owned`);
            err.statusCode = 400;
            throw err;
          }

          if (gold < catalogItem.price) {
            const err = new Error(`Insufficient gold: have ${gold}, need ${catalogItem.price}`);
            err.statusCode = 400;
            throw err;
          }

          // Deduct gold and add to inventory
          gold -= catalogItem.price;
          ownedItemIds = [...ownedItemIds, itemId];

          rewardSummary = {
            spentGold: catalogItem.price,
            purchasedItem: { id: catalogItem.id, name: catalogItem.name },
          };
          break;
        }

        default: {
          const err = new Error(`Unsupported action: ${action}`);
          err.statusCode = 400;
          throw err;
        }
      }

      // 6. Recalculate level authoritatively
      const { level: currentLevel } = calculateLevel(totalXp);

      // 7. Update player_profiles in DB
      const { rows: updatedProfileRows } = await client.query(
        `UPDATE player_profiles
         SET total_xp = $2,
             current_level = $3,
             gold = $4,
             streak_days = $5,
             words_learned = $6,
             saved_words = $7,
             missions = $8,
             quest_units = $9,
             owned_item_ids = $10,
             equipped_ids = $11,
             last_active_date = $12,
             last_reset_date = $13,
             last_chat_at = $14,
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          totalXp,
          currentLevel,
          gold,
          streakDays,
          wordsLearned,
          savedWords,
          JSON.stringify(missions),
          JSON.stringify(questUnits),
          ownedItemIds,
          equippedIds,
          profile.last_active_date,
          profile.last_reset_date,
          lastChatAt,
        ]
      );

      const finalProfile = this._formatProfile(updatedProfileRows[0]);

      if (missionBonus.xp > 0 || missionBonus.gold > 0) {
        rewardSummary.missionBonus = missionBonus;
      }

      const responsePayload = {
        success: true,
        action,
        reward: rewardSummary,
        profile: finalProfile,
      };

      // 8. Record in idempotency_keys if key provided
      if (idempotencyKey) {
        await client.query(
          `INSERT INTO idempotency_keys (user_id, key, action_type, response)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, key) DO UPDATE SET response = EXCLUDED.response`,
          [userId, idempotencyKey, action, JSON.stringify(responsePayload)]
        );
      }

      await client.query('COMMIT');
      return responsePayload;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  _formatProfile(row) {
    if (!row) return null;
    return {
      userId: row.user_id,
      totalXp: parseInt(row.total_xp, 10) || 0,
      currentLevel: parseInt(row.current_level, 10) || 1,
      gold: parseInt(row.gold, 10) || 0,
      streakDays: parseInt(row.streak_days, 10) || 0,
      wordsLearned: parseInt(row.words_learned, 10) || 0,
      savedWords: row.saved_words || [],
      missions: row.missions || [],
      questUnits: row.quest_units || {},
      ownedItemIds: row.owned_item_ids || [],
      equippedIds: row.equipped_ids || [],
      lastActiveDate: row.last_active_date,
      lastResetDate: row.last_reset_date,
      lastChatAt: row.last_chat_at,
      guestMigrated: row.guest_migrated || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getProfile(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM player_profiles WHERE user_id = $1`,
      [userId]
    );
    if (rows.length === 0) {
      const { rows: created } = await pool.query(
        `INSERT INTO player_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING RETURNING *`,
        [userId]
      );
      if (created.length > 0) return this._formatProfile(created[0]);
      const { rows: refetched } = await pool.query(
        `SELECT * FROM player_profiles WHERE user_id = $1`,
        [userId]
      );
      return this._formatProfile(refetched[0]);
    }
    return this._formatProfile(rows[0]);
  }

  /**
   * Submit a game score or earned XP for a user (Legacy compatibility wrapper).
   */
  async submitScore(userId, phaseId = null, score = 100, timeSpent = 0, earnedXp = 0) {
    if (score < 0 || score > 100) {
      const err = new Error('Score must be between 0 and 100');
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If no phaseId specified, do not arbitrarily inflate player_profiles; update user_progress record
      if (!phaseId) {
        const { rows } = await client.query(
          `SELECT * FROM user_progress WHERE user_id = $1 ORDER BY started_at ASC LIMIT 1 FOR UPDATE`,
          [userId]
        );

        let progress = rows[0];
        if (!progress) {
          const { rows: created } = await client.query(
            `INSERT INTO user_progress (user_id, status, total_xp, current_level, streak_days, started_at)
             VALUES ($1, 'in_progress', 0, 1, 0, NOW())
             RETURNING *`,
            [userId]
          );
          progress = created[0];
        }

        const newTotalXp = (parseInt(progress.total_xp, 10) || 0) + (parseInt(earnedXp, 10) || 0);
        const calc = this._calculateLevel(newTotalXp);
        const oldLevel = parseInt(progress.current_level, 10) || 1;
        const levelUp = calc.level > oldLevel ? { from: oldLevel, to: calc.level } : null;

        const { rows: updated } = await client.query(
          `UPDATE user_progress
           SET total_xp = $2,
               current_level = $3,
               last_accessed_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [progress.id, newTotalXp, calc.level]
        );

        await client.query('COMMIT');
        return {
          progress: updated[0],
          totalXp: newTotalXp,
          currentLevel: calc.level,
          streakDays: updated[0].streak_days || 0,
          passed: true,
          levelUp,
          nextPhase: null,
          earnedXp,
        };
      }

      // Lock the progress row for specific phase
      const { rows: progressRows } = await client.query(
        `SELECT up.*, lp.name AS phase_name, lp.level, lp.total_lessons, lp.phase_order
         FROM user_progress up
         JOIN learning_phases lp ON lp.id = up.phase_id
         WHERE up.user_id = $1 AND up.phase_id = $2
         FOR UPDATE OF up`,
        [userId, phaseId]
      );

      let progress = progressRows[0];

      if (!progress) {
        const { rows: created } = await client.query(
          `INSERT INTO user_progress (user_id, phase_id, status, total_xp, current_level, streak_days, started_at)
           VALUES ($1, $2, 'in_progress', 0, 1, 0, NOW())
           RETURNING *`,
          [userId, phaseId]
        );
        const { rows: refetched } = await client.query(
          `SELECT up.*, lp.name AS phase_name, lp.level, lp.total_lessons, lp.phase_order
           FROM user_progress up
           JOIN learning_phases lp ON lp.id = up.phase_id
           WHERE up.id = $1`,
          [created[0].id]
        );
        progress = refetched[0];
      }

      if (progress.status === 'completed') {
        await client.query('ROLLBACK');
        const err = new Error('Phase already completed');
        err.statusCode = 409;
        throw err;
      }

      const passed = score >= PASS_THRESHOLD;
      const bestScore = Math.max(parseFloat(progress.score) || 0, score);
      const newStatus = passed ? 'completed' : 'in_progress';
      const newTotalXp = (parseInt(progress.total_xp, 10) || 0) + (parseInt(earnedXp, 10) || 0);
      const calc = this._calculateLevel(newTotalXp);

      const { rows: updatedRows } = await client.query(
        `UPDATE user_progress
         SET score              = $2,
             status             = $3,
             completed_lessons  = CASE WHEN $4 THEN total_lessons ELSE completed_lessons END,
             time_spent_minutes = time_spent_minutes + $5,
             total_xp           = $7,
             current_level      = $8,
             completed_at       = CASE WHEN $4 THEN NOW() ELSE completed_at END,
             last_accessed_at   = NOW()
         FROM (SELECT total_lessons FROM learning_phases WHERE id = $6) lp
         WHERE user_progress.id = $1
         RETURNING user_progress.*`,
        [progress.id, bestScore, newStatus, passed, timeSpent, phaseId, newTotalXp, calc.level]
      );

      const updatedProgress = updatedRows[0];

      let levelUp = null;
      let nextPhase = null;

      if (passed) {
        const currentLevel = progress.level;
        const currentLevelIndex = LEVEL_ORDER.indexOf(currentLevel);

        const { rows: remaining } = await client.query(
          `SELECT COUNT(*)::int AS remaining
           FROM learning_phases lp
           LEFT JOIN user_progress up ON up.phase_id = lp.id AND up.user_id = $1
           WHERE lp.level = $2
             AND lp.status = 'active'
             AND (up.status IS NULL OR up.status != 'completed')`,
          [userId, currentLevel]
        );

        const allLevelDone = remaining[0].remaining === 0;

        if (allLevelDone && currentLevelIndex < LEVEL_ORDER.length - 1) {
          const newLevel = LEVEL_ORDER[currentLevelIndex + 1];
          levelUp = { from: currentLevel, to: newLevel };
          logger.info(`User ${userId} leveled up: ${currentLevel} → ${newLevel}`);
        }

        const { rows: nextRows } = await client.query(
          `SELECT lp.*
           FROM learning_phases lp
           LEFT JOIN user_progress up ON up.phase_id = lp.id AND up.user_id = $1
           WHERE lp.status = 'active'
             AND lp.phase_order > $2
             AND (up.id IS NULL OR up.status NOT IN ('completed', 'in_progress'))
           ORDER BY lp.phase_order ASC
           LIMIT 1`,
          [userId, progress.phase_order]
        );

        nextPhase = nextRows[0] || null;

        if (nextPhase) {
          await client.query(
            `INSERT INTO user_progress (user_id, phase_id, status, started_at)
             VALUES ($1, $2, 'not_started', NOW())
             ON CONFLICT (user_id, phase_id) DO NOTHING`,
            [userId, nextPhase.id]
          );
        }
      }

      await client.query('COMMIT');

      return {
        progress: updatedProgress,
        totalXp: newTotalXp,
        currentLevel: calc.level,
        streakDays: updatedProgress.streak_days || 0,
        passed,
        levelUp,
        nextPhase,
        earnedXp,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  _calculateLevel(totalXp) {
    return calculateLevel(totalXp);
  }

  /**
   * Get aggregated stats for a user. Reads global stats from player_profiles,
   * combined with phase learning metrics from user_progress.
   */
  async getUserStats(userId) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(pp.total_xp, MAX(up.total_xp), 0)::int                      AS total_xp,
         COALESCE(pp.current_level, MAX(up.current_level), 1)::int             AS current_level,
         COALESCE(pp.streak_days, MAX(up.streak_days), 0)::int                AS streak_days,
         COALESCE(pp.gold, 0)::int                                            AS gold,
         COALESCE(pp.words_learned, 0)::int                                   AS words_learned,
         COUNT(up.id)::int                                                    AS total_phases,
         COUNT(*) FILTER (WHERE up.status = 'completed')::int                 AS completed_phases,
         COUNT(*) FILTER (WHERE up.status = 'in_progress')::int               AS in_progress_phases,
         COALESCE(SUM(up.time_spent_minutes), 0)::int                         AS total_time_minutes,
         COALESCE(AVG(up.score) FILTER (WHERE up.status = 'completed'), 0)::numeric(5,2) AS avg_score,
         (
           SELECT lp.level
           FROM user_progress up2
           JOIN learning_phases lp ON lp.id = up2.phase_id
           WHERE up2.user_id = $1 AND up2.status = 'completed'
           ORDER BY lp.phase_order DESC
           LIMIT 1
         ) AS highest_completed_level
       FROM users u
       LEFT JOIN player_profiles pp ON pp.user_id = u.id
       LEFT JOIN user_progress up ON up.user_id = u.id
       WHERE u.id = $1
       GROUP BY pp.total_xp, pp.current_level, pp.streak_days, pp.gold, pp.words_learned`,
      [userId]
    );
    return rows[0];
  }
}

module.exports = new ProgressService();
