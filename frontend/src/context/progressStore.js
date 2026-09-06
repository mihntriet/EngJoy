import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from './authStore';

/**
 * Công thức tính cấp độ RPG dựa trên tổng XP:
 * - Cấp 1: 0 - 199 XP
 * - Cấp 2: 200 - 499 XP (cần thêm 300 XP)
 * - Cấp 3: 500 - 899 XP (cần thêm 400 XP)
 * - Cấp 4: 900 - 1399 XP (cần thêm 500 XP)...
 */
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
      lastResetDate: new Date().toISOString().slice(0, 10),

      // Lộ trình, Nhiệm vụ, Kho đồ & Từ vựng
      missions: INITIAL_MISSIONS,
      quests: INITIAL_QUESTS,
      questUnits: INITIAL_QUEST_UNITS,
      activeQuestIndex: 0, // A1
      savedWords: [],
      ownedItemIds: [],
      equippedIds: [],

      // ─── 0. KIỂM TRA RESET NHIỆM VỤ HÀNG NGÀY ─────────────────────
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

      // ─── 1. TÍCH LŨY XP & ĐỒNG BỘ ──────────────────────────────────
      // Single-owner duy nhất cho mọi tính toán thưởng XP, Gold, Level và Nhiệm vụ
      // Sử dụng hàng đợi pendingScorePromise để tuần tự hóa triệt để mọi giao dịch đồng thời
      submitScore: (earnedXp = 0, options = {}) => {
        const executeTransaction = async () => {
          get().checkDailyReset();
          const authState = useAuthStore.getState();
          const isAuthenticated = authState.isAuthenticated;
          const currentLevel = get().level;
          const safeXp = Math.max(0, Math.min(earnedXp, 500)); // Client-side anti-cheat clamp

          // Bước 1: Tính toán chuyển đổi trạng thái nhiệm vụ (Pure State Transition)
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

          // Bước 2A: Người dùng đã đăng nhập (Persist xuống PostgreSQL trước khi commit state)
          if (isAuthenticated) {
            if (totalXpToAward > 0 || options.isQuiz || options.phaseId) {
              try {
                // Gửi toàn bộ XP kiếm được (hành động + nhiệm vụ) trong 1 request nguyên tử duy nhất
                const res = await axiosClient.post('/progress/submit-score', {
                  earnedXp: Math.min(totalXpToAward, 500),
                  score: options.score ?? 100,
                  phaseId: options.phaseId ?? null,
                  timeSpent: options.timeSpent ?? 0,
                });

                const resPayload = res?.data || res;
                const serverData = resPayload?.data || resPayload;
                const serverTotalXp = serverData?.totalXp ?? (get().xp + totalXpToAward);
                const serverLevel = serverData?.currentLevel ?? calculateLevelInfo(serverTotalXp).level;
                const serverStreak = serverData?.streakDays ?? get().streak;

                // Commit vào cache Zustand khi Server đã xác nhận thành công
                set((state) => ({
                  missions: updatedMissions,
                  xp: serverTotalXp,
                  level: serverLevel,
                  streak: serverStreak,
                  gold: state.gold + goldToAward,
                  wordsLearned: state.wordsLearned + wordsToAward,
                  hasUnsyncedGuestProgress: false,
                }));

                // Thông báo thành tích
                newlyCompletedMissions.forEach((m) => {
                  toast.success(`🎖️ Hoàn thành nhiệm vụ: "${m.title}"! (+${m.xp} XP)`, { duration: 3500 });
                });

                if (serverData?.levelUp || serverLevel > currentLevel) {
                  toast.success(`🎉 LÊN CẤP ${serverLevel}!`);
                } else if (safeXp > 0 && !options.silent) {
                  toast.success(`+${safeXp} XP`);
                }

                return { success: true, xp: serverTotalXp, level: serverLevel };
              } catch (err) {
                // API thất bại: Không tạo XP/Gold ảo trong local store mà server chưa xác nhận
                console.error('Lỗi khi lưu tiến trình lên máy chủ:', err);
                toast.error('Không thể kết nối đến máy chủ để lưu tiến trình. Vui lòng thử lại!');
                return { success: false, error: err };
              }
            } else {
              // Không có XP và không có quiz/phase: chỉ cập nhật tiến độ nhiệm vụ cục bộ (ví dụ chat 1/5)
              set({ missions: updatedMissions });
              return { success: true, xp: get().xp, level: get().level };
            }
          }

          // Bước 2B: Chế độ Khách (Guest) — Một giao dịch set() nguyên tử đơn nhất
          let newLevel;
          set((state) => {
            const newXp = state.xp + totalXpToAward;
            const levelInfo = calculateLevelInfo(newXp);
            newLevel = levelInfo.level;
            return {
              missions: updatedMissions,
              xp: newXp,
              level: newLevel,
              gold: state.gold + goldToAward,
              wordsLearned: state.wordsLearned + wordsToAward,
              hasUnsyncedGuestProgress: true,
            };
          });

          // Thông báo thành tích cho khách
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

      // ─── 2. CẬP NHẬT TIẾN ĐỘ NHIỆM VỤ HÀNG NGÀY ────────────────────
      // Single-owner delegation: Điều hướng qua submitScore để tránh phân mảnh logic
      incrementMission: async (type, amount = 1) => {
        if (type === 'words') return await get().submitScore(0, { wordsLearned: amount, silent: true });
        if (type === 'quiz') return await get().submitScore(0, { isQuiz: true, silent: true });
        if (type === 'chat') return await get().submitScore(0, { isChat: true, silent: true });
        return { success: false };
      },

      // ─── 3. HOÀN THÀNH BÀI HỌC TRONG LỘ TRÌNH ──────────────────────
      completeUnitLesson: async (questId, unitId) => {
        const unitKey = `${questId}-${unitId}`;
        if (inProgressUnits.has(unitKey)) {
          return { success: false, inProgress: true };
        }

        const state = get();
        const units = state.questUnits[questId] || [];
        const currentUnit = units.find((u) => u.id === unitId);

        if (!currentUnit || currentUnit.status === "done") {
          toast('Bài học này bạn đã hoàn thành trước đó!');
          return { success: false, alreadyDone: true };
        }

        inProgressUnits.add(unitKey);
        try {
          // Chuẩn bị trạng thái cập nhật tiếp theo của Unit & Quest
          const updatedUnits = units.map((u) => {
            if (u.id === unitId) return { ...u, status: "done" };
            if (u.id === unitId + 1 && u.status === "locked") return { ...u, status: "active" };
            return u;
          });

          const doneCount = updatedUnits.filter((u) => u.status === "done").length;
          const allDone = doneCount >= updatedUnits.length;

          const updatedQuests = state.quests.map((q) => {
            if (q.id === questId) {
              return {
                ...q,
                done: doneCount,
                status: allDone ? "complete" : "active",
              };
            }
            if (allDone && q.id === questId + 1 && q.status === "locked") {
              return { ...q, status: "active" };
            }
            return q;
          });

          const earnedWords = 15;
          const earnedXp = 60;

          // Nộp điểm vào hệ thống qua submitScore trước
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
            // Không khóa ải nếu submitScore thất bại (cho phép thử lại khi mạng ổn định)
            return { success: false, error: res?.error };
          }
        } finally {
          inProgressUnits.delete(unitKey);
        }
      },

      // ─── 4. LƯU TỪ VỰNG TỪ ĐIỂN (CHUẨN HÓA & CHỐNG TRÙNG) ───────────
      saveWord: async (rawWord, xp = 15) => {
        const word = String(rawWord || '').toLowerCase().trim();
        if (!word) return { success: false };

        if (get().savedWords.includes(word) || inProgressWords.has(word)) {
          toast('Từ vựng này bạn đã lưu trước đó!');
          return { success: false, alreadySaved: true };
        }

        inProgressWords.add(word);
        try {
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

      // ─── 5. MUA & QUẢN LÝ VẬT PHẨM KHO ĐỒ ──────────────────────────
      buyItem: (item) => {
        const state = get();
        if (state.gold < item.price) {
          toast.error('Không đủ vàng để mua vật phẩm này!');
          return false;
        }
        if (state.ownedItemIds.includes(item.id)) {
          toast('Bạn đã sở hữu vật phẩm này rồi!');
          return false;
        }

        set({
          gold: Math.max(0, state.gold - item.price),
          ownedItemIds: [...state.ownedItemIds, item.id],
        });

        toast.success(`🛒 Đã mua thành công ${item.name}!`);
        return true;
      },

      toggleEquip: (id) => {
        set((state) => {
          if (!state.ownedItemIds.includes(id)) {
            toast.error('Bạn cần mua vật phẩm này trước khi trang bị!');
            return state;
          }
          const isEquipped = state.equippedIds.includes(id);
          const newEquipped = isEquipped
            ? state.equippedIds.filter((itemKey) => itemKey !== id)
            : [...state.equippedIds, id];

          return { equippedIds: newEquipped };
        });
      },

      // Chọn Quest trên bản đồ
      setActiveQuestIndex: (index) => {
        set({ activeQuestIndex: index });
      },

      // ─── 6. ĐỒNG BỘ DỮ LIỆU KHÁCH LÊN TÀI KHOẢN MỚI ───────────────
      syncGuestData: async () => {
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated) return;

        const state = get();
        // Chỉ sync khi thực sự có điểm tích lũy chưa sync từ phiên khách
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

      // Tải tiến trình từ DB về store cho user đã đăng nhập
      fetchUserProgress: async () => {
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated) return;

        try {
          const res = await axiosClient.get('/progress/stats');
          const stats = res?.data || res;
          if (stats) {
            const totalXp = parseInt(stats.total_xp ?? stats.totalXp, 10) || 0;
            const currentLevel = parseInt(stats.current_level ?? stats.currentLevel, 10) || calculateLevelInfo(totalXp).level;
            const streakDays = parseInt(stats.streak_days ?? stats.streakDays, 10) || 0;

            set({
              xp: totalXp,
              level: currentLevel,
              streak: streakDays,
              hasUnsyncedGuestProgress: false, // Reset cờ sau khi nạp từ DB
            });
          }
        } catch (err) {
          console.warn('Không thể lấy stats tiến trình từ DB:', err);
        }
      },

      // Reset toàn bộ tiến trình về 0 (đăng xuất hoặc làm mới)
      resetProgress: () => {
        set({
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
