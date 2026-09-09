import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { progressApi } from '../api/userProgress.api.js';
import { useAuthStore } from './authStore.js';

// ─── Thuật toán tính Level & XP tích lũy toàn cục ────────────────────────────
export function calculateLevelInfo(totalXp) {
  let level = 1;
  let threshold = 200;
  let step = 300;
  let currentLevelBase = 0;

  while (totalXp >= threshold) {
    level++;
    currentLevelBase = threshold;
    threshold += step;
    step += 100;
  }

  return {
    level,
    xp: totalXp,
    xpInCurrentLevel: totalXp - currentLevelBase,
    xpNeededForNext: threshold - currentLevelBase,
    totalNextLevelXp: threshold,
  };
}

// ─── Khởi tạo Lộ Trình chuẩn bắt đầu từ con số 0 ─────────────────────────────
export const INITIAL_QUESTS = [
  { id: 1, label: "A1", name: "Vùng Đất Khởi Đầu", units: 8,  done: 0, color: "#10b981", status: "active", champion: "Ashe"       },
  { id: 2, label: "A2", name: "Rừng Cơ Bản",        units: 10, done: 0, color: "#10b981", status: "locked", champion: "Lux"        },
  { id: 3, label: "B1", name: "Hầm Trung Cấp",      units: 12, done: 0, color: "#6366f1", status: "locked", champion: "Ahri"       },
  { id: 4, label: "B2", name: "Tháp Thượng Đỉnh",   units: 14, done: 0, color: "#505a70", status: "locked", champion: "Ekko"       },
  { id: 5, label: "C1", name: "Vực Thẳm Tiên Tiến", units: 16, done: 0, color: "#505a70", status: "locked", champion: "Zed"        },
  { id: 6, label: "C2", name: "Đỉnh Vinh Quang",    units: 12, done: 0, color: "#505a70", status: "locked", champion: "AurelionSol"},
];

export const INITIAL_QUEST_UNITS = {
  1: [ // A1
    { id: 1, title: "Bảng chữ cái & Phát âm", words: 25, status: "active" },
    { id: 2, title: "Chào hỏi & Tự giới thiệu", words: 30, status: "locked" },
    { id: 3, title: "Số đếm & Màu sắc", words: 28, status: "locked" },
    { id: 4, title: "Gia đình & Bạn bè", words: 35, status: "locked" },
    { id: 5, title: "Đồ vật & Nhà cửa", words: 32, status: "locked" },
    { id: 6, title: "Ẩm thực & Mua sắm", words: 40, status: "locked" },
    { id: 7, title: "Thời gian & Lịch trình", words: 36, status: "locked" },
    { id: 8, title: "Trùm Cuối A1: Đại Thử Thách", words: 50, status: "locked" },
  ],
  2: [ // A2
    { id: 1, title: "Thì hiện tại đơn & thói quen", words: 35, status: "locked" },
    { id: 2, title: "Mô tả tính cách & ngoại hình", words: 30, status: "locked" },
    { id: 3, title: "Du lịch & Địa điểm", words: 42, status: "locked" },
    { id: 4, title: "Sở thích & Thời gian rảnh", words: 38, status: "locked" },
    { id: 5, title: "Sức khỏe & Cảm xúc", words: 40, status: "locked" },
    { id: 6, title: "Phương tiện giao thông", words: 34, status: "locked" },
    { id: 7, title: "Thời tiết & Tự nhiên", words: 36, status: "locked" },
    { id: 8, title: "Giao tiếp công sở cơ bản", words: 45, status: "locked" },
    { id: 9, title: "Mua sắm & Dịch vụ", words: 40, status: "locked" },
    { id: 10, title: "Trùm Cuối A2: Hộ Vệ Lux", words: 60, status: "locked" },
  ],
  3: [ // B1
    { id: 1, title: "Daily Life Vocabulary", words: 40, status: "locked" },
    { id: 2, title: "Past Tenses Deep Dive", words: 30, status: "locked" },
    { id: 3, title: "Travel & Directions", words: 45, status: "locked" },
    { id: 4, title: "Health & Body", words: 38, status: "locked" },
    { id: 5, title: "Work & Career", words: 50, status: "locked" },
    { id: 6, title: "Technology", words: 42, status: "locked" },
    { id: 7, title: "Environment", words: 35, status: "locked" },
    { id: 8, title: "Entertainment", words: 44, status: "locked" },
    { id: 9, title: "Politics & Society", words: 48, status: "locked" },
    { id: 10, title: "Science & Research", words: 52, status: "locked" },
    { id: 11, title: "Arts & Culture", words: 36, status: "locked" },
    { id: 12, title: "Trùm Cuối B1: Hồ Ly Ahri", words: 120, status: "locked" },
  ],
};

// ─── Khởi tạo Nhiệm vụ hằng ngày bắt đầu từ con số 0 ─────────────────────────
export const INITIAL_MISSIONS = [
  { id: 1, type: "words", title: "Học 20 từ mới", done: 0, total: 20, xp: 100, done_flag: false },
  { id: 2, type: "quiz",  title: "Hoàn thành 1 quiz", done: 0, total: 1,  xp: 75,  done_flag: false },
  { id: 3, type: "chat",  title: "Luyện chatbot 5 câu", done: 0, total: 5,  xp: 50,  done_flag: false },
];

// Khóa chống race condition & chuỗi tuần tự hóa giao dịch điểm số
let pendingScorePromise = Promise.resolve();
const inProgressUnits = new Set();
const inProgressWords = new Set();
const inProgressEquip = new Set();

export const useProgressStore = create(
  persist(
    (set, get) => ({
      // Tất cả chỉ số đều bắt đầu từ 0
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
      lastResetDate: new Date().toISOString().slice(0, 10),

      // Lộ trình, Nhiệm vụ, Kho đồ & Từ vựng
      missions: INITIAL_MISSIONS,
      quests: INITIAL_QUESTS,
      questUnits: INITIAL_QUEST_UNITS,
      activeQuestIndex: 0, // A1
      savedWords: [],
      ownedItemIds: [],
      equippedIds: [],

      // ─── 0.0 BẮT SNAPSHOT TIẾN TRÌNH KHÁCH CHỜ MIGRATION (PHASE 2C) ──
      // Tách biệt hoàn toàn trách nhiệm giữa Guest Snapshot và Server Hydration.
      // Chỉ được gọi ở ranh giới Authentication TRƯỚC KHI user được authenticated.
      capturePendingGuestMigration: () => {
        // C4-1 & C4-5: Tuyệt đối không bao giờ snapshot trạng thái đã authenticated
        const authState = useAuthStore.getState();
        if (authState.isAuthenticated) {
          return null;
        }

        const state = get();
        // C4-2 & C4-3: Nếu đã có snapshot được lưu từ trước, TUYỆT ĐỐI không ghi đè và không tạo key mới
        if (state.pendingGuestMigration) {
          return state.pendingGuestMigration;
        }

        // Chỉ bắt snapshot khi thực sự có dữ liệu tiến trình Khách chưa đồng bộ
        const hasWork =
          state.hasUnsyncedGuestProgress ||
          state.xp > 0 ||
          state.gold > 0 ||
          state.wordsLearned > 0 ||
          (state.savedWords && state.savedWords.length > 0) ||
          (state.ownedItemIds && state.ownedItemIds.length > 0);

        if (!hasWork) {
          return null;
        }

        // C4-2: Tạo migrationKey DUY NHẤT một lần tại thời điểm bắt snapshot
        const migrationKey =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `mig_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

        const snapshot = {
          migrationKey,
          xp: state.xp,
          gold: state.gold,
          streak: state.streak,
          wordsLearned: state.wordsLearned,
          savedWords: [...(state.savedWords || [])],
          missions: JSON.parse(JSON.stringify(state.missions || INITIAL_MISSIONS)),
          questUnits: JSON.parse(JSON.stringify(state.questUnits || INITIAL_QUEST_UNITS)),
          ownedItemIds: [...(state.ownedItemIds || [])],
          equippedIds: [...(state.equippedIds || [])],
          lastResetDate: state.lastResetDate,
          snapshotAt: Date.now(),
        };

        set({
          pendingGuestMigration: snapshot,
          hasUnsyncedGuestProgress: true,
        });

        return snapshot;
      },

      // ─── 0.1 ÁP DỤNG PROFILE TỪ SERVER CHO USER AUTHENTICATED ───────
      // Điểm tập trung duy nhất (Canonical mapping path) đưa PostgreSQL profile vào Zustand.
      // Đơn nhiệm: Chỉ cập nhật các trường tiến trình authoritative của server.
      applyServerProfile: (serverData) => {
        if (!serverData) return;
        const profile = serverData.profile || serverData.data || serverData;
        const totalXp = parseInt(profile.totalXp ?? profile.total_xp, 10) || 0;
        const currentLevel =
          parseInt(profile.currentLevel ?? profile.current_level, 10) ||
          calculateLevelInfo(totalXp).level;
        const gold = parseInt(profile.gold, 10) || 0;
        const streak = parseInt(profile.streakDays ?? profile.streak_days, 10) || 0;
        const wordsLearned = parseInt(profile.wordsLearned ?? profile.words_learned, 10) || 0;
        const savedWords = Array.isArray(profile.savedWords ?? profile.saved_words)
          ? (profile.savedWords ?? profile.saved_words)
          : [];
        const missions = Array.isArray(profile.missions) ? profile.missions : get().missions;

        // Hòa nhập questUnits: Đảm bảo giữ metadata tiêu đề và số từ của client
        const serverUnits = profile.questUnits ?? profile.quest_units ?? {};
        const mergedQuestUnits = { ...INITIAL_QUEST_UNITS };
        Object.keys(mergedQuestUnits).forEach((qId) => {
          const initList = mergedQuestUnits[qId] || [];
          const sUnits = serverUnits[qId] || serverUnits[String(qId)] || [];
          if (Array.isArray(sUnits) && sUnits.length > 0) {
            mergedQuestUnits[qId] = initList.map((initU) => {
              const su = sUnits.find((u) => u.id === initU.id);
              return su ? { ...initU, status: su.status } : initU;
            });
          }
        });

        // Tính toán trạng thái các Quest từ mergedQuestUnits
        const updatedQuests = (get().quests || INITIAL_QUESTS).map((q) => {
          const units = mergedQuestUnits[q.id] || [];
          const doneCount = units.filter((u) => u.status === 'done').length;
          const allDone = units.length > 0 && doneCount >= units.length;
          return {
            ...q,
            done: doneCount,
            status: allDone ? 'complete' : q.status === 'locked' ? 'locked' : 'active',
          };
        });

        // Chuẩn hóa item IDs
        const rawOwned = profile.ownedItemIds ?? profile.owned_item_ids ?? [];
        const rawEquipped = profile.equippedIds ?? profile.equipped_ids ?? [];
        const ownedItemIds = rawOwned.map((id) => (isNaN(Number(id)) ? id : Number(id)));
        const equippedIds = rawEquipped.map((id) => (isNaN(Number(id)) ? id : Number(id)));

        set({
          xp: totalXp,
          level: currentLevel,
          gold,
          streak,
          wordsLearned,
          savedWords,
          missions,
          questUnits: mergedQuestUnits,
          quests: updatedQuests,
          ownedItemIds,
          equippedIds,
          lastResetDate: profile.lastResetDate ?? profile.last_reset_date ?? get().lastResetDate,
          // TUYỆT ĐỐI KHÔNG can thiệp vào pendingGuestMigration hoặc hasUnsyncedGuestProgress
        });
      },

      // ─── 0.1 KIỂM TRA RESET NHIỆM VỤ HÀNG NGÀY (GUEST) ──────────────
      checkDailyReset: () => {
        const today = new Date().toISOString().slice(0, 10);
        const state = get();
        if (state.lastResetDate !== today) {
          set({
            missions: INITIAL_MISSIONS,
            lastResetDate: today,
          });
        }
      },

      // ─── 0.2 SERVER-VERIFIED LESSON ATTEMPTS (PHASE 4A.4) ────────────
      startLessonAttempt: async (questId, unitId) => {
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated) {
          return { isGuest: true };
        }

        try {
          const res = await progressApi.startLesson({ questId, unitId });
          const payload = res?.data || res;
          return { success: true, isGuest: false, ...payload };
        } catch (err) {
          console.error('Lỗi khi khởi tạo bài học từ máy chủ:', err);
          return { success: false, isGuest: false, error: err };
        }
      },

      submitLessonAttempt: async ({ attemptId, answers, questId, unitId, idempotencyKey = null }) => {
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated) {
          return { isGuest: true };
        }

        try {
          const res = await progressApi.submitLesson({ attemptId, answers, idempotencyKey });
          const payload = res?.data || res;

          if (payload?.passed) {
            if (payload?.profile) {
              get().applyServerProfile(payload.profile);
            }

            const reward = payload?.reward || {};
            if (!reward.alreadyCompleted) {
              const earnedXp = reward.xp || 60;
              const earnedWords = reward.wordsLearned || 15;
              toast.success(`⚔️ Vượt qua Unit ${unitId}! (+${earnedXp} XP, +${earnedWords} từ mới)`);

              if (reward.missionBonus?.completed?.length) {
                reward.missionBonus.completed.forEach((title) => {
                  toast.success(`🎖️ Hoàn thành nhiệm vụ: "${title}"! (+${reward.missionBonus.xp} XP)`, { duration: 3500 });
                });
              }
            }
          }

          return { success: true, isGuest: false, ...payload };
        } catch (err) {
          console.error('Lỗi khi nộp bài học lên máy chủ:', err);
          toast.error(err.message || 'Không thể gửi kết quả bài học. Vui lòng thử lại!');
          return { success: false, isGuest: false, error: err };
        }
      },

      // ─── 1. HOÀN THÀNH BÀI HỌC TRONG LỘ TRÌNH ──────────────────────
      completeUnitLesson: async (questId, unitId, attemptId = null, customKey = null) => {
        const unitKey = `${questId}-${unitId}`;
        if (inProgressUnits.has(unitKey)) {
          return { success: false, inProgress: true };
        }

        const state = get();
        const units = state.questUnits[questId] || [];
        const currentUnit = units.find((u) => u.id === unitId);

        if (!currentUnit || currentUnit.status === 'done') {
          toast('Bài học này bạn đã hoàn thành trước đó!');
          return { success: false, alreadyDone: true };
        }

        const authState = useAuthStore.getState();
        const isAuthenticated = authState.isAuthenticated;

        inProgressUnits.add(unitKey);
        try {
          // AUTHENTICATED: Server-authoritative action qua POST /progress/action
          if (isAuthenticated) {
            const idempotencyKey = customKey || `unit_${questId}_${unitId}`;
            try {
              const res = await progressApi.executeAction({
                action: 'COMPLETE_UNIT',
                questId,
                unitId,
                attemptId,
                idempotencyKey,
              });

              const payload = res?.data || res;
              if (payload?.profile) {
                get().applyServerProfile(payload.profile);
              }

              const reward = payload?.reward || {};
              if (reward.alreadyCompleted) {
                toast('Bài học này bạn đã hoàn thành trước đó!');
                return { success: true, alreadyDone: true };
              }

              const earnedXp = reward.xp || 60;
              const earnedWords = reward.wordsLearned || 15;
              toast.success(`⚔️ Vượt qua Unit ${unitId}! (+${earnedXp} XP, +${earnedWords} từ mới)`);

              if (reward.missionBonus?.completed?.length) {
                reward.missionBonus.completed.forEach((title) => {
                  toast.success(`🎖️ Hoàn thành nhiệm vụ: "${title}"! (+${reward.missionBonus.xp} XP)`, { duration: 3500 });
                });
              }

              return { success: true };
            } catch (err) {
              console.error('Lỗi khi hoàn thành bài học:', err);
              toast.error(err.message || 'Không thể kết nối đến máy chủ để hoàn thành bài học. Vui lòng thử lại!');
              return { success: false, error: err };
            }
          }

          // GUEST: Chuẩn bị trạng thái cập nhật tiếp theo của Unit & Quest cục bộ
          const updatedUnits = units.map((u) => {
            if (u.id === unitId) return { ...u, status: 'done' };
            if (u.id === unitId + 1 && u.status === 'locked') return { ...u, status: 'active' };
            return u;
          });

          const doneCount = updatedUnits.filter((u) => u.status === 'done').length;
          const allDone = doneCount >= updatedUnits.length;

          const updatedQuests = state.quests.map((q) => {
            if (q.id === questId) {
              return {
                ...q,
                done: doneCount,
                status: allDone ? 'complete' : 'active',
              };
            }
            if (allDone && q.id === questId + 1 && q.status === 'locked') {
              return { ...q, status: 'active' };
            }
            return q;
          });

          const earnedWords = 15;
          const earnedXp = 60;

          // Nộp điểm vào hệ thống qua submitScore cho Guest
          const res = await get().submitScore(earnedXp, { wordsLearned: earnedWords, silent: true });

          if (res?.success) {
            set({
              questUnits: {
                ...get().questUnits,
                [questId]: updatedUnits,
              },
              quests: updatedQuests,
            });
            toast.success(`⚔️ Vượt qua Unit ${unitId}! (+${earnedXp} XP, +${earnedWords} từ mới)`);
            return { success: true };
          } else {
            return { success: false, error: res?.error };
          }
        } finally {
          inProgressUnits.delete(unitKey);
        }
      },

      // ─── 2. HOÀN THÀNH QUIZ (ARENA) ───────────────────────────────
      completeQuiz: async (score, idempotencyKey) => {
        const authState = useAuthStore.getState();
        const isAuthenticated = authState.isAuthenticated;

        if (isAuthenticated) {
          const key =
            idempotencyKey ||
            (typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `quiz_${Date.now()}_${Math.random().toString(36).slice(2)}`);

          try {
            const res = await progressApi.executeAction({
              action: 'COMPLETE_QUIZ',
              score,
              idempotencyKey: key,
            });

            const payload = res?.data || res;
            if (payload?.profile) {
              get().applyServerProfile(payload.profile);
            }

            const reward = payload?.reward || {};
            const earnedXp = reward.xp || 0;
            const earnedGold = reward.gold || 0;

            if (reward.missionBonus?.completed?.length) {
              reward.missionBonus.completed.forEach((title) => {
                toast.success(`🎖️ Hoàn thành nhiệm vụ: "${title}"! (+${reward.missionBonus.xp} XP)`, { duration: 3500 });
              });
            }

            if (earnedXp > 0) {
              toast.success(`🏆 Hoàn thành Quiz! (+${earnedXp} XP, +${earnedGold} Vàng)`);
            }

            return { success: true, reward, profile: payload?.profile };
          } catch (err) {
            console.error('Lỗi khi nộp điểm quiz lên server:', err);
            toast.error(err.message || 'Không thể lưu kết quả quiz lên máy chủ. Vui lòng thử lại!');
            return { success: false, error: err };
          }
        }

        // GUEST: Tính điểm và nộp cục bộ
        const earnedXp = Math.min(Math.round((score / 100) * 150), 150);
        return get().submitScore(earnedXp, { score, isQuiz: true });
      },

      // ─── 3. LƯU TỪ VỰNG TỪ ĐIỂN (CODEX) ───────────────────────────
      saveWord: async (rawWord, xpOrCustomKey = 15, customKey = null) => {
        const word = String(rawWord || '').toLowerCase().trim();
        if (!word) return { success: false };

        if (get().savedWords.includes(word) || inProgressWords.has(word)) {
          toast('Từ vựng này bạn đã lưu trước đó!');
          return { success: false, alreadySaved: true };
        }

        const authState = useAuthStore.getState();
        const isAuthenticated = authState.isAuthenticated;
        const actualCustomKey = typeof xpOrCustomKey === 'string' && !customKey ? xpOrCustomKey : customKey;
        const xp = typeof xpOrCustomKey === 'number' ? xpOrCustomKey : 15;

        inProgressWords.add(word);
        try {
          if (isAuthenticated) {
            const idempotencyKey = actualCustomKey || `word_${word}`;
            try {
              const res = await progressApi.executeAction({
                action: 'SAVE_WORD',
                word,
                idempotencyKey,
              });

              const payload = res?.data || res;
              if (payload?.profile) {
                get().applyServerProfile(payload.profile);
              }

              const reward = payload?.reward || {};
              if (reward.alreadySaved) {
                toast('Từ vựng này bạn đã lưu trước đó!');
                return { success: false, alreadySaved: true };
              }

              const earnedXp = reward.xp || 15;
              toast.success(`📖 Đã ghi nhớ: "${word}"! (+${earnedXp} XP)`);

              if (reward.missionBonus?.completed?.length) {
                reward.missionBonus.completed.forEach((title) => {
                  toast.success(`🎖️ Hoàn thành nhiệm vụ: "${title}"! (+${reward.missionBonus.xp} XP)`, { duration: 3500 });
                });
              }

              return { success: true, alreadySaved: false };
            } catch (err) {
              console.error('Lỗi khi lưu từ vựng lên máy chủ:', err);
              toast.error(err.message || 'Không thể lưu từ vựng lên máy chủ. Vui lòng thử lại!');
              return { success: false, error: err };
            }
          }

          // GUEST: Lưu cục bộ
          const res = await get().submitScore(xp, { wordsLearned: 1, silent: true });
          if (res?.success) {
            set((s) => ({
              savedWords: [...s.savedWords, word],
            }));
            toast.success(`📖 Đã ghi nhớ: "${word}"! (+${xp} XP)`);
            return { success: true, alreadySaved: false };
          } else {
            return { success: false, error: res?.error };
          }
        } finally {
          inProgressWords.delete(word);
        }
      },

      // ─── 4. GỬI TIN NHẮN CHATJOY (JOYBUBBLE) ────────────────────────
      sendChatMessage: async (message, customKey = null) => {
        const text = String(message || '').trim();
        if (text.length < 3) return { success: false };

        const authState = useAuthStore.getState();
        const isAuthenticated = authState.isAuthenticated;

        if (isAuthenticated) {
          try {
            const idempotencyKey =
              customKey ||
              (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`);

            const res = await progressApi.executeAction({
              action: 'CHAT_MESSAGE',
              message: text,
              idempotencyKey,
            });

            const payload = res?.data || res;
            if (payload?.profile) {
              get().applyServerProfile(payload.profile);
            }

            const reward = payload?.reward || {};
            if (reward.missionBonus?.completed?.length) {
              reward.missionBonus.completed.forEach((title) => {
                toast.success(`🎖️ Hoàn thành nhiệm vụ: "${title}"! (+${reward.missionBonus.xp} XP)`, { duration: 3500 });
              });
            }

            return { success: true };
          } catch (err) {
            if (err?.statusCode === 429 || err?.response?.status === 429) {
              // Cooldown êm đẹp, không gây lỗi UI
              return { success: false, cooldown: true };
            }
            console.warn('Lỗi gửi chat message lên server:', err);
            return { success: false, error: err };
          }
        }

        // GUEST: Cập nhật nhiệm vụ chat cục bộ
        return get().submitScore(0, { isChat: true, silent: true });
      },

      // ─── 5. MUA & QUẢN LÝ VẬT PHẨM KHO ĐỒ ──────────────────────────
      buyItem: async (item, customKey = null) => {
        const itemId = String(item.id || item);
        const state = get();

        if (state.ownedItemIds.some((id) => String(id) === itemId)) {
          toast('Bạn đã sở hữu vật phẩm này rồi!');
          return false;
        }

        const authState = useAuthStore.getState();
        const isAuthenticated = authState.isAuthenticated;

        if (isAuthenticated) {
          try {
            const idempotencyKey =
              customKey ||
              (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `buy_${itemId}_${Date.now()}`);

            const res = await progressApi.executeAction({
              action: 'BUY_ITEM',
              itemId,
              idempotencyKey,
            });

            const payload = res?.data || res;
            if (payload?.profile) {
              get().applyServerProfile(payload.profile);
            }

            toast.success(`🛒 Đã mua thành công ${item.name || 'vật phẩm'}!`);
            return true;
          } catch (err) {
            console.error('Lỗi khi mua vật phẩm:', err);
            toast.error(err.message || 'Không đủ vàng để mua vật phẩm này!');
            return false;
          }
        }

        // GUEST: Kiểm tra và trừ vàng cục bộ
        if (state.gold < item.price) {
          toast.error('Không đủ vàng để mua vật phẩm này!');
          return false;
        }

        set({
          gold: Math.max(0, state.gold - item.price),
          ownedItemIds: [...state.ownedItemIds, item.id],
        });

        toast.success(`🛒 Đã mua thành công ${item.name}!`);
        return true;
      },

      toggleEquip: async (id, customKey = null) => {
        const itemId = String(id);
        const state = get();

        if (!state.ownedItemIds.some((itemKey) => String(itemKey) === itemId)) {
          toast.error('Bạn cần mua vật phẩm này trước khi trang bị!');
          return { success: false, notOwned: true };
        }

        const authState = useAuthStore.getState();
        const isAuthenticated = authState.isAuthenticated;

        // AUTHENTICATED: Server-authoritative action qua POST /progress/action
        if (isAuthenticated) {
          if (inProgressEquip.has(itemId)) {
            return { success: false, inProgress: true };
          }

          inProgressEquip.add(itemId);
          try {
            const idempotencyKey =
              customKey ||
              (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `equip_${itemId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

            const res = await progressApi.executeAction({
              action: 'EQUIP_ITEM',
              itemId,
              idempotencyKey,
            });

            const payload = res?.data || res;
            if (payload?.profile) {
              get().applyServerProfile(payload.profile);
            }

            const isNowEquipped =
              payload?.reward?.equipped ??
              payload?.equipped ??
              (payload?.profile?.equippedIds || []).some((k) => String(k) === itemId);

            if (isNowEquipped) {
              toast.success('⚔️ Đã trang bị vật phẩm thành công!');
            } else {
              toast('🛡️ Đã gỡ trang bị vật phẩm.');
            }

            return { success: true, equipped: isNowEquipped, profile: payload?.profile };
          } catch (err) {
            console.error('Lỗi khi trang bị vật phẩm:', err);
            toast.error(err.message || 'Không thể cập nhật trang bị!');
            return { success: false, error: err };
          } finally {
            inProgressEquip.delete(itemId);
          }
        }

        // GUEST: Cập nhật cục bộ với quy tắc tối đa 2 vật phẩm
        const isEquipped = state.equippedIds.some((itemKey) => String(itemKey) === itemId);
        if (isEquipped) {
          const newEquipped = state.equippedIds.filter((itemKey) => String(itemKey) !== itemId);
          set({ equippedIds: newEquipped });
          toast('🛡️ Đã gỡ trang bị vật phẩm.');
          return { success: true, equipped: false };
        } else {
          if (state.equippedIds.length >= 2) {
            toast.error('Chỉ có thể trang bị tối đa 2 vật phẩm cùng lúc!');
            return { success: false, maxReached: true };
          }
          const newEquipped = [...state.equippedIds, isNaN(Number(id)) ? id : Number(id)];
          set({ equippedIds: newEquipped });
          toast.success('⚔️ Đã trang bị vật phẩm!');
          return { success: true, equipped: true };
        }
      },

      // Chọn Quest trên bản đồ
      setActiveQuestIndex: (index) => {
        set({ activeQuestIndex: index });
      },

      // ─── 6. TÍCH LŨY XP & ĐỒNG BỘ CỤC BỘ (GUEST PIPELINE) ─────────
      // Sử dụng hàng đợi pendingScorePromise để tuần tự hóa triệt để mọi giao dịch cho Guest
      submitScore: (earnedXp = 0, options = {}) => {
        const executeTransaction = async () => {
          get().checkDailyReset();
          const authState = useAuthStore.getState();
          const isAuthenticated = authState.isAuthenticated;

          // Nếu user đã authenticate mà gọi submitScore (legacy):
          // Điều hướng an toàn sang các action tương ứng để tránh client tự phong thưởng
          if (isAuthenticated) {
            if (options.isQuiz) {
              return get().completeQuiz(options.score ?? 100);
            }
            if (options.isChat) {
              return get().sendChatMessage('Chat message');
            }
            // Không tự ý cộng điểm persistent cục bộ cho authenticated user
            return { success: true, xp: get().xp, level: get().level };
          }

          // CHẾ ĐỘ KHÁCH (GUEST):
          const currentLevel = get().level;
          const safeXp = Math.max(0, Math.min(earnedXp, 500)); // Client clamp

          let missionBonusXp = 0;
          const newlyCompletedMissions = [];
          const currentMissions = get().missions || [];

          const updatedMissions = currentMissions.map((m) => {
            let amountToAdd = 0;
            if (m.type === 'words' && options.wordsLearned) {
              amountToAdd = options.wordsLearned;
            } else if (m.type === 'quiz' && options.isQuiz) {
              amountToAdd = 1;
            } else if (m.type === 'chat' && options.isChat) {
              amountToAdd = 1;
            }

            if (amountToAdd > 0 && !m.done_flag) {
              const newDone = Math.min(m.total, m.done + amountToAdd);
              const isFinished = newDone >= m.total;
              if (isFinished) {
                missionBonusXp += m.xp;
                newlyCompletedMissions.push(m);
              }
              return { ...m, done: newDone, done_flag: isFinished };
            }
            return m;
          });

          const totalXpToAward = safeXp + missionBonusXp;
          const goldToAward = Math.floor(safeXp / 2) + Math.floor(missionBonusXp / 2);
          const wordsToAward = options.wordsLearned || 0;

          let newLevel;
          set((state) => {
            const newXp = state.xp + totalXpToAward;
            newLevel = calculateLevelInfo(newXp).level;
            return {
              missions: updatedMissions,
              xp: newXp,
              level: newLevel,
              gold: state.gold + goldToAward,
              wordsLearned: state.wordsLearned + wordsToAward,
              hasUnsyncedGuestProgress: true,
            };
          });

          newlyCompletedMissions.forEach((m) => {
            toast.success(`🎖️ Hoàn thành nhiệm vụ: "${m.title}"! (+${m.xp} XP)`, { duration: 3500 });
          });

          if (newLevel > currentLevel) {
            toast.success(`🎉 LÊN CẤP ${newLevel}!`);
          } else if (safeXp > 0 && !options.silent) {
            toast.success(`+${safeXp} XP`);
          }

          return { success: true, xp: get().xp, level: newLevel, isGuest: true };
        };

        const chainedPromise = pendingScorePromise.then(executeTransaction);
        pendingScorePromise = chainedPromise.catch(() => {});
        return chainedPromise;
      },

      // ─── 7. CẬP NHẬT TIẾN ĐỘ NHIỆM VỤ (GUEST CONVENIENCE) ───────────
      incrementMission: async (type, amount = 1) => {
        if (type === 'words') return await get().submitScore(0, { wordsLearned: amount, silent: true });
        if (type === 'quiz') return await get().submitScore(0, { isQuiz: true, silent: true });
        if (type === 'chat') return await get().sendChatMessage('Hello Joy');
        return { success: false };
      },

      // ─── 8. ĐỒNG BỘ DỮ LIỆU KHÁCH LÊN TÀI KHOẢN MỚI ───────────────
      // (Được bảo lưu cho Phase 2C - Guest Migration)
      syncGuestData: async () => {
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated) return;

        const state = get();
        if (!state.hasUnsyncedGuestProgress || state.xp <= 0) return;

        set({ isSyncing: true });
        try {
          const res = await axiosClient.post('/progress/submit-score', {
            earnedXp: Math.min(state.xp, 500),
            score: 100,
          });

          const data = res?.data || res;
          const syncedXp = data?.totalXp ?? state.xp;
          const syncedLevel = data?.currentLevel ?? calculateLevelInfo(syncedXp).level;

          set({
            xp: syncedXp,
            level: syncedLevel,
            hasUnsyncedGuestProgress: false,
            isSyncing: false,
          });

          toast.success(`🚀 Đã đồng bộ thành công ${state.xp} XP từ chế độ Khách vào tài khoản!`);
          return { success: true, syncedXp };
        } catch (err) {
          console.error('Không thể đồng bộ dữ liệu khách lên máy chủ:', err);
          set({ isSyncing: false });
          return { success: false, error: err };
        }
      },

      // ─── 9. NẠP TIẾN TRÌNH TỪ DB CHO USER ĐÃ ĐĂNG NHẬP ─────────────
      fetchUserProgress: async () => {
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated) return;

        // 1. Ranh giới Authentication: Bắt snapshot Guest TRƯỚC KHI hydrate Server Profile
        get().capturePendingGuestMigration();

        // 2. Fetch authoritative profile từ PostgreSQL
        try {
          const res = await progressApi.getProfile();
          const raw = res?.data || res;
          const profile = raw?.profile || raw?.data || raw;
          if (profile) {
            get().applyServerProfile(profile);
          }
        } catch (err) {
          console.warn('Không thể nạp profile tiến trình từ DB:', err);
        }
      },

      // ─── 9.1 GUEST MIGRATION ACTION (PHASE 2C.4A) ──────────────────
      // Chuyển đổi tiến trình Guest đã capture vào tài khoản authenticated
      migrateGuestProgress: async (options = {}) => {
        // 1. Kiểm tra trạng thái xác thực
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated) {
          return { success: false, reason: 'unauthenticated' };
        }

        // 2 & 3. Đọc DUY NHẤT snapshot pending. TUYỆT ĐỐI không gọi capturePendingGuestMigration() ở đây
        const state = get();
        const snapshot = state.pendingGuestMigration;
        if (!snapshot) {
          return { success: true, noData: true };
        }

        // 5. Kiểm tra in-flight guard
        if (state.isMigrating) {
          return { success: false, inFlight: true };
        }

        // 6. Đặt isMigrating = true
        set({ isMigrating: true });

        // 7. Gửi request migration qua API helper (sử dụng migrationKey đã đóng băng trong snapshot)
        try {
          const res = await progressApi.migrateGuest({
            migrationKey: snapshot.migrationKey,
            snapshot,
          });

          // 8. On confirmed HTTP success:
          const raw = res?.data || res;
          const profile = raw?.profile || raw?.data?.profile || (raw?.data && raw?.data.migrated ? raw.data.profile : null) || raw;
          if (profile) {
            get().applyServerProfile(profile);
          }

          set({
            pendingGuestMigration: null,
            hasUnsyncedGuestProgress: false,
            migrationConflict: null,
            isMigrating: false,
          });

          return {
            success: true,
            migrated: true,
            summary: raw?.summary || raw?.data?.summary,
          };
        } catch (err) {
          // 10. On 409 Conflict:
          const isConflict =
            err?.status === 409 ||
            err?.response?.status === 409 ||
            err?.code === 'MIGRATION_CONFLICT' ||
            err?.conflict === true;

          if (isConflict) {
            // DO NOT clear snapshot, set isMigrating = false
            set({ isMigrating: false });

            let cloudProfile = null;
            try {
              const profRes = await progressApi.getProfile();
              const rawProf = profRes?.data || profRes;
              cloudProfile = rawProf?.profile || rawProf?.data?.profile || rawProf?.data || rawProf;
              if (cloudProfile) {
                get().applyServerProfile(cloudProfile);
              }
            } catch (profErr) {
              console.warn('Không thể nạp profile cloud sau khi phát hiện migration conflict:', profErr);
            }

            const conflictData = {
              message: err?.message || 'Xung đột tiến trình: Tài khoản đã có tiến trình trên máy chủ',
              code: err?.code || 'MIGRATION_CONFLICT',
              reason: err?.reason || 'CLOUD_PROGRESS_EXISTS',
              existingSummary: err?.existingSummary || null,
              guestSummary: err?.guestSummary || null,
              cloudProfile,
              pendingSnapshot: snapshot,
              detectedAt: Date.now(),
            };

            // Lưu migrationConflict và bảo toàn nguyên vẹn pendingGuestMigration
            set({
              migrationConflict: conflictData,
            });

            return {
              success: false,
              conflict: true,
              reason: conflictData.reason,
              conflictData,
              error: err,
            };
          }

          // 9. On 400 / 500 / timeout / network error:
          // DO NOT clear snapshot, DO NOT clear migrationKey, set isMigrating = false
          set({ isMigrating: false });
          return {
            success: false,
            retryable: true,
            error: err,
            message: err?.message || 'Lỗi mạng hoặc hệ thống khi chuyển đổi tiến trình khách',
          };
        }
      },

      // ─── 9.2 HỦY BỎ SNAPSHOT MIGRATION (EXPLICIT USER ACTION) ───────
      // Chỉ được gọi bởi hành động chủ đích từ người dùng (destructive local decision)
      discardPendingGuestMigration: () => {
        set({
          pendingGuestMigration: null,
          hasUnsyncedGuestProgress: false,
          migrationConflict: null,
        });
      },

      // ─── 10. RESET TIẾN TRÌNH VỀ BASELINE ───────────────────────────
      resetProgress: (options = {}) => {
        const current = get();
        // Bảo lưu snapshot migration nếu chưa được Phase 2C xử lý, trừ khi ép buộc xóa
        const preservedSnapshot = options?.forceClearGuestSnapshot ? null : current.pendingGuestMigration;
        const preservedHasUnsynced = options?.forceClearGuestSnapshot ? false : (current.hasUnsyncedGuestProgress && Boolean(preservedSnapshot));
        const preservedConflict = options?.forceClearGuestSnapshot ? null : current.migrationConflict;

        set({
          xp: 0,
          level: 1,
          streak: 0,
          gold: 0,
          wordsLearned: 0,
          isSyncing: false,
          isMigrating: false,
          hasUnsyncedGuestProgress: preservedHasUnsynced,
          pendingGuestMigration: preservedSnapshot,
          migrationConflict: preservedConflict,
          lastResetDate: new Date().toISOString().slice(0, 10),
          missions: INITIAL_MISSIONS,
          quests: INITIAL_QUESTS,
          questUnits: INITIAL_QUEST_UNITS,
          activeQuestIndex: 0,
          savedWords: [],
          ownedItemIds: [],
          equippedIds: [],
        });
      },
    }),
    {
      name: 'engjoy-guest-progress',
      version: 3,
      migrate: (persistedState, version) => {
        if (version !== 3) {
          return {
            xp: 0,
            level: 1,
            streak: 0,
            gold: 0,
            wordsLearned: 0,
            isSyncing: false,
            hasUnsyncedGuestProgress: false,
            lastResetDate: new Date().toISOString().slice(0, 10),
            missions: INITIAL_MISSIONS,
            quests: INITIAL_QUESTS,
            questUnits: INITIAL_QUEST_UNITS,
            activeQuestIndex: 0,
            savedWords: [],
            ownedItemIds: [],
            equippedIds: [],
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        xp: state.xp,
        level: state.level,
        streak: state.streak,
        gold: state.gold,
        wordsLearned: state.wordsLearned,
        hasUnsyncedGuestProgress: state.hasUnsyncedGuestProgress,
        pendingGuestMigration: state.pendingGuestMigration,
        lastResetDate: state.lastResetDate,
        missions: state.missions,
        quests: state.quests,
        questUnits: state.questUnits,
        activeQuestIndex: state.activeQuestIndex,
        savedWords: state.savedWords,
        ownedItemIds: state.ownedItemIds,
        equippedIds: state.equippedIds,
      }),
    }
  )
);
