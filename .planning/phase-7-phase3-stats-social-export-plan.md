# GSD Phase 7 — GĐ3 — Thống kê, Social, Export, Cloud TTS

> Nguồn sự thật: [docs/04-features.md](../docs/04-features.md),
> [docs/05-design-system.md](../docs/05-design-system.md),
> [docs/03-data-model.md](../docs/03-data-model.md),
> [docs/02-architecture.md](../docs/02-architecture.md),
> [docs/06-roadmap.md](../docs/06-roadmap.md).
>
> Phase này thuộc **Giai đoạn 3** trong [06-roadmap.md](../docs/06-roadmap.md) §1:
> *"Heatmap, thống kê chi tiết; level, bảng xếp hạng, hearts. Nâng TTS lên cloud
> (Azure/Google/OpenAI) + cache audio; export sang Anki."*

---

## Mục tiêu

Mở rộng Bloóm từ MVP sang trải nghiệm "gây nghiện" và mang đi được, gồm 4 nhóm:

1. **Thống kê chi tiết + heatmap** — trang `/stats`: heatmap kiểu GitHub (số lượt ôn
   mỗi ngày trong 12 tháng), biểu đồ XP/thẻ ôn theo ngày, phân bố `reviews.rating`
   (Again/Hard/Good/Easy), tổng số thẻ theo loại, tỉ lệ nhớ (retention). Dữ liệu lấy
   từ `reviews` + `cards` + `user_stats` qua repository (luôn lọc `user_id`).
2. **Social / Gamification nâng cao** — **level** (suy ra từ `user_stats.xp`),
   **hearts** (mạng, hồi theo thời gian, mất khi ôn sai), **bảng xếp hạng**
   (leaderboard theo XP tuần). Mở rộng `user_stats` + thêm bảng phụ vì model hiện chỉ
   có `xp/streak/last_studied_date` ([03-data-model.md](../docs/03-data-model.md) §2).
3. **Export sang Anki** — xuất bộ thẻ của user ra file `.apkg` (đọc được trong Anki),
   ánh xạ 4 loại thẻ (`recognition`/`cloze`/`production`/`reading`) sang note type Anki,
   giữ câu ngữ cảnh gốc + furigana + nghĩa.
4. **Cloud TTS + cache audio** — nâng `lib/tts` từ Web Speech (MVP) lên cloud
   (Azure/Google/OpenAI) **khi `app_settings.tts_provider = "cloud"`**, cache file audio
   theo text để tránh gọi lại; giữ Web Speech làm fallback. Đổi provider runtime qua
   Admin, **không deploy lại** (đúng nguyên tắc `lib/config` ở [02-architecture.md](../docs/02-architecture.md) §7).

Toàn bộ tuân thủ kiến trúc: UI **không** gọi DB trực tiếp → đi qua `lib/repositories`
→ `lib/db`; secret ở env, cấu hình hệ thống ở `app_settings` đọc qua `lib/config`;
mọi truy vấn kèm `where user_id = currentUser`.

---

## Phụ thuộc

Phase này **PHỤ THUỘC [3, 4, 5]** — phải xong trước vì:

| Phase | Feature | Vì sao Phase 7 cần |
|-------|---------|---------------------|
| **3** | F3 — Học & sentence mining | Tạo `notes` + `cards` + `user_words`. Export Anki và thống kê theo loại thẻ cần dữ liệu `notes`/`cards` đã tồn tại; cloud TTS đọc theo `reading` lấy từ note/token. |
| **4** | F4 — Ôn tập SRS | Sinh `reviews` (rating + reviewed_at) và cập nhật `user_stats` (xp/streak). Heatmap, biểu đồ retention, level, hearts, leaderboard XP đều dựng trên `reviews` + `user_stats`. |
| **5** | F5 — Dashboard + Auth + Admin | `lib/config` + trang `/admin` sửa `app_settings` runtime đã có (đổi `tts_provider`); `lib/auth` cung cấp `currentUser`/`role` để bảo vệ route `/stats`, `/leaderboard`, API export. Dashboard là nơi gắn link sang trang thống kê/leaderboard. |

Nếu 3/4/5 chưa xong: **dừng** — Phase 7 không có dữ liệu (`reviews`, `cards`,
`user_stats`) lẫn hạ tầng (`lib/config`, Admin, Auth) để bám vào.

**Giả định scope:** Phase 1–6 coi như đã hoàn thành ở các phiên trước. Phase 7 **chỉ
thêm mới**, **tái dùng** schema/repository/`lib/config`/`lib/auth` đã có, **không**
viết lại F1–F6.

---

## Quyết định triển khai (discuss-phase)

> Các "vùng xám" và lựa chọn đã chốt, bám docs.

### QĐ1 — Thư viện biểu đồ & heatmap: Recharts + heatmap tự dựng bằng CSS Grid + Motion
- **Vùng xám:** docs liệt kê Motion/Tailwind/shadcn nhưng **không** có thư viện chart.
- **Chốt:** dùng **Recharts** (React thuần, hợp Next.js App Router, SSR-friendly) cho
  biểu đồ cột/đường (XP theo ngày, phân bố rating). **Heatmap** dựng tay bằng **CSS Grid
  + Tailwind** (53 cột tuần × 7 ô) tô màu theo "bucket" cường độ — không thêm lib nặng,
  giữ đúng phong cách Duolingo (bo góc, viền 2px). Animation width/opacity bằng **Motion**
  (đã có), tôn trọng `prefers-reduced-motion` ([05-design-system.md](../docs/05-design-system.md) §9).
- **Lý do:** ít phụ thuộc nhất, kiểm soát style 100% theo design system; heatmap tự dựng
  rẻ và dễ map màu token (`primary` các sắc độ).

### QĐ2 — Hearts & Level lưu mở rộng `user_stats`, KHÔNG đập model cũ
- **Vùng xám:** `user_stats` hiện chỉ có `xp/streak/last_studied_date`
  ([03-data-model.md](../docs/03-data-model.md) §2); hearts/level chưa có cột.
- **Chốt:**
  - **Level**: **suy ra (derived)** từ `xp`, KHÔNG lưu cột riêng → công thức trong
    `lib/gamification.ts` (vd ngưỡng tăng dần: level = floor(sqrt(xp / 100)) + 1, chốt
    bảng ngưỡng trong code). Tránh dữ liệu lệch.
  - **Hearts**: thêm 2 cột vào `user_stats` qua migration mới: `hearts int default 5`,
    `hearts_updated_at timestamptz`. Hồi 1 tim mỗi `hearts_refill_minutes` (đọc từ
    `app_settings`), tối đa `max_hearts` (mặc định 5). Tính lazy lúc đọc (không cron).
  - **Hearts có thể TẮT mặc định** qua `app_settings.feature_flags.hearts_enabled`
    (đã có key `feature_flags` ([03-data-model.md](../docs/03-data-model.md) §4)) — vì hearts
    có thể gây ức chế người học công việc; mặc định `false`, bật runtime qua Admin.
- **Lý do:** giữ nguyên 1-dòng-mỗi-user của `user_stats`, không tạo bảng thừa; tuân
  nguyên tắc cấu hình ở `app_settings` ([02-architecture.md](../docs/02-architecture.md) §7).

### QĐ3 — Leaderboard theo XP tuần, dùng view tổng hợp từ `reviews`, KHÔNG bảng đua riêng
- **Vùng xám:** chưa có bảng leaderboard; XP tổng nằm ở `user_stats.xp` (cộng dồn) nên
  không suy ra được "XP tuần này".
- **Chốt:** "XP tuần" tính **on-the-fly** từ `reviews` (đếm lượt rating Good/Easy trong
  7 ngày × XP/thẻ) gom theo `card_id → user_id`, ORDER BY giảm dần, LIMIT N. Truy vấn đặt
  trong `lib/repositories/stats.ts` (`getWeeklyLeaderboard()`), **không** lọc theo 1 user
  (đây là dữ liệu công khai có chủ đích) nhưng **chỉ trả tên hiển thị + XP + rank**, không
  lộ email/dữ liệu riêng. Có thể tắt qua `feature_flags.leaderboard_enabled` (mặc định `true`).
- **Lý do:** tránh bảng cache đua dễ lệch; `reviews` đã là nguồn sự thật. Nếu chậm về
  sau mới thêm bảng cache (giống ghi chú `user_word_freq` "tối ưu sau" trong bản đồ dự án).

### QĐ4 — Export Anki: dùng `genanki`-tương đương cho Node (`anki-apkg-export`-style) tự lắp ở server
- **Vùng xám:** docs ghi "Anki (export - GĐ3)" nhưng không chốt thư viện/định dạng.
- **Chốt:** export ra **`.apkg`** (gói SQLite + media chuẩn Anki) tại API route
  `app/api/export/anki/route.ts` (server-side, stream file về client). Dùng thư viện Node
  sinh `.apkg` (`anki-apkg-export` hoặc tương đương; nếu không khả dụng thì fallback xuất
  **TSV `.txt`** import-được-vào-Anki làm đường lui). Ánh xạ note type:
  - `recognition` → mặt trước: `target_word` + câu ngữ cảnh; mặt sau: `reading` + `meaning`.
  - `cloze` → dùng Anki Cloze: câu gốc khoét `{{c1::target_word}}`; mặt sau `reading`.
  - `production` → mặt trước: `meaning` (Việt); mặt sau: `target_word` + `reading` + câu ví dụ.
  - `reading` → mặt trước: kanji `target_word`; mặt sau: `reading`.
  - Furigana xuất dạng ruby HTML (`<ruby>漢字<rt>かんじ</rt></ruby>`) từ `notes.reading`/tokens.
  - Mọi card mang **câu gốc** (qua `notes.sentence_id → sentences.text`) — điểm đặc trưng
    Bloóm (bản đồ dự án: "mọi loại thẻ đều hiển thị lại đúng câu gốc").
- **Phân quyền:** API export **chỉ xuất thẻ của `currentUser`** — repository lọc `user_id`.
- **Lý do:** `.apkg` là format thật người dùng Anki cần; tách ánh xạ vào `lib/export/anki.ts`
  để dễ test và đổi format.

### QĐ5 — Cloud TTS sau `lib/tts` (interface giữ nguyên), provider chọn qua `app_settings.tts_provider`
- **Vùng xám:** `lib/tts/index.ts` hiện là Web Speech client-side (`speak(text,{lang})`);
  cloud TTS phải chạy server (giấu API key) và trả audio.
- **Chốt:**
  - Mở rộng `lib/tts` thành **adapter pattern**: `lib/tts/index.ts` (interface +
    chọn provider theo `lib/config` đọc `tts_provider`), `lib/tts/webspeech.ts` (MVP,
    client), `lib/tts/cloud.ts` (gọi API route server). Khi `tts_provider="webspeech"`
    → dùng Web Speech như cũ; khi `="cloud"` → fetch `/api/tts?text=...` lấy URL audio.
  - **API route** `app/api/tts/route.ts` (server): kiểm cache trước → nếu miss thì gọi
    provider cloud (OpenAI `tts-1` / Azure / Google — chọn cụ thể trong
    `lib/tts/providers/openai.ts` v.v.) → lưu file + trả URL. **API key ở env**
    (`OPENAI_API_KEY` đã có; `AZURE_SPEECH_KEY`/`GOOGLE_TTS_KEY` thêm vào `.env.example`
    nếu chọn provider đó). Provider mặc định = OpenAI `tts-1` (đã có `OPENAI_API_KEY`).
  - **Cache audio**: key = `sha256(provider + voice + lang + text)`; lưu file `.mp3` vào
    `public/tts-cache/<hash>.mp3` (hoặc thư mục cấu hình `tts_cache_dir`); ghi metadata
    nhẹ. Lần sau trả thẳng URL tĩnh → không gọi API lại (đúng "cache audio" trong roadmap).
  - **Đọc theo `reading` (kana)** cho từ, đọc cả câu cho câu — giữ nguyên hành vi MVP
    ([04-features.md](../docs/04-features.md) F8).
- **Lý do:** chống lock-in (bọc sau `lib/tts`, đổi provider/đổi sang Web Speech chỉ sửa 1
  chỗ), đổi runtime qua Admin không deploy lại — đúng key `tts_provider` trong `app_settings`.

### QĐ6 — Trang & route mới đặt đúng cây thư mục `app/`, đều bảo vệ auth tầng app
- **Vùng xám:** docs chưa liệt kê `/stats`, `/leaderboard`; cây `app/` ([02-architecture.md](../docs/02-architecture.md) §4) chưa có.
- **Chốt:** thêm `app/stats/`, `app/leaderboard/`, `app/api/export/anki/route.ts`,
  `app/api/tts/route.ts`. Trang `/stats` và `/leaderboard` lấy `currentUser` từ `lib/auth`
  (server component) → redirect `/login` nếu chưa đăng nhập. Heatmap/stats chỉ của user;
  leaderboard công khai (chỉ tên + XP). Link vào từ `/dashboard`.
- **Lý do:** giữ đúng cấu trúc thư mục và quy ước phân quyền tầng app
  ([02-architecture.md](../docs/02-architecture.md) §6).

### QĐ7 — Seed `app_settings` key mới qua migration/seed, đọc qua `lib/config` (fallback mặc định)
- **Vùng xám:** cần các key cấu hình mới (hearts, leaderboard, tts voice/cache).
- **Chốt:** thêm các key vào **module DEFAULTS duy nhất** `lib/config/defaults.ts`
  (`APP_SETTINGS_DEFAULTS`, lập từ Phase 4 — QĐ10), KHÔNG khai danh sách key song song:
  `max_hearts` (5), `hearts_refill_minutes` (30), `tts_voice` (`"alloy"` cho OpenAI),
  `tts_cache_dir` (`"public/tts-cache"`), và bổ sung cờ trong `feature_flags`:
  `hearts_enabled` (false), `leaderboard_enabled` (true). Seed lặp qua DEFAULTS
  (`onConflictDoNothing`, không đè value Admin). `lib/config` trả **fallback mặc định**
  (từ chính DEFAULTS) khi key thiếu (đúng [02-architecture.md](../docs/02-architecture.md) §7)
  → app không vỡ nếu seed chưa chạy. Admin sửa runtime, `lib/config` invalidate cache.
  **XP leaderboard dùng đúng key chuẩn `xp_per_review`** (Phase 4) — KHÔNG tạo
  `xp_per_card`/`xp_per_correct`.
- **Lý do:** không rải config trong code/env; một nguồn DEFAULTS duy nhất → chống
  drift/đè value; đồng nhất với mô hình hiện có.

---

## Kế hoạch task nguyên tử (plan-phase)

> Mỗi task nhỏ, độc lập, commit riêng. Đường dẫn bám cây `app/`, `lib/db`,
> `lib/repositories`, `lib/config`, `lib/tts`, `lib/export`, `components/` của
> [02-architecture.md](../docs/02-architecture.md) §4.

### Nhóm A — Schema, config, seed (nền tảng)

<task type="auto">
  <name>Migration: thêm cột hearts vào user_stats</name>
  <files>lib/db/schema.ts, drizzle/ (migration mới do drizzle-kit sinh)</files>
  <action>Trong lib/db/schema.ts, thêm vào bảng user_stats 2 cột: hearts (integer, not null, default 5) và hearts_updated_at (timestamptz, default now()). Giữ nguyên các cột cũ (xp, streak, last_studied_date). Chạy drizzle-kit generate để sinh file migration trong thư mục drizzle/. KHÔNG sửa bảng khác.</action>
  <verify>npx drizzle-kit generate (sinh migration không lỗi); npx drizzle-kit migrate (hoặc lệnh migrate của dự án) chạy thành công; psql kiểm tra: \d user_stats thấy cột hearts và hearts_updated_at.</verify>
  <done>user_stats có thêm 2 cột hearts, hearts_updated_at; migration commit trong drizzle/; build TypeScript không lỗi type ở schema.</done>
</task>

<task type="auto">
  <name>Seed app_settings key mới cho GĐ3</name>
  <files>lib/config/defaults.ts, lib/db/seed.ts (hoặc script seed hiện có)</files>
  <action>Thêm các key vào **module DEFAULTS duy nhất** `lib/config/defaults.ts` (`APP_SETTINGS_DEFAULTS`, lập từ Phase 4 — QĐ10): max_hearts (type number, value 5), hearts_refill_minutes (number, 30), tts_voice (string, "alloy"), tts_cache_dir (string, "public/tts-cache"). Cập nhật entry feature_flags (json) thêm hearts_enabled=false, leaderboard_enabled=true (giữ các cờ cũ). KHÔNG khai fallback rải rác trong lib/config.ts — fallback đọc từ chính APP_SETTINGS_DEFAULTS. Seed (lib/db/seed.ts) lặp qua APP_SETTINGS_DEFAULTS với onConflictDoNothing (không ghi đè value admin đã sửa — chỉ insert khi thiếu). XP leaderboard dùng đúng key `xp_per_review` (Phase 4), KHÔNG thêm xp_per_card/xp_per_correct.</action>
  <verify>Chạy script seed; truy vấn SELECT key,value FROM app_settings thấy đủ 4 key mới + feature_flags có 2 cờ; gọi lib/config getConfig('max_hearts') trả 5; xoá key max_hearts khỏi DB rồi gọi lại vẫn trả fallback 5 (không lỗi).</verify>
  <done>4 key mới + 2 cờ feature_flags có trong DB; lib/config trả đúng giá trị và fallback khi thiếu key.</done>
</task>

### Nhóm B — Repository thống kê & gamification nâng cao

<task type="auto">
  <name>Repository: truy vấn heatmap + biểu đồ thống kê</name>
  <files>lib/repositories/stats.ts</files>
  <action>Thêm vào lib/repositories/stats.ts các hàm (tất cả nhận userId và lọc where user_id=userId qua join reviews→cards): getReviewHeatmap(userId, fromDate, toDate) trả mảng {date, count} đếm reviews theo ngày (group by date(reviewed_at)); getRatingDistribution(userId, range) trả {again,hard,good,easy} đếm theo reviews.rating; getDailyXp(userId, days) trả mảng {date, xp, reviewed} ước tính XP/ngày (Good/Easy = đúng); getCardCountByType(userId) trả {recognition,cloze,production,reading} đếm cards theo type; getRetention(userId, range) = (#Good+Easy)/(#tổng reviews). Mọi truy vấn dùng Drizzle, join cards để lấy user_id (reviews không có user_id trực tiếp — card_id→cards.user_id). Trả kiểu TypeScript rõ ràng.</action>
  <verify>Viết script gọi từng hàm với 1 userId test có dữ liệu reviews; in kết quả; kiểm số tổng count heatmap == tổng reviews của user; getRatingDistribution tổng 4 nhãn == tổng reviews. Hoặc unit test với DB seed.</verify>
  <done>5 hàm trả dữ liệu đúng, đều lọc theo user_id (không lộ dữ liệu user khác); type-check pass.</done>
</task>

<task type="auto">
  <name>Repository: leaderboard XP tuần</name>
  <files>lib/repositories/stats.ts</files>
  <action>Thêm getWeeklyLeaderboard(limit=20) vào lib/repositories/stats.ts: tính XP tuần on-the-fly từ reviews (đếm rating IN (3,4) trong 7 ngày gần nhất, nhân XP/thẻ). **XP/thẻ đúng phải đọc đúng MỘT key chuẩn `xp_per_review`** (json `{again,hard,good,easy}`, do Phase 4 định nghĩa trong DEFAULTS — QĐ10 Phase 4) qua lib/config, lấy `xp_per_review.good` (= `.easy`, mặc định 10). **TUYỆT ĐỐI KHÔNG dùng `xp_per_card`/`xp_per_correct`** (tên đồng nghĩa lỗi → rơi vào fallback khác giá trị Admin đã sửa, leaderboard tính sai). Join cards→user_id→users để lấy name, group by user, ORDER BY xp_week DESC, LIMIT limit. Trả mảng {rank, userId, name, xpWeek}. KHÔNG trả email. Đọc feature_flags.leaderboard_enabled từ lib/config; nếu false thì trả mảng rỗng. Hàm này CỐ Ý không lọc 1 user (dữ liệu công khai có chủ đích).</action>
  <verify>Gọi getWeeklyLeaderboard() với DB seed nhiều user; kiểm sắp xếp giảm dần theo xpWeek, không có trường email trong kết quả; đặt leaderboard_enabled=false → trả []; grep -rn "xp_per_card\|xp_per_correct" lib/ app/ (ngoài node_modules) trả rỗng.</verify>
  <done>Trả danh sách rank/name/xpWeek đúng thứ tự; tôn trọng cờ; không lộ email/dữ liệu riêng; XP tính từ `xp_per_review.good` (không có key xp_per_card/xp_per_correct).</done>
</task>

<task type="auto">
  <name>lib/gamification.ts: level + hearts logic</name>
  <files>lib/gamification.ts</files>
  <action>Tạo lib/gamification.ts (server util, không gọi DB trực tiếp). computeLevel(xp): trả {level, xpInLevel, xpForNext} theo công thức ngưỡng tăng dần (level = floor(sqrt(xp/100))+1; ghi rõ bảng ngưỡng trong comment). computeHearts({hearts, heartsUpdatedAt, maxHearts, refillMinutes, now}): tính số tim hiện tại sau hồi lazy (mỗi refillMinutes +1, cap maxHearts) trả {hearts, nextRefillAt}. spendHeart/state thuần (pure functions) để dễ test. KHÔNG đọc app_settings ở đây — nhận tham số từ caller (caller lấy từ lib/config).</action>
  <verify>Unit test: computeLevel(0)→level1; computeLevel(100)→level2; computeHearts với heartsUpdatedAt cách đây 65 phút, refill 30, hearts=3, max=5 → trả 5 (hồi 2 cap). prefers pure → test thuần không cần DB.</verify>
  <done>Hàm computeLevel/computeHearts trả đúng theo test; là pure functions, không phụ thuộc DB/IO.</done>
</task>

<task type="auto">
  <name>Repository: đọc/ghi hearts qua user_stats</name>
  <files>lib/repositories/stats.ts</files>
  <action>Thêm getHearts(userId) và consumeHeart(userId): getHearts đọc user_stats (hearts, hearts_updated_at), lấy max_hearts/hearts_refill_minutes từ lib/config, gọi lib/gamification.computeHearts để trả số tim hiện tại + ghi lại nếu hồi (cập nhật hearts, hearts_updated_at). consumeHeart trừ 1 tim (không âm) và set hearts_updated_at=now nếu trước đó đầy. Chỉ áp dụng khi feature_flags.hearts_enabled=true (đọc lib/config); nếu false thì getHearts trả null/Infinity (vô hiệu). Luôn lọc user_id.</action>
  <verify>Script: bật hearts_enabled; consumeHeart 6 lần → không âm (clamp 0); chờ/giả lập thời gian (truyền now) → getHearts hồi đúng; tắt cờ → getHearts trả trạng thái vô hiệu.</verify>
  <done>Hearts đọc/ghi đúng, hồi lazy hoạt động, tôn trọng cờ hearts_enabled, lọc user_id.</done>
</task>

### Nhóm C — UI thống kê & social

<task type="auto">
  <name>Component HeatmapCalendar</name>
  <files>components/HeatmapCalendar.tsx</files>
  <action>Tạo components/HeatmapCalendar.tsx (client component) nhận props data: {date,count}[] và renderRange (mặc định 12 tháng). Dựng lưới CSS Grid 7 hàng (thứ trong tuần) × ~53 cột (tuần), mỗi ô bo nhỏ (rounded), tô màu theo bucket cường độ (0/1-2/3-5/6-9/10+) dùng sắc độ primary (#58CC02) từ color token. Tooltip hover hiện "N lượt ôn — dd/mm". Dùng Motion fade-in các ô, tôn trọng prefers-reduced-motion (tắt animation nếu bật). Style theo design system: viền 2px, .wl-card bao ngoài.</action>
  <verify>Storybook/route tạm hoặc mở /stats render với dữ liệu mẫu; kiểm: 7 hàng, ô tô đúng màu theo count, hover hiện tooltip; bật prefers-reduced-motion (devtools) → không animate.</verify>
  <done>Heatmap hiển thị đúng ô/màu/tooltip theo dữ liệu, đúng phong cách Duolingo, tôn trọng reduced-motion.</done>
</task>

<task type="auto">
  <name>Component StatsCharts (Recharts)</name>
  <files>components/StatsCharts.tsx, package.json</files>
  <action>Cài recharts (npm i recharts). Tạo components/StatsCharts.tsx (client) gồm: BarChart phân bố rating (Again/Hard/Good/Easy, màu danger→primary), LineChart XP theo ngày (n ngày), và 1 khối số liệu (tổng thẻ theo loại, retention %). Nhận props từ repository (rating, dailyXp, cardCountByType, retention). Màu lấy từ color token (primary/danger/xp/info). Bọc trong .wl-card; responsive (ResponsiveContainer).</action>
  <verify>Mở /stats với dữ liệu mẫu: thấy biểu đồ cột rating, đường XP, các con số loại thẻ + retention; resize cửa sổ → chart co giãn.</verify>
  <done>Các biểu đồ render đúng dữ liệu, màu theo token, responsive, không lỗi console.</done>
</task>

<task type="auto">
  <name>Trang /stats</name>
  <files>app/stats/page.tsx</files>
  <action>Tạo app/stats/page.tsx (server component): lấy currentUser từ lib/auth, redirect /login nếu chưa đăng nhập. Gọi lib/repositories/stats: getReviewHeatmap (12 tháng), getRatingDistribution, getDailyXp(30), getCardCountByType, getRetention — truyền userId. Render HeatmapCalendar + StatsCharts + tiêu đề font-extrabold. Hiển thị level hiện tại (computeLevel từ user_stats.xp). Page transition wrapper Motion (fade+slide nhẹ). Link quay lại /dashboard.</action>
  <verify>Đăng nhập → mở /stats: thấy heatmap + biểu đồ + level. Đăng xuất → /stats redirect /login. Kiểm dữ liệu khớp với reviews của chính user (không thấy user khác).</verify>
  <done>/stats hiển thị thống kê đầy đủ của đúng user, bảo vệ auth, dữ liệu khớp DB.</done>
</task>

<task type="auto">
  <name>Trang /leaderboard</name>
  <files>app/leaderboard/page.tsx, components/LeaderboardTable.tsx</files>
  <action>Tạo components/LeaderboardTable.tsx (hiển thị rank, tên, XP tuần, badge top-3 dùng .wl-badge, highlight dòng của currentUser). Tạo app/leaderboard/page.tsx (server): currentUser từ lib/auth (redirect /login nếu chưa đăng nhập); gọi getWeeklyLeaderboard(20); nếu feature_flags.leaderboard_enabled=false → hiển thị thông báo "Bảng xếp hạng đang tắt". Render bảng + level/medal cho top 3. Link về /dashboard.</action>
  <verify>Mở /leaderboard khi đã đăng nhập: thấy danh sách xếp theo XP tuần, dòng của mình được highlight, không thấy email ai. Tắt cờ leaderboard_enabled qua Admin → trang báo đã tắt.</verify>
  <done>/leaderboard hiển thị top theo XP tuần, highlight user hiện tại, tôn trọng cờ, không lộ email.</done>
</task>

<task type="auto">
  <name>Component HeartsBar + tích hợp vào review/dashboard</name>
  <files>components/HeartsBar.tsx, app/dashboard/page.tsx</files>
  <action>Tạo components/HeartsBar.tsx hiển thị N tim (icon Heart của lucide-react, đầy/rỗng), thời gian hồi tim kế tiếp; ẩn hoàn toàn nếu hearts_enabled=false. Nhận props {hearts,maxHearts,nextRefillAt,enabled}. Trên app/dashboard/page.tsx: gọi getHearts(userId) (server) và render HeartsBar ở đầu trang cùng level (computeLevel) + link sang /stats và /leaderboard. KHÔNG đụng logic dashboard cũ (streak/XP/thẻ đến hạn) — chỉ thêm.</action>
  <verify>Bật hearts_enabled: dashboard hiện thanh tim + level + 2 link mới; tắt cờ: thanh tim biến mất, dashboard cũ vẫn nguyên. Click link sang /stats và /leaderboard hoạt động.</verify>
  <done>HeartsBar hiển thị/ẩn theo cờ, dashboard có level + link mới, không phá tính năng dashboard cũ.</done>
</task>

<task type="auto">
  <name>Trừ tim khi ôn sai (tích hợp F4, không phá SRS)</name>
  <files>app/review/ (server action chấm điểm hiện có), lib/repositories/stats.ts</files>
  <action>Trong luồng chấm điểm review hiện có (server action/route đã ghi reviews + cập nhật fsrs_state ở Phase 4): NẾU feature_flags.hearts_enabled=true VÀ rating=Again(1) thì gọi consumeHeart(userId). KHÔNG thay đổi logic FSRS/ghi reviews/XP. Khi hết tim (hearts=0) trả cờ outOfHearts để UI hiển thị thông báo nghỉ (không chặn cứng nếu cờ tắt). Bọc trong điều kiện cờ để mặc định (tắt) hành vi không đổi so với MVP.</action>
  <verify>Bật hearts_enabled, ôn và chấm Again nhiều lần → số tim giảm; chấm Good/Easy → tim không đổi; tắt cờ → ôn như cũ, không trừ tim, reviews/XP/fsrs vẫn ghi đúng.</verify>
  <done>Ôn sai trừ tim chỉ khi cờ bật; FSRS/reviews/XP không đổi; tắt cờ giữ nguyên hành vi MVP.</done>
</task>

### Nhóm D — Export Anki

<task type="auto">
  <name>lib/export/anki.ts: ánh xạ thẻ → cấu trúc Anki</name>
  <files>lib/export/anki.ts</files>
  <action>Tạo lib/export/anki.ts: hàm buildAnkiDeck(cards) nhận mảng card đã kèm note + sentence (target_word, reading, meaning, type, sentence text). Trả cấu trúc trung gian {deckName, notes:[{modelType, fields, tags}]} ánh xạ 4 loại: recognition (front: target_word + câu ngữ cảnh dạng <ruby>; back: reading+meaning), cloze (text Anki "{{c1::target_word}}" trên câu gốc; back reading), production (front meaning; back target_word+reading+câu ví dụ), reading (front kanji; back reading). Furigana xuất ruby HTML. Hàm thuần (không IO) để dễ test. Escape HTML an toàn.</action>
  <verify>Unit test: cho 1 card mỗi loại → kiểm field front/back đúng quy ước; cloze có chuỗi {{c1::...}}; ruby HTML hợp lệ; HTML đặc biệt được escape.</verify>
  <done>buildAnkiDeck trả cấu trúc đúng cho cả 4 loại thẻ, là pure function, escape an toàn.</done>
</task>

<task type="auto">
  <name>API export Anki .apkg (có fallback TSV)</name>
  <files>app/api/export/anki/route.ts, lib/repositories/cards.ts, .env.example, package.json</files>
  <action>Tạo app/api/export/anki/route.ts (GET, server): lấy currentUser từ lib/auth (401 nếu chưa đăng nhập). Thêm vào lib/repositories/cards.ts hàm getCardsForExport(userId) trả cards + note + sentence text (lọc where user_id=userId, bỏ suspended nếu muốn). Gọi lib/export/anki.buildAnkiDeck → sinh .apkg bằng thư viện Node sinh apkg (cài, vd anki-apkg-export hoặc tương đương trong package.json). Stream file .apkg về (Content-Type application/octet-stream, filename bloom-YYYYMMDD.apkg). NẾU thư viện apkg không khả dụng → fallback xuất TSV .txt (cột: front, back, tags) import-được-vào-Anki. Tên deck "Bloóm".</action>
  <verify>Đăng nhập → curl -L /api/export/anki -o out.apkg; file out.apkg tải về > 0 byte; mở trong Anki desktop import được, thấy thẻ đúng 4 loại với câu ngữ cảnh. Gọi không đăng nhập → 401. Chỉ thấy thẻ của chính user.</verify>
  <done>File .apkg (hoặc TSV fallback) tải về và import vào Anki thành công, chỉ chứa thẻ của user đăng nhập.</done>
</task>

<task type="auto">
  <name>Nút Export Anki trên dashboard</name>
  <files>app/dashboard/page.tsx, components/ExportAnkiButton.tsx</files>
  <action>Tạo components/ExportAnkiButton.tsx (client): nút .btn-3d .btn-info "Xuất sang Anki" gọi GET /api/export/anki và tải file (anchor download). Hiển thị trạng thái đang xuất (disable + spinner). Thêm nút vào app/dashboard/page.tsx (khu vực tiện ích). Không đụng logic dashboard cũ.</action>
  <verify>Mở /dashboard → bấm "Xuất sang Anki" → trình duyệt tải file .apkg; nút disable trong lúc xuất rồi enable lại.</verify>
  <done>Nút export hoạt động, tải đúng file, có trạng thái loading, đúng style btn-3d.</done>
</task>

### Nhóm E — Cloud TTS + cache audio

<task type="auto">
  <name>Refactor lib/tts thành adapter (giữ Web Speech)</name>
  <files>lib/tts/index.ts, lib/tts/webspeech.ts</files>
  <action>Tách phần Web Speech hiện tại sang lib/tts/webspeech.ts (giữ nguyên hành vi speak(text,{lang}) dùng speechSynthesis, lang=ja-JP, đọc theo reading). Sửa lib/tts/index.ts thành interface chung: speak(text,{lang,reading}) đọc tts_provider từ lib/config (client lấy qua endpoint hoặc prop server-injected); nếu "webspeech" → gọi webspeech; nếu "cloud" → gọi lib/tts/cloud.ts (task sau). Giữ tương thích chữ ký cũ để F3/F4/F8 không phải sửa nơi gọi.</action>
  <verify>Đặt tts_provider=webspeech: nút 🔊 ở WordPopup/ReviewCard vẫn phát âm như MVP (đọc kana). Không lỗi import ở các component đang gọi lib/tts.</verify>
  <done>lib/tts có adapter; Web Speech hoạt động y như MVP khi provider=webspeech; chữ ký speak tương thích ngược.</done>
</task>

<task type="auto">
  <name>lib/tts/cloud.ts + provider OpenAI TTS (server)</name>
  <files>lib/tts/cloud.ts, lib/tts/providers/openai.ts, .env.example</files>
  <action>Tạo lib/tts/providers/openai.ts: hàm synthesize(text,{voice,lang}) gọi OpenAI TTS (model tts-1, voice từ app_settings.tts_voice mặc định "alloy") dùng OPENAI_API_KEY (env, đã có) → trả Buffer mp3. Tạo lib/tts/cloud.ts (client side): speakCloud(text) gọi /api/tts?text=... nhận URL audio → phát bằng Audio()/Howler. Cập nhật .env.example ghi chú AZURE_SPEECH_KEY/GOOGLE_TTS_KEY (tùy chọn nếu đổi provider sau). Provider chọn được mở rộng (interface), mặc định OpenAI.</action>
  <verify>Gọi trực tiếp synthesize("こんにちは",{voice:"alloy",lang:"ja"}) ở script server → nhận Buffer mp3 > 0 byte phát được. (Cần OPENAI_API_KEY hợp lệ trong env.)</verify>
  <done>Provider OpenAI sinh mp3 từ text; lib/tts/cloud gọi API và phát audio; key đọc từ env.</done>
</task>

<task type="auto">
  <name>API /api/tts với cache audio theo hash</name>
  <files>app/api/tts/route.ts, lib/tts/cache.ts</files>
  <action>Tạo lib/tts/cache.ts: cacheKey = sha256(provider+voice+lang+text); pathFor(key) trong tts_cache_dir (app_settings, mặc định public/tts-cache); getCached(key) trả URL nếu file tồn tại, else null; saveCached(key, buffer) ghi file mp3. Tạo app/api/tts/route.ts (GET, server): nhận text (+ optional lang). Kiểm tts_provider qua lib/config; nếu webspeech → 400 (client tự xử lý). Tính cacheKey, getCached → có thì trả {url} ngay; miss thì gọi provider OpenAI synthesize → saveCached → trả {url}. Yêu cầu đăng nhập (lib/auth). Giới hạn độ dài text hợp lý.</action>
  <verify>Đặt tts_provider=cloud. curl "/api/tts?text=こんにちは" lần 1 → tạo file trong public/tts-cache + trả url; lần 2 cùng text → trả cùng url, KHÔNG gọi OpenAI lại (kiểm bằng log/thời gian phản hồi nhanh hơn rõ rệt). File mp3 tải từ url phát được.</verify>
  <done>API trả URL audio, cache hit lần 2 không gọi provider; file cache nằm trong tts_cache_dir; yêu cầu auth.</done>
</task>

<task type="auto">
  <name>Chuyển provider runtime qua Admin (không deploy lại)</name>
  <files>app/admin/ (form app_settings hiện có), lib/config.ts</files>
  <action>Đảm bảo trang Admin (Phase 5) liệt kê và cho sửa key tts_provider (webspeech|cloud), tts_voice, max_hearts, hearts_refill_minutes, feature_flags (hearts_enabled, leaderboard_enabled). Khi admin lưu → cập nhật app_settings + gọi lib/config invalidate cache (cơ chế có sẵn ở Phase 5). KHÔNG hiện secret (API key) trên Admin. Nếu Admin form đã tự render mọi key từ DB thì chỉ cần xác nhận key mới hiển thị đúng kiểu (number/string/bool/json).</action>
  <verify>Vào /admin (role=admin): đổi tts_provider từ webspeech→cloud và lưu; ngay sau đó nút 🔊 ở /review dùng cloud (không reload server). Đổi lại webspeech → quay về Web Speech. Bật/tắt hearts_enabled phản ánh ngay ở dashboard.</verify>
  <done>Đổi tts_provider và các cờ qua Admin có hiệu lực runtime không deploy lại; cache config invalidate đúng; không lộ secret.</done>
</task>

### Nhóm F — Hoàn thiện & nghiệm thu

<task type="auto">
  <name>Cập nhật docs + ROADMAP đánh dấu GĐ3</name>
  <files>docs/04-features.md, docs/06-roadmap.md, ROADMAP.md</files>
  <action>Cập nhật bảng tính năng trong docs/04-features.md: đánh dấu các mục GĐ3 (Heatmap/thống kê chi tiết, Hearts/level/bảng xếp hạng, Export Anki, Cloud TTS+cache) là đã triển khai và bổ sung mô tả luồng ngắn cho /stats, /leaderboard, export Anki, cloud TTS. Trong docs/06-roadmap.md §1 Giai đoạn 3 đánh dấu các gạch đầu dòng đã làm. Cập nhật ROADMAP.md (gốc) đổi trạng thái Phase 7 → đang làm/✅ theo tiến độ. Đồng văn phong tiếng Việt với docs.</action>
  <verify>Đọc lại docs: các mục GĐ3 phản ánh đúng tính năng đã build; ROADMAP.md có dòng Phase 7 cập nhật.</verify>
  <done>Docs + ROADMAP nhất quán với code đã làm; văn phong khớp.</done>
</task>

---

## Components tạo/đụng trong phase

| Component | File | Mục đích |
|-----------|------|----------|
| HeatmapCalendar | `components/HeatmapCalendar.tsx` | Lưới heatmap 12 tháng (CSS Grid + Motion), tô sắc độ primary theo số lượt ôn/ngày, tooltip; tôn trọng prefers-reduced-motion. |
| StatsCharts | `components/StatsCharts.tsx` | Biểu đồ Recharts: phân bố rating, XP theo ngày, số thẻ theo loại, retention; màu theo color token. |
| LeaderboardTable | `components/LeaderboardTable.tsx` | Bảng xếp hạng XP tuần: rank, tên, XP, badge top-3, highlight dòng user hiện tại; không hiện email. |
| HeartsBar | `components/HeartsBar.tsx` | Thanh hiển thị tim (lucide Heart) + thời gian hồi; ẩn nếu `hearts_enabled=false`. |
| ExportAnkiButton | `components/ExportAnkiButton.tsx` | Nút `.btn-3d .btn-info` gọi `/api/export/anki` và tải file `.apkg`; trạng thái loading. |
| (đụng) `app/dashboard/page.tsx` | — | Thêm HeartsBar + level + link `/stats`, `/leaderboard` + nút Export; không phá phần cũ. |
| (đụng) `components/WordPopup.tsx`, `components/ReviewCard.tsx` | — | Nút 🔊 dùng chung `lib/tts` adapter (cloud/webspeech) — không đổi giao diện, chỉ đổi nguồn audio. |

> Mọi control mới tuân thủ bộ chuẩn `.btn-3d`/`.wl-card`/`.wl-badge`/`.wl-chip`
> ([05-design-system.md](../docs/05-design-system.md) §5b).

---

## Pages/Routes trong phase

| Route | Loại | Mô tả | Auth |
|-------|------|-------|------|
| `/stats` | Page (server) | Heatmap 12 tháng + biểu đồ thống kê chi tiết + level của user. | Bắt buộc đăng nhập; chỉ dữ liệu của `currentUser`. |
| `/leaderboard` | Page (server) | Bảng xếp hạng XP tuần (top N), highlight user hiện tại. | Bắt buộc đăng nhập; dữ liệu công khai (tên + XP, không email); tôn trọng `leaderboard_enabled`. |
| `/api/export/anki` | API route (GET) | Sinh & stream file `.apkg` (fallback TSV) chứa thẻ của user. | 401 nếu chưa đăng nhập; chỉ thẻ của `currentUser`. |
| `/api/tts` | API route (GET) | Cloud TTS: trả URL audio (cache theo hash), gọi provider khi miss. | Bắt buộc đăng nhập; chỉ chạy khi `tts_provider=cloud`. |
| `/dashboard` (đụng) | Page | Thêm HeartsBar + level + link sang `/stats`,`/leaderboard` + nút Export Anki. | Như cũ (đăng nhập). |
| `/admin` (đụng) | Page | Sửa runtime `tts_provider`, `tts_voice`, hearts/leaderboard flags. | `role=admin`. |

---

## Tiêu chí hoàn thành Phase (verify-work)

Checklist nghiệm thu quan sát được:

- [ ] **Schema**: `user_stats` có cột `hearts`, `hearts_updated_at`; migration trong `drizzle/` chạy sạch.
- [ ] **Config**: `app_settings` có `max_hearts`, `hearts_refill_minutes`, `tts_voice`, `tts_cache_dir` và `feature_flags.{hearts_enabled,leaderboard_enabled}`; `lib/config` trả fallback khi xoá key (không vỡ).
- [ ] **Thống kê `/stats`**: đăng nhập → thấy **heatmap 12 tháng** tô màu đúng số lượt ôn/ngày, biểu đồ **phân bố rating**, **XP theo ngày**, **số thẻ theo loại**, **retention %**; số liệu khớp `reviews` của chính user; chưa đăng nhập → redirect `/login`.
- [ ] **Phân quyền dữ liệu**: `/stats` không hiển thị dữ liệu user khác; mọi truy vấn repo lọc `user_id`.
- [ ] **Level**: `/dashboard` và `/stats` hiện level suy ra từ `xp` (đổi xp → level đổi đúng ngưỡng).
- [ ] **Hearts**: bật `hearts_enabled` → dashboard hiện thanh tim; chấm **Again** trừ tim, **Good/Easy** không; tim **hồi** theo thời gian (cap `max_hearts`); tắt cờ → thanh tim ẩn và ôn tập **không** trừ tim (hành vi MVP nguyên vẹn).
- [ ] **Leaderboard `/leaderboard`**: hiện top theo **XP tuần**, dòng user hiện tại được highlight, **không** lộ email; tắt `leaderboard_enabled` → trang báo đã tắt.
- [ ] **Export Anki**: bấm nút trên dashboard hoặc `curl /api/export/anki` → tải file `.apkg` (>0 byte) **import được vào Anki desktop**, thấy đủ 4 loại thẻ với câu ngữ cảnh + furigana; gọi không đăng nhập → 401; chỉ thẻ của user.
- [ ] **Cloud TTS**: đổi `tts_provider=cloud` qua **Admin** (không deploy lại) → nút 🔊 phát audio cloud; đổi về `webspeech` → quay lại Web Speech ngay.
- [ ] **Cache audio**: gọi `/api/tts` cùng `text` lần 2 trả **cùng URL** và **không** gọi provider lại (file nằm trong `tts_cache_dir`).
- [ ] **Kiến trúc**: UI không gọi DB trực tiếp (qua `lib/repositories`); secret (API key) chỉ ở env, không hiện trên Admin; cấu hình đọc qua `lib/config`.
- [ ] **Design system**: trang/nút mới dùng `.btn-3d`/`.wl-card`/`.wl-badge`, animation < 300ms, tôn trọng `prefers-reduced-motion`.
- [ ] **Docs**: `docs/04-features.md`, `docs/06-roadmap.md`, `ROADMAP.md` cập nhật trạng thái GĐ3.
