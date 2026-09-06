/**
 * Authoritative Server-Side Game Catalog & Progression Constants
 *
 * Centralizes curriculum structure, item shop prices, and level calculations.
 * Prevents client-side price or reward manipulation.
 */

// ─── 1. Canonical Level Formula ──────────────────────────────────────────────
function calculateLevel(totalXp) {
  let level = 1;
  let threshold = 200;
  let step = 300;
  while (totalXp >= threshold) {
    level++;
    threshold += step;
    step += 100;
  }
  return { level, nextLevelXp: threshold };
}

// ─── 2. Curriculum Specification (Quests 1..6) ───────────────────────────────
const QUEST_CURRICULUM = {
  1: { label: 'A1', name: 'Vùng Đất Khởi Đầu', maxUnits: 8 },
  2: { label: 'A2', name: 'Rừng Cơ Bản', maxUnits: 10 },
  3: { label: 'B1', name: 'Hầm Trung Cấp', maxUnits: 12 },
  4: { label: 'B2', name: 'Tháp Thượng Đỉnh', maxUnits: 14 },
  5: { label: 'C1', name: 'Vực Thẳm Tiên Tiến', maxUnits: 16 },
  6: { label: 'C2', name: 'Đỉnh Vinh Quang', maxUnits: 12 },
};

// ─── 3. Store Catalog & Authoritative Prices ─────────────────────────────────
const STORE_ITEMS = {
  '1': { id: '1', name: 'Khiên Chuỗi', price: 400 },
  '2': { id: '2', name: 'Kính Lúp Gợi Ý', price: 250 },
  '3': { id: '3', name: 'Thuốc Nhân Đôi XP', price: 600 },
  '4': { id: '4', name: 'Cuộn Hồi Phục', price: 150 },
  '5': { id: '5', name: 'Ngọc Từ Điển', price: 500 },
  '6': { id: '6', name: 'Mũi Tên Thần Tốc', price: 300 },
};

// ─── 4. Daily Missions Specification ─────────────────────────────────────────
const DEFAULT_MISSIONS = [
  { id: 1, type: 'words', title: 'Học 20 từ mới', done: 0, total: 20, xp: 100, done_flag: false },
  { id: 2, type: 'quiz', title: 'Hoàn thành 1 quiz', done: 0, total: 1, xp: 75, done_flag: false },
  { id: 3, type: 'chat', title: 'Luyện chatbot 5 câu', done: 0, total: 5, xp: 50, done_flag: false },
];

// Mission completion bonus payouts
const MISSION_BONUS = {
  words: { xp: 100, gold: 50 },
  quiz: { xp: 75, gold: 37 },
  chat: { xp: 50, gold: 25 },
};

// ─── 5. Reward Constants for Actions ─────────────────────────────────────────
const ACTION_REWARDS = {
  COMPLETE_UNIT: {
    xp: 60,
    gold: 30,
    wordsLearned: 15,
  },
  SAVE_WORD: {
    xp: 15,
    gold: 7,
    wordsLearned: 1,
  },
};

module.exports = {
  calculateLevel,
  QUEST_CURRICULUM,
  STORE_ITEMS,
  DEFAULT_MISSIONS,
  MISSION_BONUS,
  ACTION_REWARDS,
};
