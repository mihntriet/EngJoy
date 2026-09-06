# 🛡️ ENGJOY – GAMIFIED ENGLISH LEARNING PLATFORM
## TÀI LIỆU BÀN GIAO & TỔNG KẾT TIẾN ĐỘ DỰ ÁN (PROJECT HANDOVER)

> **Ngày cập nhật**: Tháng 9/2026  
> **Dành cho**: Bạn & AI Coding Assistant khi tiếp tục làm việc trong các phiên tiếp theo.  
> **Cách sử dụng**: Khi quay lại làm việc, chỉ cần copy toàn bộ nội dung file này hoặc gửi file này cho AI để AI nắm bắt 100% ngữ cảnh mà không cần giải thích lại từ đầu.

---

## 📌 1. TỔNG QUAN DỰ ÁN (EXECUTIVE SUMMARY)

- **Tên dự án**: **EngJoy – Gamified English Learning Platform**
- **Ý tưởng cốt lõi**: Nền tảng học tiếng Anh được game hóa theo phong cách **RPG / Dark Fantasy**, lấy cảm hứng từ vũ trụ **League of Legends** (sử dụng Data Dragon API của Riot Games).
- **Mục tiêu sản phẩm**: Biến việc học tiếng Anh thành một cuộc phiêu lưu diệt quái, vượt ải dungeon, săn trang bị, nâng cấp nhân vật (Novice Scholar → Adept Mage → Master Scholar), thách đấu Arena và học cùng trợ lý AI Joy Coach.
- **Trạng thái hiện tại**:
  - Đã xây dựng hoàn thiện **Kiến trúc Dual-State Progression** (khách độc lập, người dùng đồng bộ cơ sở dữ liệu).
  - Đã thực hiện **Audit toàn diện Backend & Frontend**, xử lý bảo mật IDOR, chống spam XP, sửa CORS.
  - Đã **Redesign toàn bộ giao diện UI/UX** chuẩn Dark Fantasy RPG: Hero "Next Quest" tinh gọn, Core Stats không trùng lặp, Daily Missions nổi bật, RPG XP progress bar trực quan, Responsive hoàn hảo từ Desktop đến Mobile (Drawer menu mượt mà).
  - Dự án build thành công 100% không có lỗi (`npm run build` exit code 0).

---

## 🏗️ 2. CÔNG NGHỆ & HẠ TẦNG (TECH STACK)

| Tầng | Công nghệ / Thư viện | Mô tả & Cấu hình |
|---|---|---|
| **Frontend** | React 18, Vite 5 | Cổng: `http://localhost:3000` |
| | Zustand + Persist | Dual-State: `engjoy-guest-progress` (LocalStorage) & `authStore` |
| | React Router DOM v6 | Định tuyến: `/`, `/learn`, `/codex`, `/arena`, `/inventory`, `/login`, `/register` |
| | Axios, React Hot Toast | HTTP client & thông báo toast RPG |
| | CSS System | Tokens HSL/Hex Dark Fantasy, Google Fonts `Plus Jakarta Sans`, Tailwind v4 + Vanilla CSS |
| | Assets API | Riot Data Dragon CDN (Tướng, Splash Art, Trang bị, Phép bổ trợ, Icon rank) |
| **Backend** | Node.js, Express | Cổng: `http://localhost:5000` (API prefix: `/api/v1`) |
| | Kiến trúc 3 lớp | Route → Controller → Service → Repository |
| | Bảo mật | JWT, bcrypt, Helmet, express-rate-limit, Joi validation, Winston logger, CORS whitelist |
| **Databases (Docker)**| PostgreSQL 15 | Quản lý Users, Tiến độ (`user_progress`), Cài đặt, Lộ trình học (Cổng host: `5433` -> `5432`) |
| | MongoDB 6.0 | Lưu trữ Từ điển chuyên sâu (`dictionary`), ngữ cảnh từ vựng (Cổng: `27017`) |
| | Redis 7 | Cache tra cứu từ vựng, cache bảng xếp hạng & rate limit (Cổng: `6379`) |

---

## 📂 3. CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT STRUCTURE)

```
EngJoy/
├── compose.yaml                    # Docker Compose: PostgreSQL (5433), MongoDB (27017), Redis (6379)
├── PROJECT_HANDOVER.md             # File bàn giao tổng hợp này
│
├── backend/
│   ├── server.js                   # Điểm khởi động server Express (port 5000)
│   ├── test-db.js                  # Script kiểm tra kết nối Postgres, Mongo, Redis
│   ├── package.json
│   ├── .env                        # Biến môi trường (DB URLs, JWT secrets, CORS)
│   └── src/
│       ├── app.js                  # Cấu hình Express middleware, CORS, Routes
│       ├── config/                 # Kết nối DB: postgres.js, mongo.js, redis.js
│       ├── controllers/            # auth, progress, userProgress, learningPhase, dictionary
│       ├── middlewares/            # auth.middleware.js, error.middleware.js, rateLimiter.js
│       ├── models/                 # Mongoose schemas (Dictionary, Word, Quiz)
│       ├── repositories/           # Tương tác PostgreSQL (auth, progress, userProgress, learningPhase)
│       ├── routes/                 # /auth, /progress, /user-progress, /learning-phases, /dictionary
│       ├── services/               # Nghiệp vụ: auth, progress, userProgress, learningPhase, dictionary
│       └── utils/                  # logger.js, response.js
│
└── frontend/
    ├── package.json
    ├── vite.config.js              # Cấu hình dev server port 3000
    ├── index.html                  # Thẻ meta, font Plus Jakarta Sans
    └── src/
        ├── App.jsx                 # Layout chính: Sidebar, Header, Routes, Mobile drawer
        ├── main.jsx                # Entry point ReactDOM
        ├── api/                    # Axios instances & endpoint mappings (auth, progress, learning, dictionary)
        ├── constants/
        │   └── gameData.js         # Riot Data Dragon API endpoints, Champion list, Items, Missions
        ├── context/
        │   ├── authStore.js        # Quản lý token, user state, login/register/logout
        │   └── progressStore.js    # Dual-State Progression (XP, Level, Streak, Gold, Missions, Items)
        ├── styles/
        │   └── index.css           # Design tokens (--bg, --bg-card, --purple, --gold), RPG animations, responsive
        ├── components/
        │   ├── layout/
        │   │   ├── Header.jsx      # Compact pills (Streak, XP, Gold), Page Title, Search, User dropdown
        │   │   └── Sidebar.jsx     # Navigation-centric, User card, Brand, Guest CTA
        │   ├── common/             # Card, LoLIcon, ChampPortrait, ItemIcon, Bar, Chip
        │   └── chat/
        │       └── JoyBubble.jsx   # AI Coach nổi (Heimerdinger/Joy), mission tracking
        └── pages/
            ├── Dashboard.jsx       # Trang chủ RPG: Next Quest, Core Stats, Daily Missions, Character Status
            ├── Learning.jsx        # Bản đồ Lộ trình Dungeon (A1 -> C2) & bài học Unit
            ├── Dictionary.jsx      # Tra cứu từ điển Codex & lưu từ vựng (+XP)
            ├── Arena.jsx           # Đấu trường ngữ pháp & Quiz PvP
            ├── Inventory.jsx       # Kho đồ trang bị & Cửa hàng mua sắm vật phẩm
            ├── Login.jsx           # Đăng nhập (tải DB progress)
            └── Register.jsx        # Đăng ký (Transaction tạo user_progress = 0, đồng bộ guest progress)
```

---

## 🎮 4. CÁC TÍNH NĂNG ĐÃ HOÀN THIỆN (KEY ACCOMPLISHMENTS)

### 4.1. Kiến trúc Dual-State Progression & Zero-Progress (Hoàn tất 100%)
- **Chế độ Khách (Guest Mode)**:
  - Bắt đầu với điểm số 0: `Level 1`, `0 XP`, `0 Gold`, `0 Streak`, `0 Từ vựng`, `0/3 Nhiệm vụ`.
  - Mọi hoạt động (học bài, làm quiz, tra từ vựng) đều tích lũy vào store được lưu trong LocalStorage `engjoy-guest-progress`.
- **Chế độ Đăng ký / Đăng nhập (Authenticated User)**:
  - Khi đăng ký, backend dùng PostgreSQL Transaction tạo `users` và đồng thời `INSERT INTO user_progress` với `total_xp = 0`, `current_level = 1`, `streak_days = 0`.
  - Toàn bộ tiến trình tích lũy lúc khách học được tự động đồng bộ lên Database khi đăng ký.
  - Khi đăng xuất: Gọi `resetProgress()` làm sạch bộ nhớ để không rò rỉ dữ liệu sang phiên đăng nhập khác.

### 4.2. Bảo Mật & Toàn Vẹn Dữ Liệu (Audit Đã Fix)
- **IDOR Fix**: Tại `userProgress.service.js` và `userProgress.repository.js`, bắt buộc kiểm tra `user_id` sở hữu đối với các thao tác `updateLesson`, `complete`, `delete`.
- **Chống Hack XP**: Giới hạn tối đa `earnedXp <= 500` mỗi request tại `progress.controller.js`.
- **Chống Spam Submit**:
  - `Arena.jsx`: Thêm cờ `submitted` ngăn chặn spam click gửi câu trả lời.
  - `Learning.jsx`: Thêm cờ `submitting` khi bấm bắt đầu ải.
  - `JoyBubble.jsx`: Thêm throttle 4 giây và yêu cầu tin nhắn $\ge 3$ ký tự mới tính tiến độ nhiệm vụ.
  - `Dictionary.jsx`: Chuẩn hóa từ viết thường (lowercase) tránh lưu trùng từ để farm XP.
- **Tự động làm mới nhiệm vụ hàng ngày**: Kiểm tra `lastResetDate`, tự động làm mới 3 nhiệm vụ mỗi khi sang ngày mới.

### 4.3. Redesign Toàn Diện UI/UX Dashboard (Đạt chuẩn Production)
- **Next Quest Hero (160–180px)**:
  - Thay thế Hero to chiếm chỗ bằng thẻ hành động nhiệm vụ tiếp theo.
  - Ảnh tướng (Ashe/Lux/...) nằm mượt mà bên phải với gradient fade.
  - Bên trái hiển thị thẻ ải tiếp theo (lấy động từ `quests`), badge phần thưởng `+60 XP`, `+25 Từ vựng` và nút **Primary CTA** tím neon: `BẮT ĐẦU HỌC NGAY →`.
- **Hàng Core Stats Tinh Gọn**:
  - 1 hàng duy nhất gồm 4 thẻ: `⚡ 0 XP`, `📖 0 Từ`, `🔥 0 Ngày`, `🪙 0 Vàng`.
  - Không lặp lại cùng một chỉ số ở nhiều nơi.
- **Nhiệm vụ Hằng Ngày (Daily Missions)**:
  - Đưa lên vị trí trang trọng, thiết kế compact (cao ~65px mỗi mission), thanh progress bar trực quan, badge phần thưởng và trạng thái Hoàn thành rõ rệt.
- **Trạng thái Nhân vật (Character Status)**:
  - Hiển thị cấp bậc (`Level 1 · Novice Scholar`), thanh kinh nghiệm RPG thể hiện rõ `0 / 200 XP (0%)` và thông báo tiến độ `Còn 200 XP nữa để thăng cấp Lv.2`.
- **Kho đồ Empty State**:
  - Thông điệp truyền cảm hứng cho hiệp sĩ mới nhập môn kèm nút bấm dẫn sang `/inventory`.
- **CTA Lưu Tiến Trình cho Khách**:
  - Thẻ `LƯU GIỮ HÀNH TRÌNH CỦA BẠN` thúc đẩy khách đăng ký để không mất điểm.
- **Sidebar & Header**:
  - Header: Thu gọn các pill chỉ số, thêm thanh tìm kiếm mờ, menu dropdown tài khoản.
  - Sidebar: Tập trung hoàn toàn vào điều hướng, logo Porito, user mini card, active indicators sáng tím.
- **Responsive Hoàn Hảo**:
  - Desktop 1440px / 1280px hiển thị chuẩn tỷ lệ vàng.
  - Tablet 768px tự động co giãn 2 cột.
  - Mobile 390px / 375px ẩn các pill phụ, hiển thị nút Hamburger mở Sidebar dạng Drawer trượt mượt mà kèm lớp phủ mờ (Backdrop).

---

## 🚀 5. HƯỚNG DẪN KHỞI ĐỘNG LẠI DỰ ÁN (QUICK START)

Khi mở lại máy tính sau kỳ nghỉ, chỉ cần chạy các lệnh sau:

### Bước 1: Khởi động Cơ sở dữ liệu Docker
```bash
# Tại thư mục gốc: d:\24C02\EngJoy_App\EngJoy
docker compose up -d
```
*Kiểm tra các container đã chạy: `docker ps` (sẽ thấy `el_postgres`, `el_mongodb`, `el_redis`).*

### Bước 2: Khởi động Backend
```bash
cd backend
npm run dev
```
*Backend lắng nghe tại: `http://localhost:5000`.*  
*(Tùy chọn) Kiểm tra kết nối DB: `node test-db.js`.*

### Bước 3: Khởi động Frontend
```bash
cd frontend
npm run dev
```
*Frontend mở tại: `http://localhost:3000`.*

---

## 🗺️ 6. LỘ TRÌNH PHÁT TRIỂN TIẾP THEO (NEXT STEPS ROADMAP)

Khi bạn quay lại và muốn phát triển tiếp, dưới đây là các tính năng được khuyến nghị thực hiện theo thứ tự ưu tiên:

### 🎯 Giai đoạn 1: Hoàn thiện Màn Học Tập (Lesson Player trong `/learn`)
- Hiện tại `/learn` đã có bản đồ Dungeon map A1 - C2 và danh sách các Unit.
- Cần hoàn thiện:
  1. Trình phát bài học (Lesson Player interactive): Thẻ từ vựng Flashcard lật mặt, phát âm Audio bằng Web Speech API (`window.speechSynthesis`).
  2. Các dạng câu hỏi tương tác: Trắc nghiệm LoL theme, sắp xếp từ thành câu hoàn chỉnh, nối từ với nghĩa.
  3. Màn hình chiến thắng khi xong Unit: Hiệu ứng nhận XP, Vàng, âm thanh chiến thắng (Victory LoL).

### 🎯 Giai đoạn 2: Nâng cấp AI Joy Coach (Chatbot trong `JoyBubble.jsx`)
- Hiện tại JoyBubble đang phản hồi theo regex và rules tĩnh.
- Cần nâng cấp:
  1. Tích hợp Google Gemini API qua backend endpoint (`POST /api/v1/ai/coach-chat`).
  2. Prompting cho AI vào vai **Heimerdinger / Hướng Dẫn Viên Học Tập**: Sửa lỗi ngữ pháp, giải thích từ vựng theo phong cách game thủ hài hước.

### 🎯 Giai đoạn 3: Tính năng Cửa Hàng & Hiệu Ứng Trang Bị (`/inventory`)
- Hiện tại trang bị đã mua và lưu được trong `progressStore`.
- Cần nâng cấp:
  1. Gắn hiệu ứng gameplay thực tế cho vật phẩm:
     - *Kính Tiên Tri*: +10% XP khi học từ mới trong Codex.
     - *Kiếm Doran*: +5 Gold khi đạt Streak 3 ngày.
     - *Bình Máu*: Bảo vệ Streak nếu quên học 1 ngày (Streak Freeze).
  2. Hiển thị trang bị đang kích hoạt trên Dashboard nhân vật.

### 🎯 Giai đoạn 4: Đấu Trường Arena (`/arena`)
- Nâng cấp Quiz Arena thành chế độ diệt quái theo lượt (Turn-based RPG Combat):
  - Trả lời đúng = Gây sát thương lên Quái/Baron.
  - Trả lời sai = Bị quái tấn công trừ HP nhân vật.

---

## 📝 7. MẪU PROMPT ĐỂ GỬI LẠI CHO AI KHI TIẾP TỤC

Khi bạn mở phiên chat mới, hãy copy đoạn text sau để AI lập tức tiếp tục công việc:

```text
Chào bạn, tôi quay lại tiếp tục phát triển dự án "EngJoy – Gamified English Learning Platform".
Source code hiện tại đang nằm tại d:\24C02\EngJoy_App\EngJoy.
Tôi đã có tài liệu bàn giao toàn diện tại file `PROJECT_HANDOVER.md`.
Dự án đã hoàn thành:
- Kiến trúc Dual-State Progression (Khách/User xuất phát từ 0).
- Backend Express 3-layer + Docker (Postgres, Mongo, Redis) đã audit logic.
- Toàn bộ UI/UX Dashboard, Header, Sidebar, Next Quest card đã redesign theo Dark Fantasy RPG / LoL theme và responsive hoàn hảo.

Hôm nay tôi muốn bạn hỗ trợ tôi thực hiện bước tiếp theo trong Lộ trình:
[Điền tính năng bạn muốn làm tiếp, ví dụ: "Hoàn thiện Lesson Player trong trang /learn với bài tập trắc nghiệm và flashcard có phát âm audio"]
```

---
*Chúc bạn có một kỳ nghỉ thật thoải mái và hẹn gặp lại trong chặng đường tiếp theo của EngJoy!* 🚀
