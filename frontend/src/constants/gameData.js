// ─── Riot Data Dragon CDN Configuration ───────────────────────────────────────
export const DDV = "16.17.1";
export const DDR = "https://ddragon.leagueoflegends.com/cdn";

export const item = (id) => `${DDR}/${DDV}/img/item/${id}.png`;
export const champ = (name) => `${DDR}/${DDV}/img/champion/${name}.png`;
export const splash = (name, skin = 0) => `${DDR}/img/champion/splash/${name}_${skin}.jpg`;
export const loading = (name, skin = 0) => `${DDR}/img/champion/loading/${name}_${skin}.jpg`;
export const spell = (name) => `${DDR}/${DDV}/img/spell/${name}.png`;
export const profileIcon = (id) => `${DDR}/${DDV}/img/profileicon/${id}.png`;

// Pre-configured League of Legends API icon URLs
export const LOL_ICONS = {
  xp: spell("SummonerFlash"),
  streak: spell("SummonerDot"),
  hp: spell("SummonerHeal"),
  gold: item(3850),
  battle: item(1036),
  shield: item(1054),
  potion: item(2003),
  robot: champ("Blitzcrank"),
  logo: profileIcon(588),
};

// ─── Constants & Types ────────────────────────────────────────────────────────
export const RARITY = {
  common:    { label: "Thường",      color: "#8892a8", bg: "rgba(136,146,168,.12)", border: "rgba(136,146,168,.25)" },
  uncommon:  { label: "Hiếm",        color: "#10b981", bg: "rgba(16,185,129,.12)",  border: "rgba(16,185,129,.3)"  },
  rare:      { label: "Quý",         color: "#06b6d4", bg: "rgba(6,182,212,.12)",   border: "rgba(6,182,212,.3)"   },
  epic:      { label: "Sử thi",      color: "#8b5cf6", bg: "rgba(139,92,246,.12)",  border: "rgba(139,92,246,.3)"  },
  legendary: { label: "Huyền thoại", color: "#f59e0b", bg: "rgba(245,158,11,.12)", border: "rgba(245,158,11,.35)" },
};

export const INITIAL_USER = {
  name: "Tân Hiệp Sĩ",
  class: "Novice Scholar",
  champion: "Lux",
  level: 1,
  xp: 0,
  xpNext: 200,
  hp: 100,
  hpMax: 100,
  streak: 0,
  wordsLearned: 0,
  gold: 0,
  equippedIds: [],
};

// LoL item IDs mapped to EngJoy inventory items
export const INITIAL_ITEMS = [
  {
    id: 1,
    name: "Khiên Chuỗi",
    rarity: "epic",
    desc: "Bảo vệ chuỗi học một lần khi bạn quên học.",
    effect: "Bảo vệ streak x1",
    price: 400,
    owned: false,
    equipped: false,
    cooldown: null,
    lolItem: 3190,
    lolName: "Locket of Iron Solari",
  },
  {
    id: 2,
    name: "Kính Lúp Gợi Ý",
    rarity: "rare",
    desc: "Tiết lộ gợi ý cho câu hỏi khó trong quiz.",
    effect: "Gợi ý miễn phí x3",
    price: 250,
    owned: false,
    equipped: false,
    cooldown: null,
    lolItem: 3364,
    lolName: "Oracle Lens",
  },
  {
    id: 3,
    name: "Thuốc Nhân Đôi XP",
    rarity: "legendary",
    desc: "Nhân đôi toàn bộ XP kiếm được trong 30 phút.",
    effect: "x2 XP / 30 phút",
    price: 600,
    owned: false,
    equipped: false,
    cooldown: null,
    lolItem: 2010,
    lolName: "Total Biscuit of Everlasting Will",
  },
  {
    id: 4,
    name: "Cuộn Hồi Phục",
    rarity: "uncommon",
    desc: "Khôi phục 25 HP sau khi thua một trận.",
    effect: "+25 HP sau thua",
    price: 150,
    owned: false,
    equipped: false,
    cooldown: null,
    lolItem: 2055,
    lolName: "Control Ward",
  },
  {
    id: 5,
    name: "Ngọc Từ Điển",
    rarity: "epic",
    desc: "Thêm ví dụ và hình ảnh vào từ tra cứu.",
    effect: "Từ điển nâng cao",
    price: 500,
    owned: false,
    equipped: false,
    cooldown: null,
    lolItem: 3916,
    lolName: "Harrowing Crescent",
  },
  {
    id: 6,
    name: "Mũi Tên Thần Tốc",
    rarity: "rare",
    desc: "Thêm 10 giây mỗi vòng trong game tính giờ.",
    effect: "+10s timer mỗi vòng",
    price: 300,
    owned: false,
    equipped: false,
    cooldown: null,
    lolItem: 3153,
    lolName: "Blade of the Ruined King",
  },
];

export const QUESTS = [
  { id: 1, label: "A1", name: "Vùng Đất Khởi Đầu", units: 8,  done: 0, color: "#10b981", status: "active", champion: "Ashe"       },
  { id: 2, label: "A2", name: "Rừng Cơ Bản",        units: 10, done: 0, color: "#10b981", status: "locked", champion: "Lux"        },
  { id: 3, label: "B1", name: "Hầm Trung Cấp",      units: 12, done: 0, color: "#6366f1", status: "locked", champion: "Ahri"       },
  { id: 4, label: "B2", name: "Tháp Thượng Đỉnh",   units: 14, done: 0, color: "#505a70", status: "locked", champion: "Ekko"       },
  { id: 5, label: "C1", name: "Vực Thẳm Tiên Tiến", units: 16, done: 0, color: "#505a70", status: "locked", champion: "Zed"        },
  { id: 6, label: "C2", name: "Đỉnh Vinh Quang",    units: 12, done: 0, color: "#505a70", status: "locked", champion: "AurelionSol"},
];

export const B1_UNITS = [
  { id: 1,  title: "Bảng chữ cái & Phát âm", words: 25,  status: "active" },
  { id: 2,  title: "Chào hỏi & Tự giới thiệu", words: 30,  status: "locked" },
  { id: 3,  title: "Số đếm & Màu sắc", words: 28,  status: "locked" },
  { id: 4,  title: "Gia đình & Bạn bè", words: 35,  status: "locked" },
  { id: 5,  title: "Đồ vật & Nhà cửa", words: 32,  status: "locked" },
  { id: 6,  title: "Ẩm thực & Mua sắm", words: 40,  status: "locked" },
  { id: 7,  title: "Thời gian & Lịch trình", words: 36,  status: "locked" },
  { id: 8,  title: "Trùm Cuối A1: Đại Thử Thách", words: 50,  status: "locked" },
];

export const MISSIONS = [
  { id: 1, type: "words", title: "Học 20 từ mới",        done: 0, total: 20, xp: 100, done_flag: false },
  { id: 2, type: "quiz",  title: "Hoàn thành 1 quiz",    done: 0, total: 1,  xp: 75,  done_flag: false },
  { id: 3, type: "chat",  title: "Luyện chatbot 5 câu",  done: 0, total: 5,  xp: 50,  done_flag: false },
];

export const CODEX_ENTRY = {
  word: "Serendipity",
  phonetic: "/ˌser.ənˈdɪp.ɪ.ti/",
  type: "noun",
  level: "C1",
  freq: "Medium",
  meaning: "The occurrence of events by chance in a happy or beneficial way.",
  meaning_vn: "Sự may mắn tình cờ — hạnh phúc đến bất ngờ mà không ai lường trước.",
  examples: [
    "It was pure serendipity that they met at the airport.",
    "Many great scientific discoveries were made through serendipity.",
  ],
  synonyms: ["luck", "fortune", "chance", "coincidence", "happenstance"],
  antonyms: ["misfortune", "bad luck", "design", "plan"],
  collocations: ["by serendipity", "pure serendipity", "a moment of serendipity"],
  xp: 15,
};

export const ARENA_GAMES = [
  { id: "quiz",   name: "Ngục Quiz",     desc: "Trả lời câu hỏi trong giới hạn thời gian",   xp: 50, players: "1.2k", hot: true,  champion: "Ezreal"   },
  { id: "match",  name: "Ghép Từ",       desc: "Ghép từ với nghĩa đúng trước khi hết giờ",  xp: 40, players: "876",  hot: false, champion: "Jinx"     },
  { id: "listen", name: "Trận Nghe",     desc: "Nghe phát âm rồi gõ từ đúng chính tả",     xp: 60, players: "654",  hot: false, champion: "Sona"     },
  { id: "spell",  name: "Đấu Đánh Vần", desc: "Đánh vần từng từ khó — không được sai",    xp: 45, players: "432",  hot: false, champion: "Orianna"  },
  { id: "battle", name: "Đại Chiến 1v1",desc: "Thi đấu thời gian thực với người chơi khác", xp: 80, players: "321",  hot: true,  champion: "Zed"      },
];

export const QUIZ_Q = [
  { q: "'Ephemeral' có nghĩa là gì?",                 opts: ["Vĩnh cửu", "Thoáng qua", "Bí ẩn", "Rực rỡ"],           ans: 1 },
  { q: "Chọn từ đồng nghĩa với 'Benevolent':",        opts: ["Tàn nhẫn", "Nhân từ", "Lười biếng", "Thông minh"],      ans: 1 },
  { q: "She _____ English for 3 years. (đúng nhất):", opts: ["studied", "has been studying", "studies", "is studying"],ans: 1 },
];

export const BOT_REPLIES = {
  grammar: "Mình giải thích ngay!\n\n**Present Perfect** dùng khi:\n• Hành động quá khứ còn ảnh hưởng hiện tại\n\nVí dụ: *I have studied English for 3 years.*\n\nBạn thử đặt một câu xem!",
  hello:   "Chào mừng trở lại! Hôm nay muốn luyện gì?\n• Ngữ pháp\n• Từ vựng\n• Hội thoại",
  vocab:   "Đây là 3 từ chủ đề **Technology** hôm nay:\n\n• **Algorithm** — thuật toán\n• **Interface** — giao diện\n• **Bandwidth** — băng thông\n\nLuyện flashcard ngay nhé!",
  default: "Hay đó! Cần mình giải thích thêm không?\n\nHoặc thử hỏi mình về ngữ pháp, từ vựng nhé!",
};

export const NAV_ITEMS = [
  { id: "home",      label: "Tổng quan" },
  { id: "learn",     label: "Lộ trình"  },
  { id: "codex",     label: "Từ điển"   },
  { id: "arena",     label: "Arena"     },
  { id: "inventory", label: "Kho đồ"    },
];
