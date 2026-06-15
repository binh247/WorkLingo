# GSD Phase 4 — Ôn tập SRS + Gamification

> Phạm vi: **F4 (Ôn tập SRS)** + **F5-gamification (XP + streak + ăn mừng)** theo
> [docs/04-features.md](../docs/04-features.md) §2 (F4) và §3 (Gamification).
> Bám kiến trúc trong [docs/02-architecture.md](../docs/02-architecture.md) §4 (cấu
> trúc thư mục), mô hình dữ liệu [docs/03-data-model.md](../docs/03-data-model.md),
> thiết kế [docs/05-design-system.md](../docs/05-design-system.md), các loại thẻ
> [docs/09-flashcard-types.md](../docs/09-flashcard-types.md).

---

## Mục tiêu

Cho phép người dùng **ôn tập flashcard theo lịch FSRS** tại `/review` và nhận
**phản hồi gamified** (XP, streak, ăn mừng) khi học. Cụ thể:

1. **Tích hợp `ts-fsrs`** trong `lib/srs.ts` — bọc thư viện sau interface riêng để
   không lock-in: hàm khởi tạo state mới, hàm `schedule(state, rating, now)` trả về
   `fsrs_state` mới + thời điểm ôn kế tiếp cho 4 đáp án Again/Hard/Good/Easy.
2. **Trang `/review`** lấy thẻ **đến hạn** (`fsrs_state.due <= now`, `suspended =
   false`), gom từ mọi tài liệu của user; render từng thẻ qua `ReviewCard`.
3. **`ReviewCard`** hiển thị theo loại thẻ (recognition / cloze / production / reading
   — xem [09](../docs/09-flashcard-types.md)), **ẩn nghĩa/đáp án** ở mặt trước, luôn
   hiện **câu ngữ cảnh gốc** từ buổi họp; nút "Hiện đáp án" → 4 nút chấm
   Again/Hard/Good/Easy.
4. **Ghi `reviews`** (rating 1–4 + `reviewed_at`) và **cập nhật `cards.fsrs_state`**
   qua tầng repository (luôn lọc `user_id`).
5. **XP + streak** trong `user_stats`: +XP mỗi thẻ ôn đúng (Good/Easy); streak tính
   theo `last_studied_date` (+1 nếu học trong ngày, reset nếu bỏ 1 ngày).
6. **Phản hồi tức thì**: màu (xanh đúng / đỏ sai) + âm thanh (Howler "ding"/"buzz"),
   tôn trọng `user_settings.sound_enabled` và `prefers-reduced-motion`.
7. **Progress bar** (Motion) cho buổi ôn (đã ôn / tổng đến hạn).
8. **Hoàn thành buổi** → **confetti** (canvas-confetti) + **Lottie** (lottie-react)
   + âm "fanfare".

> KHÔNG làm trong phase này: Dashboard tiến độ đầy đủ (F5 — Phase 5), Admin
> (`app_settings` UI), Import/Study (đã ở Phase 2/3), TTS trên thẻ (F8 — phase riêng,
> nhưng chừa chỗ gọi `lib/tts`).

---

## Phụ thuộc

| Phase | Lý do bắt buộc xong trước |
|-------|---------------------------|
| **Phase 1 (Auth — F1/F1b/F1c)** | `/review` là route bảo vệ; mọi truy vấn repository cần `currentUser` lấy từ session Auth.js (server-side). Bảng `users` (Auth.js + cột `role`), `lib/auth.ts`, helper lấy session phải sẵn sàng. |
| **Phase 3 (Học & sentence mining — F3)** | Phải có **dữ liệu để ôn**: `notes` + `cards` (đào từ `study`), `sentences` (câu ngữ cảnh để render mặt thẻ), `user_settings.enabled_card_types`. Không có thẻ thì `/review` rỗng, không nghiệm thu được. |

Phụ thuộc gián tiếp (đã có từ Phase 0/1 — chỉ dùng lại, không tạo mới ở phase này):
`lib/db/index.ts` + `lib/db/schema.ts` (Drizzle + postgres.js), `lib/config.ts`
(đọc `app_settings`), tầng `lib/repositories/*`, theme Duolingo + bộ component chuẩn
(`.btn-3d`, `.wl-card`...) và font Nunito đã dựng ở Sprint 1 (xem
[05-design-system.md](../docs/05-design-system.md) §10).

> Nếu Phase 3 chưa chạy thực tế, vẫn **plan/execute được Phase 4** nhưng cần một
> **task seed dữ liệu thử** (đã đưa vào kế hoạch) để có thẻ đến hạn mà nghiệm thu.

---

## Quyết định triển khai (discuss-phase)

Liệt kê các "vùng xám" đã chốt, kèm lý do bám docs:

### QĐ1 — Cách lấy thẻ đến hạn: lọc `fsrs_state->>'due'` ở DB
- **Chốt:** Repository `cards.getDue(userId, now, limit)` truy vấn Drizzle với điều
  kiện `user_id = currentUser AND suspended = false AND (fsrs_state->>'due')::timestamptz <= now`,
  sắp xếp theo `due` tăng dần. Thẻ **chưa từng ôn** (mới đào ở Phase 3) có
  `fsrs_state.due` = thời điểm tạo (≈ now) nên cũng lọt vào hàng đợi.
- **Lý do:** đúng index gợi ý trong [03 §5](../docs/03-data-model.md):
  `cards(user_id, suspended, (fsrs_state->>'due'))`. Lọc ở DB tránh kéo toàn bộ thẻ
  lên app. `suspended = true` (loại thẻ bị tắt) bị loại — khớp [09 §5](../docs/09-flashcard-types.md)
  "ẩn khỏi hàng đợi ôn chứ không xóa".

### QĐ2 — `ts-fsrs` bọc sau `lib/srs.ts`, lưu state dạng jsonb
- **Chốt:** Dùng package **`ts-fsrs`** (FSRS-6) với cấu hình mặc định (preset). Bọc
  toàn bộ trong `lib/srs.ts`, export đúng 3 hàm: `newCardState()`, `schedule(state,
  rating, now)`, `previewIntervals(state, now)` (cho 4 nút). `fsrs_state` lưu **đúng
  object `Card` của ts-fsrs** (`due, stability, difficulty, elapsed_days,
  scheduled_days, reps, lapses, state, last_review`) dưới dạng **jsonb** trong
  `cards.fsrs_state`.
- **Lý do:** [02 §2](../docs/02-architecture.md) "ts-fsrs là chuẩn SRS hiện đại";
  [03](../docs/03-data-model.md) `cards.fsrs_state jsonb (due, stability,
  difficulty...)`; nguyên tắc chống lock-in ([02 §1](../docs/02-architecture.md)) →
  chỉ `lib/srs.ts` biết tới `ts-fsrs`, UI/repository chỉ thấy interface của ta. Khi
  nâng/đổi thuật toán chỉ sửa một file.

### QĐ3 — Mapping rating số ↔ enum FSRS; chuẩn lưu `reviews.rating`
- **Chốt:** Lưu `reviews.rating` đúng quy ước docs: **1=Again, 2=Hard, 3=Good,
  4=Easy** (int). `lib/srs.ts` map số này sang `Rating` của ts-fsrs
  (`Rating.Again/Hard/Good/Easy`). "Đáp án đúng" để tính XP = **Good (3) hoặc Easy
  (4)**.
- **Lý do:** [03 §reviews](../docs/03-data-model.md) ghi rõ "rating int 1=Again…4=Easy";
  [04 §3](../docs/04-features.md) "XP +X mỗi thẻ ôn đúng (Good/Easy)". Giữ con số
  trong DB ổn định, độc lập với enum nội bộ của thư viện (lại là một lớp chống
  lock-in).

### QĐ4 — XP cố định theo rating + bonus streak nhẹ; nguồn cấu hình
- **Chốt:** XP/thẻ: **Again = 0, Hard = 5, Good = 10, Easy = 10** (cộng khi rating ≥
  Hard để vẫn thưởng nỗ lực; "ôn đúng" Good/Easy = mức đầy). Các giá trị này đọc qua
  `lib/config` từ `app_settings` qua **một key chuẩn duy nhất** `xp_per_review`
  (type `json`, value `{"again":0,"hard":5,"good":10,"easy":10}`), **fallback cứng**
  lấy từ module DEFAULTS dùng chung (xem QĐ10) nếu key thiếu. Bonus streak: +1 XP/thẻ
  cho mỗi mốc 7 ngày streak, cap ở +5 (tùy chọn, đặt sau cờ
  `feature_flags.xp_streak_bonus`).
- **Tên key chuẩn (QUAN TRỌNG — chống drift):** **chỉ dùng `xp_per_review`** cho khái
  niệm "XP mỗi lần ôn" trong **mọi** phase. **KHÔNG** tạo thêm tên đồng nghĩa
  (`xp_per_correct`, `xp_per_card`...). Phase 4 là **nơi định nghĩa chuẩn**; Phase 5
  (Dashboard) và Phase 7 (leaderboard XP tuần) **đọc lại đúng key này** qua
  `lib/config` và lấy XP cho 1 lượt ôn đúng = `xp_per_review.good` (= `.easy`, mặc
  định 10). Lý do: ba tên khác nhau cho cùng khái niệm sẽ khiến leaderboard/Dashboard
  rơi vào fallback khác giá trị Admin đã seed/sửa → tính XP sai.
- **Lý do:** [04 §3](../docs/04-features.md) "+X mỗi thẻ ôn đúng (Good/Easy); có thể
  bonus theo streak"; [04 §5](../docs/04-features.md) câu hỏi mở "XP cố định hay theo
  độ khó FSRS" → chốt cố định theo rating cho MVP. Cấu hình runtime đi qua
  `app_settings`/`lib/config` đúng [02 §7](../docs/02-architecture.md) ("không hard-code
  setting hệ thống"). Đây là **secret-free** nên hợp lệ để vào DB.

### QĐ5 — Streak & timezone: tính theo ngày local theo timezone hệ thống (mặc định Asia/Ho_Chi_Minh)
- **Chốt:** Streak so sánh `user_stats.last_studied_date` với "hôm nay" theo **một
  timezone cấu hình** (`app_settings.app_timezone`, key chuẩn trong DEFAULTS — QĐ10,
  giá trị mặc định **`"Asia/Ho_Chi_Minh"`** đồng bộ Phase 5 QĐ7):
  - cùng ngày → streak giữ nguyên (chỉ cập nhật XP);
  - đúng hôm qua → streak += 1;
  - cách ≥ 2 ngày → streak = 1 (reset, vẫn tính buổi hôm nay là 1).
  Cập nhật streak/XP **một lần khi hoàn thành buổi ôn** (hoặc ở thẻ đúng đầu tiên của
  ngày) để tránh đua điều kiện. Logic gói trong `lib/repositories/stats.ts`
  (`recordStudyDay(userId, now)` + `addXp(userId, amount)`), chạy trong **một
  transaction**.
- **Lý do:** [04 §2 F4 bước 7](../docs/04-features.md) + [§3](../docs/04-features.md)
  "Streak dựa last_studied_date"; [04 §4/§5](../docs/04-features.md) "streak theo ngày
  — timezone cần xác nhận" → chốt timezone cấu hình (DB, không secret) để xác định
  ranh giới ngày. Đặt logic ở repository theo [02 §3/§6](../docs/02-architecture.md)
  (UI không tự tính, luôn lọc `user_id`).

### QĐ6 — Server Action chấm thẻ; ghi `reviews` + `fsrs_state` + `user_stats` atomically
- **Chốt:** Mỗi lần chấm gọi một **Server Action** `submitReview(cardId, rating)`
  (file `app/review/actions.ts`). Action: (a) xác thực session, (b) load card (lọc
  user_id), (c) `lib/srs.schedule()` tính state mới, (d) trong **một transaction**:
  `UPDATE cards.fsrs_state`, `INSERT reviews`, và (nếu là buổi hợp lệ) cập nhật
  `user_stats`. Trả về XP cộng thêm + streak hiện tại để client hiện feedback. State
  hàng đợi/UX feedback giữ ở **client** (`ReviewCard` là Client Component) để phản
  hồi <300ms; chấm xong mới gọi action (optimistic UI).
- **Lý do:** [02 §2/§5](../docs/02-architecture.md) "Server Actions đặt logic ở
  server, UI không gọi DB"; [05 §6](../docs/05-design-system.md) "animation <300ms,
  không chặn thao tác". Ghi 3 bảng trong 1 transaction để dữ liệu nhất quán
  (đúng/lịch/điểm khớp nhau).

### QĐ7 — Render mặt thẻ theo `type`, luôn hiện câu ngữ cảnh; nguồn dữ liệu
- **Chốt:** `getDue` trả về **card + note + sentence** (join `cards → notes →
  sentences`) để `ReviewCard` dựng mặt trước/sau theo bảng trong
  [09 §2](../docs/09-flashcard-types.md):
  - `recognition`: trước = `target_word` + câu ngữ cảnh; sau = `reading` + `meaning`.
  - `cloze`: trước = câu gốc khoét `target_word` (thay bằng `＿＿＿`); sau = `target_word`
    + `reading`.
  - `production`: trước = `meaning` (Việt); sau = `target_word` + `reading` + câu ví dụ.
  - `reading` (tùy chọn): trước = `target_word` (kanji); sau = `reading`.
  Khoét cloze làm ở **lib thuần** `lib/srs/cloze.ts` (string replace `surface`/`target_word`
  trong `sentences.text`), có test.
- **Lý do:** [09 §2/§3](../docs/09-flashcard-types.md) bảng mặt thẻ; "mọi loại đều
  hiển thị lại câu gốc" + "cards.note → notes.sentence_id". Nghĩa lấy từ `notes.meaning`
  (đã "chốt khi lưu thẻ" — [04 §4](../docs/04-features.md)), KHÔNG gọi AI lại.

### QĐ8 — Bàn phím + accessibility + reduced-motion + tắt âm
- **Chốt:** Phím tắt khi đang ôn: **Space/Enter = Hiện đáp án**; **1/2/3/4 =
  Again/Hard/Good/Easy**. Tôn trọng `prefers-reduced-motion` (tắt flip/confetti animate,
  giữ confetti tĩnh tối thiểu hoặc bỏ). Âm thanh chỉ phát khi `user_settings.sound_enabled
  = true` và không ở chế độ im lặng thiết bị (Howler tự tôn trọng). Lottie/confetti
  preload asset từ `public/`.
- **Lý do:** [05 §9](../docs/05-design-system.md) "hỗ trợ bàn phím phím số chấm
  Again/Hard/Good/Easy, prefers-reduced-motion"; [05 §7](../docs/05-design-system.md)
  "cho phép tắt âm, tôn trọng im lặng".

### QĐ9 — Trạng thái rỗng & kết thúc buổi
- **Chốt:** Nếu `getDue` rỗng ngay từ đầu → màn "Hết thẻ đến hạn, quay lại sau" (không
  confetti). Khi ôn hết hàng đợi đã nạp → màn **Celebration** (confetti + Lottie +
  fanfare) hiện tổng số thẻ đã ôn + XP buổi + streak mới, nút "Về Dashboard". Số thẻ
  nạp đầu buổi cố định (snapshot), thẻ Again được **xếp lại cuối hàng đợi cùng buổi**
  (không kéo dài vô hạn — chỉ ôn lại 1 lần trong buổi nếu vẫn còn due).
- **Lý do:** [04 §2 F4 bước 7](../docs/04-features.md) "kết thúc buổi → confetti +
  Lottie"; tránh buổi ôn vô tận khi liên tục bấm Again.

### QĐ10 — Một module DEFAULTS duy nhất là "nguồn key chuẩn" cho cả seed lẫn fallback
- **Vấn đề:** seed `app_settings` đang bị **phân mảnh** qua nhiều file/việc — Phase 1
  (`lib/db/seed.ts`, 7 key) + Phase 2 (`seed-settings.ts`) + Phase 3
  (`suggested_words_per_source`) + Phase 4 (`xp_per_review` + `app_timezone`) + Phase
  5/6/7 thêm nữa — không có **một nguồn sự thật** cho danh sách key/giá trị mặc định.
  Hệ quả: dễ **drift** (tên key/giá trị lệch giữa seed và fallback), dễ **đè value**
  Admin đã sửa, và verify-work Phase 1 lại assert "**đúng 7 key**" → sẽ vỡ ngay khi
  Phase 3/4 thêm key.
- **Chốt:** Tạo **một module DEFAULTS duy nhất** `lib/config/defaults.ts`
  (`export const APP_SETTINGS_DEFAULTS = {...}` — map `key → { value, type,
  description }`). Đây là **nguồn sự thật duy nhất** cho:
  1. **Seed**: mọi script seed (`lib/db/seed.ts`...) **lặp qua** `APP_SETTINGS_DEFAULTS`
     và upsert bằng `onConflictDoNothing` (KHÔNG ghi đè value Admin đã sửa) — không
     liệt kê key cứng rải rác trong nhiều file nữa.
  2. **Fallback** của `lib/config`: khi key thiếu trong DB → trả `APP_SETTINGS_DEFAULTS[key].value`.
  - Phase 4 **đưa key của mình vào module này** (`xp_per_review`, `app_timezone`) thay
    vì khai báo hằng số fallback riêng trong code. Các phase sau (5/6/7) **chỉ thêm
    entry vào cùng module này**, không tạo danh sách key song song.
  - **Timezone:** giá trị mặc định `app_timezone` cũng nằm trong DEFAULTS để tránh
    lệch giữa các phase. **Chốt một giá trị duy nhất** trong DEFAULTS:
    **`"Asia/Ho_Chi_Minh"`** (Bloóm phục vụ **người Việt** học tiếng Nhật theo
    [01](../docs/01-product-overview.md) — đồng bộ với Phase 5 QĐ7 vốn đã chốt giá
    trị này). Admin đổi runtime nếu cần. Phase 4 là **nơi seed gốc**; Phase 5 đọc lại
    CÙNG key, KHÔNG re-seed giá trị khác.
- **Verify-work Phase 1 cần nới:** thay assertion cứng "đúng 7 key" bằng "**có đủ các
  key trong `APP_SETTINGS_DEFAULTS` tại thời điểm Phase 1**" (≥ 7 key, mỗi key đúng
  `type`), để không vỡ khi phase sau thêm key. (Việc sửa câu chữ verify Phase 1 thuộc
  file Phase 1 — ghi nhận ở đây như một ràng buộc liên-phase.)
- **Lý do:** [02 §1/§7](../docs/02-architecture.md) "setting hệ thống ở DB, đọc qua
  `lib/config` (cache + fallback mặc định)"; [03 §4](../docs/03-data-model.md) bảng
  `app_settings`. Gom DEFAULTS về một module đúng tinh thần chống lock-in (đổi nguồn
  cấu hình chỉ sửa một chỗ) và loại bỏ rủi ro drift/đè value khi seed phân mảnh.

---

## Kế hoạch task nguyên tử (plan-phase)

> Quy ước chung: TypeScript strict; mọi truy vấn DB nằm trong `lib/repositories/*`
> kèm `where user_id`; UI dùng bộ component chuẩn ([05 §5b](../docs/05-design-system.md));
> mỗi task commit riêng. Lệnh dự án: `npm run dev`, `npm run typecheck` (tsc --noEmit),
> `npm test` (vitest), `npm run db:migrate` (drizzle-kit).

<task type="auto">
  <name>Cài đặt dependencies phase 4</name>
  <files>package.json</files>
  <action>Cài các package phục vụ F4: `ts-fsrs`, `howler` + `@types/howler`, `canvas-confetti` + `@types/canvas-confetti`, `lottie-react`. Motion (framer-motion) và shadcn/ui coi như đã có từ Sprint 1 — chỉ thêm nếu thiếu. Dùng `npm install`. Không nâng version các package đã có.</action>
  <verify>npm ls ts-fsrs howler canvas-confetti lottie-react 2>&1 | grep -v UNMET; npm run typecheck</verify>
  <done>4 package mới xuất hiện trong package.json dependencies; `npm ls` không báo UNMET cho chúng; typecheck pass.</done>
</task>

<task type="auto">
  <name>Thêm key XP + timezone vào module DEFAULTS chung & seed từ đó</name>
  <files>lib/config/defaults.ts, lib/db/seed.ts (hoặc drizzle/seed sẵn có), lib/config.ts</files>
  <action>Theo QĐ4 + QĐ10. Đưa **đúng 2 key mới** vào **module DEFAULTS duy nhất** `lib/config/defaults.ts` (`APP_SETTINGS_DEFAULTS`): `xp_per_review` { type:'json', value:{"again":0,"hard":5,"good":10,"easy":10}, description:"XP cộng theo rating mỗi lần ôn" }; `app_timezone` { type:'string', value:"Asia/Ho_Chi_Minh", description:"Timezone hệ thống để xác định ranh giới ngày (streak)" } (giá trị chốt đồng bộ Phase 5 QĐ7). **KHÔNG** khai hằng fallback riêng rải rác — `lib/config` đọc fallback **từ chính `APP_SETTINGS_DEFAULTS`**. Nếu `lib/config/defaults.ts` chưa tồn tại (Phase 1 chưa tách), tạo mới và **chuyển các hằng DEFAULTS cũ trong `lib/config.ts` sang đây** (giữ nguyên 7 key Phase 1 + key Phase 2/3 đã có), rồi `lib/config.ts` import lại — không đổi giá trị. Seed (`lib/db/seed.ts`) **lặp qua `APP_SETTINGS_DEFAULTS`** và upsert `onConflictDoNothing` (idempotent, không đè value Admin đã sửa). TUYỆT ĐỐI không tạo tên key đồng nghĩa cho XP (`xp_per_correct`/`xp_per_card`) — chỉ `xp_per_review`.</action>
  <verify>npm run typecheck; npm run db:migrate; node -e "require('ts-node/register'); require('./lib/db/seed.ts')" 2>/dev/null || npx tsx lib/db/seed.ts; psql "$DATABASE_URL" -c "select key,value,type from app_settings where key in ('xp_per_review','app_timezone');"; grep -rn "xp_per_correct\|xp_per_card" lib/ app/ | grep -v node_modules</verify>
  <done>`lib/config/defaults.ts` chứa `xp_per_review` + `app_timezone` (cùng các key trước đó) là nguồn duy nhất; seed lặp qua DEFAULTS, hai dòng `xp_per_review`/`app_timezone` tồn tại đúng value/type; `lib/config` trả đúng giá trị và fallback (từ DEFAULTS) khi key bị xóa; grep KHÔNG còn `xp_per_correct`/`xp_per_card` (chỉ một key `xp_per_review`).</done>
</task>

<task type="auto">
  <name>lib/srs.ts — bọc ts-fsrs</name>
  <files>lib/srs.ts</files>
  <action>Tạo `lib/srs.ts` bọc `ts-fsrs` (FSRS-6, preset mặc định). Export: `newCardState(now=new Date()): FsrsState` (tạo Card mới của ts-fsrs, due=now); `schedule(state: FsrsState, rating: 1|2|3|4, now=new Date()): { state: FsrsState; due: Date }` (map số→Rating Again/Hard/Good/Easy, gọi scheduler, trả state mới + due); `previewIntervals(state, now): Record<1|2|3|4, Date>` (4 due dự kiến cho 4 nút). Định nghĩa type `FsrsState` = object Card của ts-fsrs (serialize/deserialize an toàn jsonb: due/last_review là ISO string khi lưu, Date khi tính). Không import ts-fsrs ở nơi khác ngoài file này.</action>
  <verify>npm run typecheck</verify>
  <done>lib/srs.ts export đúng 3 hàm + type FsrsState; typecheck pass; không file nào ngoài lib/srs.ts import 'ts-fsrs' (grep xác nhận).</done>
</task>

<task type="auto">
  <name>Test lib/srs.ts</name>
  <files>lib/srs.test.ts</files>
  <action>Viết test vitest cho `lib/srs.ts`: (1) `newCardState()` có due ≈ now; (2) `schedule(newState, 1/2/3/4)` trả due tăng dần theo rating (Easy > Good > Hard, Again ngắn nhất); (3) round-trip serialize state qua JSON.stringify/parse rồi schedule tiếp vẫn hợp lệ (mô phỏng lưu jsonb); (4) `previewIntervals` trả đủ 4 key 1..4 với due > now (trừ Again có thể vài phút).</action>
  <verify>npm test -- lib/srs.test.ts</verify>
  <done>Tất cả test pass.</done>
</task>

<task type="auto">
  <name>lib/srs/cloze.ts — khoét từ đích</name>
  <files>lib/srs/cloze.ts, lib/srs/cloze.test.ts</files>
  <action>Hàm thuần `makeCloze(sentenceText: string, surface: string): string` thay lần xuất hiện đầu của `surface` trong câu bằng `＿＿＿` (full-width). Nếu không tìm thấy surface (edge case), trả nguyên câu + cờ; ưu tiên thử `surface` rồi `target_word`. Viết test: câu chuẩn khoét đúng; surface lặp nhiều lần chỉ khoét lần đầu; surface không có trong câu trả nguyên văn.</action>
  <verify>npm test -- lib/srs/cloze.test.ts</verify>
  <done>Test pass; với câu 「明日までに確認をお願いします」 + surface 確認 → 「明日までに＿＿＿をお願いします」.</done>
</task>

<task type="auto">
  <name>repository getDue — lấy thẻ đến hạn (join note + sentence)</name>
  <files>lib/repositories/cards.ts</files>
  <action>Bổ sung vào `lib/repositories/cards.ts` hàm `getDueCards(userId: string, now: Date, limit=50)` trả mảng `{ card, note, sentence }`: JOIN cards→notes→sentences, WHERE `cards.user_id = userId AND cards.suspended = false AND (cards.fsrs_state->>'due')::timestamptz <= now`, ORDER BY due ASC, LIMIT. Thêm `countDueCards(userId, now)`. Thêm migration index `idx_cards_due` trên `cards(user_id, suspended, (fsrs_state->>'due'))` nếu chưa có (drizzle-kit sql custom). Tất cả lọc user_id.</action>
  <verify>npm run typecheck; npm run db:migrate; psql "$DATABASE_URL" -c "\d+ cards" | grep idx_cards_due</verify>
  <done>getDueCards/countDueCards có type đúng, chỉ trả thẻ của user, suspended=false, due<=now; index idx_cards_due tồn tại; typecheck pass.</done>
</task>

<task type="auto">
  <name>repository applyReview — ghi review + cập nhật fsrs_state</name>
  <files>lib/repositories/cards.ts, lib/repositories/reviews.ts</files>
  <action>Tạo `lib/repositories/reviews.ts` với `insertReview(userId, cardId, rating, reviewedAt)` (lọc card thuộc user trước khi insert). Trong `cards.ts` thêm `updateFsrsState(userId, cardId, fsrsState)`. Cung cấp một hàm transaction-level `applyReview(userId, cardId, rating, now)` dùng `db.transaction`: load card (lọc user), gọi lib/srs.schedule, UPDATE fsrs_state, INSERT review; trả `{ newDue }`. KHÔNG đụng user_stats ở đây (tách task sau).</action>
  <verify>npm run typecheck; npm test -- lib/repositories/reviews.test.ts</verify>
  <done>applyReview chạy trong 1 transaction; ghi đúng reviews.rating (1..4) + cập nhật cards.fsrs_state; cố ý truyền cardId của user khác → ném lỗi/không ghi (test).</done>
</task>

<task type="auto">
  <name>repository stats — XP + streak (recordStudyDay, addXp)</name>
  <files>lib/repositories/stats.ts</files>
  <action>Trong `lib/repositories/stats.ts` thêm: `addXp(userId, amount, tx?)` (upsert user_stats, xp += amount); `recordStudyDay(userId, now, timezone, tx?)` tính ngày local theo timezone (dùng Intl.DateTimeFormat hoặc date-fns-tz nếu đã có): nếu last_studied_date = hôm nay → giữ streak; = hôm qua → streak+1; cũ hơn hoặc null → streak=1; cập nhật last_studied_date=hôm nay. Trả về streak mới. Cả hai nhận `tx` để chạy chung transaction với applyReview. Đảm bảo tạo dòng user_stats nếu chưa có (xp=0, streak=0).</action>
  <verify>npm run typecheck; npm test -- lib/repositories/stats.test.ts</verify>
  <done>Test: cùng ngày giữ streak; hôm qua +1; bỏ 2 ngày reset về 1; addXp cộng dồn đúng; tạo mới user_stats khi chưa tồn tại.</done>
</task>

<task type="auto">
  <name>Server Action submitReview</name>
  <files>app/review/actions.ts, lib/srs/xp.ts</files>
  <action>Tạo `lib/srs/xp.ts` `xpForRating(rating, xpTable)` (map rating→XP từ config QĐ4). Tạo `app/review/actions.ts` Server Action `submitReview(cardId: string, rating: 1|2|3|4)`: lấy session (chưa đăng nhập → throw), đọc xp_per_review + app_timezone qua lib/config; mở `db.transaction`: gọi `cards.applyReview(...)`, `stats.addXp(...)`, `stats.recordStudyDay(...)` (truyền tx). Trả `{ ok, newDue, xpGained, streak }`. Validate rating ∈ 1..4 (zod). Action 'use server'.</action>
  <verify>npm run typecheck</verify>
  <done>submitReview gọi được từ client, ghi reviews + fsrs_state + user_stats trong 1 transaction; trả xpGained/streak; rating ngoài 1..4 bị từ chối.</done>
</task>

<task type="auto">
  <name>lib/sound.ts — wrap Howler + cờ tắt âm</name>
  <files>lib/sound.ts, public/sounds/correct.mp3, public/sounds/wrong.mp3, public/sounds/complete.mp3</files>
  <action>Tạo `lib/sound.ts` (client-only) bọc Howler: `playCorrect()`, `playWrong()`, `playComplete()`, nhận flag `enabled`. Lazy-load Howl, preload 3 file. Thêm 3 file âm thanh placeholder ngắn (ding/buzz/fanfare) vào `public/sounds/` (asset nhẹ, free). Nếu `enabled=false` hoặc SSR → no-op. Tôn trọng lỗi autoplay (catch).</action>
  <verify>npm run typecheck; ls public/sounds/correct.mp3 public/sounds/wrong.mp3 public/sounds/complete.mp3</verify>
  <done>lib/sound.ts export 3 hàm; 3 file mp3 tồn tại; gọi khi enabled=false không phát; không lỗi khi import phía server.</done>
</task>

<task type="auto">
  <name>Component ProgressBar (Motion)</name>
  <files>components/ProgressBar.tsx</files>
  <action>Nếu chưa tồn tại từ Sprint 1, tạo `components/ProgressBar.tsx`: props `value` (0..1) + `className`; thanh nền xám bo tròn, fill primary `#58CC02`, animate width bằng Motion (framer-motion) easing mượt <300ms; tôn trọng prefers-reduced-motion (bỏ transition). Dùng class theme/CSS var của design system.</action>
  <verify>npm run typecheck</verify>
  <done>ProgressBar render thanh tiến độ, width animate theo value; với reduced-motion không animate; typecheck pass.</done>
</task>

<task type="auto">
  <name>Component Celebration (confetti + Lottie)</name>
  <files>components/Celebration.tsx, public/lottie/celebrate.json</files>
  <action>Tạo `components/Celebration.tsx` (client): khi mount → bắn `canvas-confetti` (vài burst) + render Lottie chúc mừng (lottie-react, file `public/lottie/celebrate.json`) + gọi `lib/sound.playComplete()` (theo flag). Props: `reviewed`, `xpGained`, `streak`, `onClose`. Nếu prefers-reduced-motion → bỏ confetti animate + Lottie autoplay (hiện ảnh tĩnh/biểu tượng). Thêm asset Lottie nhẹ vào public/lottie/.</action>
  <verify>npm run typecheck; ls public/lottie/celebrate.json</verify>
  <done>Celebration hiện confetti + Lottie + số liệu buổi; reduced-motion không bắn animate; asset tồn tại.</done>
</task>

<task type="auto">
  <name>Component ReviewCard</name>
  <files>components/ReviewCard.tsx</files>
  <action>Tạo `components/ReviewCard.tsx` (client). Props: `{ card, note, sentence }` (kiểu từ getDueCards) + `onRate(rating: 1|2|3|4): void`. Dựng mặt trước/sau theo `card.type` (recognition/cloze/production/reading) đúng bảng [09 §2]: cloze dùng `lib/srs/cloze.makeCloze`; luôn hiện câu ngữ cảnh gốc (trừ reading). Mặt trước có nút "Hiện đáp án" (.btn-3d .btn-info). Khi hiện đáp án → 4 nút Again/Hard/Good/Easy (.btn-3d màu: Again=danger, Hard=neutral, Good=primary, Easy=info), có nhãn khoảng thời gian dự kiến (truyền từ previewIntervals qua props hoặc tính). Flip nhẹ bằng Motion (<300ms, scale/flip), tôn trọng reduced-motion. Phím tắt Space/Enter=hiện, 1/2/3/4=chấm. Nút 🔊 **wiring thật** `lib/tts` (đã hoàn thành ở Phase 3, phụ thuộc [1,3]): đọc câu ngữ cảnh bằng `speakSentence` và từ đích bằng `speakWord` theo `reading` (kana), `lang=ja-JP`; chỉ ẩn nút khi `tts.isSupported()` = false.</action>
  <verify>npm run typecheck; mở /review, bấm 🔊 trên một thẻ → nghe đọc câu/từ tiếng Nhật</verify>
  <done>ReviewCard render đúng 4 loại thẻ, ẩn nghĩa mặt trước, hiện câu ngữ cảnh; nút Hiện đáp án → 4 nút chấm; phím tắt hoạt động; nút 🔊 gọi lib/tts đọc theo reading kana; typecheck pass.</done>
</task>

<task type="auto">
  <name>Trang /review (server) — nạp hàng đợi + bảo vệ route</name>
  <files>app/review/page.tsx</files>
  <action>Tạo `app/review/page.tsx` (Server Component). Lấy session (chưa đăng nhập → redirect /login). Gọi `cards.getDueCards(userId, new Date())` + `countDueCards`. Nếu rỗng → render trạng thái "Hết thẻ đến hạn" (.wl-card) + link Dashboard. Nếu có thẻ → render Client Component `ReviewSession` (task sau) với dữ liệu hàng đợi (snapshot) + cờ `soundEnabled` từ user_settings + xpTable + timezone (để client hiện preview, action vẫn tự đọc lại config server-side).</action>
  <verify>npm run dev rồi mở http://localhost:3000/review (đăng nhập); chưa đăng nhập → bị đẩy về /login</verify>
  <done>/review yêu cầu auth; user không thẻ thấy màn rỗng; user có thẻ due thấy phiên ôn.</done>
</task>

<task type="auto">
  <name>Client ReviewSession — điều phối buổi ôn</name>
  <files>app/review/ReviewSession.tsx</files>
  <action>Tạo `app/review/ReviewSession.tsx` (client): quản state hàng đợi (mảng thẻ snapshot), index hiện tại, đã ôn/tổng (cho ProgressBar). Render `ReviewCard` thẻ hiện tại. `onRate(rating)`: phát âm correct/wrong (lib/sound theo soundEnabled, rating≥3=correct), hiệu ứng màu xanh/đỏ <300ms, gọi Server Action `submitReview(cardId, rating)` (optimistic: chuyển thẻ tiếp ngay); nếu rating=Again xếp thẻ lại cuối hàng đợi (chỉ 1 lần/buổi — QĐ9); cập nhật ProgressBar. Khi hết hàng đợi → render `Celebration` với tổng reviewed + tổng xpGained (cộng dồn từ kết quả action) + streak mới. Tôn trọng prefers-reduced-motion.</action>
  <verify>npm run dev; tại /review chấm vài thẻ Again/Hard/Good/Easy → quan sát màu+âm+progress; hết thẻ → confetti+Lottie</verify>
  <done>Ôn được toàn bộ hàng đợi; phản hồi màu+âm đúng rating; progress bar tăng; Again được ôn lại 1 lần; kết thúc hiện Celebration với XP+streak.</done>
</task>

<task type="auto">
  <name>Seed dữ liệu thử để nghiệm thu /review</name>
  <files>lib/db/seed-review-demo.ts</files>
  <action>Script tsx tạo dữ liệu thử cho 1 user test: 1 source (type=meeting) + vài sentences có tokens, vài notes (vd 確認/かくにん/"xác nhận"), và cards cho recognition+cloze+production với `fsrs_state.due` = quá khứ (đến hạn) qua `lib/srs.newCardState`. Idempotent (xóa demo cũ theo cờ title). CHỈ để test thủ công, không chạy ở production.</action>
  <verify>npx tsx lib/db/seed-review-demo.ts --user <USER_ID>; psql "$DATABASE_URL" -c "select type,count(*) from cards group by type;"</verify>
  <done>Có ≥3 thẻ due cho user test thuộc các type khác nhau → /review hiển thị ôn được.</done>
</task>

<task type="auto">
  <name>Liên kết điều hướng tới /review</name>
  <files>components/ (nav/sidebar đã có), app/dashboard/page.tsx</files>
  <action>Thêm link/nút "Ôn tập" trỏ `/review` vào navigation hiện có và (nếu đã có) khối "thẻ đến hạn hôm nay" trên dashboard hiển thị `countDueCards` + nút .btn-3d .btn-primary "Bắt đầu ôn". KHÔNG xây lại Dashboard (thuộc Phase 5) — chỉ thêm điểm vào nếu nav đã tồn tại; nếu chưa có nav, chỉ đảm bảo /review truy cập trực tiếp được.</action>
  <verify>npm run dev; từ trang chính bấm "Ôn tập" → tới /review</verify>
  <done>Có đường vào /review từ UICard/nav (nếu sẵn có); không phá layout phase trước.</done>
</task>

<task type="auto">
  <name>Cập nhật ROADMAP trạng thái Phase 4</name>
  <files>ROADMAP.md</files>
  <action>Đổi dòng Phase 4 từ "⬜ chưa làm" sang "🔄 đang làm" khi bắt đầu, và để sẵn ✅ cho bước verify-work. Không đụng dòng phase khác.</action>
  <verify>grep -n "| 4 |" ROADMAP.md</verify>
  <done>ROADMAP phản ánh đúng trạng thái Phase 4.</done>
</task>

---

## Components tạo/đụng trong phase

| Component | File | Mục đích | Trạng thái |
|-----------|------|----------|------------|
| `ReviewCard` | `components/ReviewCard.tsx` | Thẻ ôn SRS: render theo `type` (recognition/cloze/production/reading), ẩn nghĩa mặt trước + luôn hiện câu ngữ cảnh gốc, nút "Hiện đáp án" → 4 nút Again/Hard/Good/Easy với màu + phím tắt | Tạo mới |
| `ReviewSession` | `app/review/ReviewSession.tsx` | Client điều phối buổi ôn: hàng đợi, progress, gọi Server Action, phản hồi màu+âm, kết thúc → Celebration | Tạo mới |
| `ProgressBar` | `components/ProgressBar.tsx` | Tiến độ buổi ôn (đã ôn/tổng), animate width bằng Motion, tôn trọng reduced-motion | Tạo (nếu chưa có từ Sprint 1) |
| `Celebration` | `components/Celebration.tsx` | Hoàn thành buổi → confetti (canvas-confetti) + Lottie (lottie-react) + âm fanfare; hiện reviewed/XP/streak | Tạo mới |
| `Button3D` / `.btn-3d`, `.wl-card`, `.wl-badge` | `components/ui/` + CSS chung | Bộ control chuẩn dùng cho nút chấm, thẻ, nhãn rating | Tái dùng (Sprint 1) |

---

## Pages/Routes trong phase

| Route | File | Mô tả | Auth |
|-------|------|-------|------|
| `/review` | `app/review/page.tsx` | Server Component: bảo vệ route, nạp thẻ đến hạn (`getDueCards`), trạng thái rỗng, truyền hàng đợi cho `ReviewSession` | **Bắt buộc đăng nhập** (redirect `/login` nếu chưa) |
| Server Action `submitReview` | `app/review/actions.ts` | `'use server'`: chấm thẻ → `applyReview` + `addXp` + `recordStudyDay` trong 1 transaction; trả `{ newDue, xpGained, streak }` | Kiểm tra session trong action; lọc `user_id` ở repository |

> `/review` gom thẻ từ **mọi tài liệu** của user (không phải theo từng source) đúng
> [03 §1](../docs/03-data-model.md) / [09 keyDecision] "ôn tập để SRS gom chung".

---

## Tiêu chí hoàn thành Phase (verify-work)

Checklist nghiệm thu quan sát được:

- [ ] `npm run typecheck` và `npm test` **pass** (gồm test `lib/srs`, `lib/srs/cloze`,
      `lib/repositories/stats`, `lib/repositories/reviews`).
- [ ] `ts-fsrs` **chỉ** được import trong `lib/srs.ts` (`grep -rn "ts-fsrs" --include=*.ts*`
      ngoài lib/srs trả rỗng) — chống lock-in giữ nguyên.
- [ ] Truy cập `/review` khi **chưa đăng nhập** → bị đẩy về `/login`.
- [ ] User **không có thẻ due** → thấy màn "Hết thẻ đến hạn" (không confetti).
- [ ] User **có thẻ due** (dùng seed-review-demo) → hàng đợi hiển thị; mỗi loại thẻ
      (recognition/cloze/production) render đúng mặt trước (ẩn nghĩa) và **luôn thấy
      câu ngữ cảnh gốc**; cloze khoét đúng từ đích thành `＿＿＿`.
- [ ] Bấm "Hiện đáp án" → mặt sau hiện `reading` + `meaning` (recognition) / đáp án
      đúng loại; xuất hiện 4 nút Again/Hard/Good/Easy.
- [ ] Phím **Space/Enter** hiện đáp án; **1/2/3/4** chấm tương ứng.
- [ ] Chấm **Good/Easy** → nền **xanh** + âm "ding" + XP bay lên; **Again** → nền
      **đỏ** + âm "buzz"; phản hồi tức thì (<300ms), không chặn thao tác.
- [ ] Sau khi chấm, kiểm DB: có dòng mới trong `reviews` (rating đúng 1..4 + reviewed_at);
      `cards.fsrs_state->>'due'` đã dời sang tương lai theo rating (Easy xa hơn Good
      xa hơn Hard); 3 thay đổi (reviews/cards/user_stats) **nhất quán** (cùng buổi).
- [ ] `user_stats` cập nhật: `xp` tăng theo bảng `xp_per_review`; `streak`/
      `last_studied_date` cập nhật đúng quy tắc ngày (cùng ngày giữ, hôm qua +1, bỏ
      ≥2 ngày reset về 1) theo `app_timezone`.
- [ ] **Progress bar** tăng theo số thẻ đã ôn / tổng đến hạn (animate mượt).
- [ ] Ôn **hết hàng đợi** → màn **Celebration**: confetti + Lottie + âm fanfare +
      hiển thị tổng thẻ đã ôn, XP buổi, streak mới; nút về Dashboard.
- [ ] Thẻ chấm **Again** được đưa lại cuối hàng đợi và ôn lại **đúng 1 lần** trong
      buổi (không lặp vô tận).
- [ ] Bật `prefers-reduced-motion` → flip/confetti không animate (UI vẫn dùng được);
      tắt `user_settings.sound_enabled` → **không phát âm**.
- [ ] Thẻ có `suspended = true` (loại thẻ bị tắt) **không** xuất hiện trong hàng đợi.
- [ ] `app_settings` có `xp_per_review` + `app_timezone`; sửa value (giả lập Admin)
      → buổi ôn kế tiếp dùng giá trị mới (qua `lib/config`).
- [ ] **Một key XP duy nhất:** chỉ tồn tại key `xp_per_review` cho khái niệm XP; KHÔNG
      có `xp_per_correct`/`xp_per_card` trong code lẫn DB (`grep -rn "xp_per_correct\|xp_per_card"`
      ngoài node_modules trả rỗng). Phase 5/7 sau này đọc lại đúng `xp_per_review`.
- [ ] **Nguồn DEFAULTS duy nhất:** mọi key/giá trị mặc định + fallback `app_settings`
      đến từ `lib/config/defaults.ts` (`APP_SETTINGS_DEFAULTS`); seed lặp qua module
      này (idempotent, không đè value Admin), không còn danh sách key cứng rải rác.
- [ ] Truy vấn của user A **không** trả thẻ/stat của user B (kiểm thử lọc `user_id`).
