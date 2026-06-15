# 00 — Tài liệu Tổng quan Thực thi (Master Plan GSD)

> **Đây là tài liệu ĐIỀU HƯỚNG.** Nó không chứa chi tiết task — chi tiết nằm
> trong 7 file `phase-N-*.md`. Mục tiêu của tài liệu này: giải thích **luồng
> build**, **thứ tự 7 phase + lý do phụ thuộc**, **cách áp quy trình GSD cho từng
> phase**, và **bảng liên kết** tới mọi file kế hoạch + tài liệu cầu nối.
>
> - Nguồn sự thật về sản phẩm: [`docs/`](../docs/README.md)
> - Quy trình thực thi (chi tiết lệnh): [`docs/12-gsd-workflow.md`](../docs/12-gsd-workflow.md)
> - Định nghĩa "Hoàn thành MVP" gốc: [`docs/06-roadmap.md §4`](../docs/06-roadmap.md)
>
> **Đọc theo thứ tự:** Mục 1 (triết lý build) → Mục 2 (thứ tự phase) → Mục 4
> (cách dùng GSD) → Mục 6 (bảng liên kết). Trước mỗi phiên thực thi, mở đúng
> `phase-N-*.md` tương ứng.

---

## Mục lục

1. [Triết lý build: framework → components → pages](#1-triết-lý-build-framework--components--pages)
2. [Thứ tự 7 phase & đồ thị phụ thuộc](#2-thứ-tự-7-phase--đồ-thị-phụ-thuộc)
3. [Tóm tắt 7 phase](#3-tóm-tắt-7-phase)
4. [Cách dùng quy trình GSD cho từng phase](#4-cách-dùng-quy-trình-gsd-cho-từng-phase)
5. [Vùng ngọt context & model profile](#5-vùng-ngọt-context--model-profile)
6. [Bảng liên kết tới mọi file kế hoạch & tài liệu cầu nối](#6-bảng-liên-kết-tới-mọi-file-kế-hoạch--tài-liệu-cầu-nối)
7. [Definition of Done của MVP (hết Phase 5)](#7-definition-of-done-của-mvp-hết-phase-5)

---

## 1. Triết lý build: framework → components → pages

Chủ dự án yêu cầu build theo **3 lớp từ dưới lên**, KHÔNG nhảy thẳng vào trang.
Mỗi lớp là móng cho lớp trên — sai móng thì trang nào cũng phải đập đi xây lại.

```
┌───────────────────────────────────────────────────────────────┐
│  LỚP 3 — PAGES / ROUTES  (app/*)                                │
│  /import · /study · /review · /dashboard · /admin · /stats ...  │
│  Server Component + Server Action, lắp ráp components, gọi      │
│  repository — KHÔNG chứa logic nghiệp vụ rải rác.               │
└───────────────────────────────────────────────────────────────┘
                              ▲ lắp ráp
┌───────────────────────────────────────────────────────────────┐
│  LỚP 2 — COMPONENTS  (components/*)                             │
│  Button3D · ProgressBar · Card · SentenceView · WordPopup ·    │
│  ReviewCard · Celebration · StatCard · admin/*                 │
│  Tái dùng class chuẩn .btn-3d/.wl-* port 1-1 từ mockups.        │
└───────────────────────────────────────────────────────────────┘
                              ▲ dùng
┌───────────────────────────────────────────────────────────────┐
│  LỚP 1 — FRAMEWORK / NỀN TẢNG  (lib/*, schema, theme)          │
│  Next.js+TS+Tailwind+shadcn · theme Duolingo · Drizzle schema  │
│  (TẤT CẢ bảng) · lib/db · lib/repositories (skeleton) ·        │
│  lib/config · lib/ai · lib/tts · lib/srs · lib/auth            │
└───────────────────────────────────────────────────────────────┘
```

**Vì sao đúng thứ tự này lại quan trọng:**

- **Framework trước (Phase 1).** Schema cho *toàn bộ* bảng, theme tokens, và bộ
  skeleton `lib/*` được dựng một lần. Sau đó mỗi phase chỉ **thêm migration cột/
  bảng còn thiếu** và **hiện thực hoá skeleton** — không tái cấu trúc móng. Bộ
  class `.btn-3d/.wl-input/.wl-card/.wl-badge/.wl-chip/ruby rt` port nguyên từ
  `mockups/index.html` để code khớp mockup 1-1.
- **Components trước pages.** Một component (`SentenceView`, `WordPopup`,
  `ReviewCard`) được dùng lại ở nhiều trang. Dựng và kiểm thử component trước →
  trang chỉ là lắp ráp, không lặp logic. Ví dụ `SentenceView` ra đời ở Phase 2
  (render furigana, chỉ phát `onWordClick`) rồi được Phase 3 mở rộng (popup, badge
  trạng thái) và Phase 6 mở rộng tiếp (nút nghe lại audio gốc).
- **Pages sau cùng.** Trang là nơi gắn session + lọc `user_id` + lắp ráp. Nhờ
  hai lớp dưới đã vững, trang mỏng, dễ kiểm thử, dễ verify theo tiêu chí.

**Hệ quả kiến trúc bất biến (giữ ở mọi phase):**

- UI **không** chạm Drizzle trực tiếp — luôn đi qua `lib/repositories` (chống
  lock-in, [`docs/02-architecture.md §6`](../docs/02-architecture.md)).
- Mọi truy vấn dữ liệu người dùng **luôn** `where eq(table.userId, userId)`.
- Cấu hình runtime đọc qua `lib/config` (cache 30s + fallback DEFAULTS);
  **secret chỉ ở env**, không bao giờ trong `app_settings`.
- Thư viện ngoài bọc sau một lib: `ts-fsrs`→`lib/srs`, TTS→`lib/tts`,
  OpenAI→`lib/ai`, storage→`lib/storage`. Đổi nhà cung cấp = sửa 1 file.

---

## 2. Thứ tự 7 phase & đồ thị phụ thuộc

Build tuần tự **1 → 2 → 3 → 4 → 5** cho MVP, rồi **6 → 7** cho hậu-MVP.
Phụ thuộc lấy thẳng từ trường `dependsOn` của từng kế hoạch:

```
P1 Framework  ──┬─────────────┬──────────┬─────────────┐
   (móng)       │             │          │             │
                ▼             ▼          ▼             ▼
            P2 Ingest ───► P3 Study ──► P4 SRS ───► P5 Auth/Admin/Deploy
            (F2,F2.5)      (F3)        (F4)        (F1,F5)  ◄── ranh giới MVP
                │             │          │
                │             ▼          ▼
                └────────► P6 Media ◄────┘
                          (GĐ2)
                                P3,P4,P5 ──► P7 Stats/Social/Export
                                             (GĐ3)
```

| Phase | Phụ thuộc | Lý do phụ thuộc (vì sao không thể làm sớm hơn) |
|-------|-----------|-------------------------------------------------|
| **1** | — | Móng. Không có gì để dựa vào; tạo schema + theme + skeleton cho mọi phase sau. |
| **2** | 1 | Ingest cần `lib/db`, `lib/config`, `lib/ai`, Auth + `users.role` đã có từ P1. |
| **3** | 1, 2 | Học/chọn từ tiêu thụ `sources`+`sentences`+`tokens` do P2 tạo; dùng `lib/srs.createEmptyCard` (P1) để khởi `fsrs_state`. |
| **4** | 1, 3 | Ôn tập cần thẻ (`cards`+`notes`) do P3 sinh và `fsrs_state` đã khởi; bọc `ts-fsrs` qua `lib/srs` (P1). *Không phụ thuộc P2 trực tiếp.* |
| **5** | 1, 2, 3, 4 | Dashboard tổng hợp số liệu của P3/P4; Admin sửa `app_settings` mà cả P2–P4 đọc; bật Email/Google trên `lib/auth` (P1). Đóng MVP. |
| **6** | 2, 3 | GĐ2 tái dùng **nguyên pipeline** `/api/ingest`+`lib/ai/ingest` (P2) và màn study + `SentenceView` (P3); chỉ thay khâu lấy raw text. *Không cần P4/P5.* |
| **7** | 3, 4, 5 | GĐ3 đọc `reviews`/`user_stats` (P4), thẻ theo loại (P3), và phân quyền/Admin (P5) để bật/tắt cờ tính năng. |

> **Quan sát quan trọng về đường găng:** đường găng MVP là
> `1→2→3→4→5`. P4 chỉ cần `1,3` (không cần P2), nhưng theo trình tự tuyến tính
> ta vẫn làm P4 sau P3. P6 có thể chen vào ngay sau P3 nếu cần media sớm, nhưng
> khuyến nghị **đóng trọn MVP (đến P5) trước** rồi mới mở GĐ2/GĐ3.

---

## 3. Tóm tắt 7 phase

| # | Tiêu đề | Số task | Phụ thuộc | Giai đoạn | Kế hoạch chi tiết |
|---|---------|:-------:|-----------|-----------|-------------------|
| 1 | Framework / Nền tảng | 18 | — | MVP | [phase-1](phase-1-framework-foundation-plan.md) |
| 2 | AI Ingest + Import + Duyệt transcript | 12 | 1 | MVP | [phase-2](phase-2-ai-ingest-import-review-plan.md) |
| 3 | Học + Chọn từ thông minh + Flashcard | 16 | 1,2 | MVP | [phase-3](phase-3-study-wordselection-flashcards-plan.md) |
| 4 | Ôn tập SRS + Gamification | 17 | 1,3 | MVP | [phase-4](phase-4-srs-gamification-plan.md) |
| 5 | Auth + Admin + Dashboard + Deploy | 22 | 1,2,3,4 | **MVP (đóng)** | [phase-5](phase-5-auth-admin-dashboard-deploy-plan.md) |
| 6 | GĐ2 — Audio/Video, YouTube, Ngữ pháp | 16 | 2,3 | GĐ2 | [phase-6](phase-6-phase2-media-grammar-plan.md) |
| 7 | GĐ3 — Thống kê, Social, Export, Cloud TTS | 16 | 3,4,5 | GĐ3 | [phase-7](phase-7-phase3-stats-social-export-plan.md) |

**Tổng MVP (P1–P5): 85 task. Tổng toàn dự án (P1–P7): 117 task.**

### Phase 1 — Framework / Nền tảng (18 task)
Scaffold Next.js 15 + TS + Tailwind v4 + shadcn/ui; theme Duolingo (Nunito + Noto
Sans JP, color tokens dạng CSS vars, bộ class `.btn-3d/.wl-*` port 1-1 từ mockup);
component `Button3D`/`ProgressBar`/`Card`; `lib/db` (Drizzle + postgres.js pool);
**Drizzle schema cho TẤT CẢ bảng** (auth + nghiệp vụ + `app_settings`, đủ enum + 5
index gợi ý) và migration apply được lên Postgres 18; skeleton
`lib/repositories` (chữ ký thật, luôn `where user_id`), `lib/config` (cache 30s +
DEFAULTS + invalidate), `lib/ai` (interface + client + stub), `lib/tts`,
`lib/srs` (bọc ts-fsrs); `lib/auth.ts` (DrizzleAdapter, providers rỗng) +
`users.role` từ đầu; seed `app_settings` idempotent 7 key; trang chủ smoke-test
theme.
*Điểm chốt:* build phải **xanh không cần `OPENAI_API_KEY`** (AI chỉ là stub);
không ghi đè `.env*`/`docker-compose.yml`/`docs`/`mockups`/`.planning` sẵn có.

### Phase 2 — AI Ingest + Import + Duyệt transcript (12 task)
`lib/ai/prompts.ts` (system prompt + JSON schema + Zod); `lib/ai` OpenAI gpt-4o
(model đọc từ `lib/config`); `lib/ai/ingest.ts` (chunk theo `ingest_chunk_size`,
validate Zod, retry hạ temperature); bảng `sources`+`sentences` + migration;
`repositories/sources.ts` (transaction tạo source+N sentences); API
`/api/ingest` (server, giấu API key, chặn `max_import_chars`); màn `/import`
(chọn loại nguồn, dán/upload .txt, nút Phân tích); `SentenceView` (furigana ruby,
chỉ phát `onWordClick`); màn **Duyệt & sửa** (`/import/[sourceId]/review` —
đối chiếu original↔text, highlight `confidence=low`, sửa text, bỏ câu rác
`skipped`, human-in-the-loop bắt buộc, KHÔNG re-ingest).

### Phase 3 — Học + Chọn từ thông minh + Flashcard (16 task)
Bảng `user_words` (new/learning/known) + migration; `repositories/userWords` &
`wordFreq` (tần suất lemma on-the-fly, loại câu skipped); `lib/study/word-selection`
(thuần: B1 worthLearning → B2 bỏ known → B3 xếp tần suất + đánh dấu câu i+1 +
test); `repositories/study`; `lib/tts` Web Speech (đọc theo reading kana, guard
SSR); `WordPopup` (nghĩa tức thì từ tokens, 0 API, 🔊, Lưu thẻ, Đã biết/Bỏ qua);
mở rộng `SentenceView` (i+1 nền vàng, badge learning/known); `SuggestedWords`
(N từ đáng học, cảnh báo quá tải ≥3 loại); màn `/study?source=<id>` (verify
currentUser, notFound khi không thuộc user); Server Action `saveWordAsCards`
(1 note + N cards theo `enabled_card_types`, `fsrs_state=createEmptyCard`,
user_words=learning, transaction idempotent) và `markWordKnown`.

### Phase 4 — Ôn tập SRS + Gamification (17 task)
`lib/srs.ts` bọc ts-fsrs (FSRS-6: newCardState/schedule/previewIntervals + test,
**chỉ file này** import ts-fsrs); `lib/srs/cloze.ts` (khoét từ đích); repository
`cards.getDueCards/countDueCards` (lọc `fsrs_state->>'due'`, suspended=false,
user_id, dùng `idx_cards_due`), `reviews.insertReview`+`cards.applyReview`
(transaction), `stats.addXp`+`recordStudyDay` (XP cố định theo rating + streak
theo `app_timezone`); Server Action `submitReview` (ghi reviews+fsrs_state+
user_stats trong 1 transaction, trả xpGained/streak); trang `/review` + Client
`ReviewSession`; `ReviewCard` (4 loại thẻ, ẩn nghĩa, hiện câu ngữ cảnh, 4 nút
chấm + phím tắt); `ProgressBar` (Motion) + `Celebration` (confetti + lottie);
`lib/sound` (Howler, tôn trọng sound_enabled); seed `xp_per_review`+`app_timezone`.

### Phase 5 — Auth + Admin + Dashboard + Deploy (22 task) — đóng MVP
Auth.js v5 + Drizzle adapter (Email/Password Credentials + bcryptjs, Google OAuth,
session JWT); route handler `[...nextauth]`; mở rộng `users` (password_hash, role,
disabled, created_at) + migration; trang `/login` `/forgot` `/reset-password`
`/change-password`; `middleware.ts` + `lib/auth-helpers` (requireUser/requireAdmin
đọc role từ DB); **lọc user_id triệt để** ở repositories + test cô lập dữ liệu;
trang `/dashboard` (streak/XP/thẻ đến hạn/tổng thẻ); trang `/admin` +
`/admin/users` (khoá/mở/đổi role) + `/admin/content` + `/admin/settings` (trình
sửa app_settings runtime + invalidate cache); `repositories/users,admin,
password-reset` + `lib/email` (nodemailer + console fallback); components
(AuthForm, StatCard, UserMenu, admin/*); **Deploy** (PM2 ecosystem, Caddyfile
reverse proxy + TLS, backup-db.sh pg_dump rotate 14 ngày, create-admin.ts,
docs/deploy.md); checklist nghiệm thu + smoke test auth/admin end-to-end.

### Phase 6 — GĐ2: Audio/Video, YouTube, Ngữ pháp (16 task)
F6 upload audio/video → `lib/storage` (filesystem tự host) → Whisper
(verbose_json, lấy segments[].start) → **tái dùng AI Ingest** → sentences kèm
`audio_start`; nghe lại đoạn gốc qua Howler seek; import phụ đề YouTube
(`lib/youtube/captions.ts`, type=youtube, KHÔNG tải video); F7 `lib/ai/grammar`
+ `/api/grammar` (giải thích ngữ pháp tiếng Việt, không lưu DB); migration thêm
`sources.audio_url`+`sentences.audio_start` (nullable, không bảng mới); seed cấu
hình GĐ2 + `feature_flags`; routes `/api/ingest/audio`, `/api/ingest/youtube`,
`/api/grammar`, `/api/media/[...key]` (stream có kiểm user_id + Range); components
AudioUploadForm, SentencePlayer, GrammarExplain. Mọi tính năng gắn cờ
`feature_flags` để Admin bật/tắt runtime.

### Phase 7 — GĐ3: Thống kê, Social, Export, Cloud TTS (16 task)
Trang `/stats` (heatmap 12 tháng CSS Grid + Motion; Recharts: rating/XP/loại thẻ/
retention; level); gamification nâng cao (level derived từ xp; hearts = 2 cột mới
`user_stats` hồi lazy, mặc định TẮT qua `feature_flags`; leaderboard XP tuần
on-the-fly tại `/leaderboard`); export Anki (`lib/export/anki` ánh xạ 4 loại thẻ
+ ruby + câu ngữ cảnh, `/api/export/anki` sinh `.apkg`, fallback TSV); Cloud TTS
+ cache (`lib/tts` thành adapter webspeech/cloud/openai, `/api/tts` cache mp3
theo sha256, đổi provider runtime qua Admin); migration thêm hearts +
hearts_updated_at; cập nhật docs/ROADMAP đánh dấu GĐ3.

---

## 4. Cách dùng quy trình GSD cho từng phase

Mỗi phase (LỚN, đa file) chạy **trọn vòng GSD 4 bước**:
`discuss → plan → execute → verify`. Chi tiết lệnh: tham chiếu
[`docs/12-gsd-workflow.md §5`](../docs/12-gsd-workflow.md).

### 4.1 Vòng chuẩn áp cho mọi phase N

```
[Cập nhật docs + ROADMAP] → /gsd:map-codebase → /gsd:discuss-phase N
   → /gsd:plan-phase N → (ĐỌC & DUYỆT kế hoạch) → /gsd:execute-phase N
   → /gsd:verify-work N → đổi ROADMAP phase N = ✅ → /clear
```

| Bước | Lệnh GSD | Việc cần làm cho phase N | Đầu ra |
|------|----------|--------------------------|--------|
| 0. Docs | — | Xác nhận `docs/04-features.md` mô tả đủ; đánh dấu phase N "đang làm" trong `ROADMAP.md`. | docs đồng bộ |
| 1. Map | `/gsd:map-codebase` | Từ Phase 2 trở đi: quét code phase trước để GSD biết cái gì đã có. | `STATE.md` cập nhật |
| 2. Discuss | `/gsd:discuss-phase N` | Chốt các "vùng xám" (xem `keyDecisions` trong `phase-N-*.md`); **khai báo phụ thuộc đã xong** (vd "F1–F3 done, tái dùng schema/cards"). | `CONTEXT.md` |
| 3. Plan | `/gsd:plan-phase N` | Sinh task nguyên tử có `<verify>`/`<done>`. **ĐỌC KỸ:** task nào làm lại phase trước → yêu cầu bỏ. | task XML |
| 4. Execute | `/gsd:execute-phase N` | Subagent chạy (có thể song song), commit git từng task. | code + commit |
| 5. Verify | `/gsd:verify-work N` | Kiểm theo tiêu chí nghiệm thu của phase. Sai → GSD chẩn đoán & sửa. | nghiệm thu |
| 6. Đóng | đổi `ROADMAP.md` ✅ + `/clear` | Đánh dấu xong; clear context trước phase kế. | móng cho phase sau |

> **`phase-N-*.md` ↔ GSD:** mỗi file kế hoạch trong `.planning/` chính là **đầu
> vào cho bước Discuss/Plan**. Phần `keyDecisions` là kịch bản trả lời cho
> `discuss-phase`; phần `deliverables` là khung để `plan-phase` bung ra task có
> `<verify>`. Mở đúng file phase trước khi bắt đầu phiên.

### 4.2 Lưu ý scope theo phụ thuộc (chống làm lại phase cũ)

Ở mỗi `discuss-phase N`, **khai báo đích danh** phụ thuộc đã hoàn thành để GSD
chỉ lập kế hoạch phần thiếu và tái dùng code cũ (cơ chế ở
[`docs/12-gsd-workflow.md §7`](../docs/12-gsd-workflow.md)):

| Phase | Câu khai báo scope mẫu tại bước Discuss |
|-------|------------------------------------------|
| 2 | "P1 đã xong: Auth + lib/db + lib/auth + lib/config + users.role. Chỉ thêm sources/sentences + ingest, KHÔNG đụng móng." |
| 3 | "P1+P2 đã xong: schema + ingest + SentenceView. Tái dùng tokens; mở rộng SentenceView; thêm user_words + study." |
| 4 | "P1+P3 đã xong: cards/notes/fsrs_state đã có. Bọc ts-fsrs trong lib/srs; chỉ thêm luồng review + gamification." |
| 5 | "P1–P4 đã xong. Bật Email/Google trên lib/auth; thêm admin/dashboard/deploy; lọc user_id triệt để + test cô lập." |
| 6 | "P2+P3 đã xong: pipeline ingest + study. Chỉ thay khâu raw text (audio/youtube) + grammar; KHÔNG sửa schema token/câu." |
| 7 | "P3+P4+P5 đã xong: thẻ + reviews/stats + admin. Thêm stats/social/export/cloud TTS sau feature_flags." |

### 4.3 Tác vụ nhỏ (ngoài phase)

Việc nhỏ 1–2 file (thêm 1 loại thẻ, đổi âm phản hồi, thêm nút export 1 deck)
KHÔNG cần cả vòng phase — dùng `/gsd:quick` (xem
[`docs/12-gsd-workflow.md §6`](../docs/12-gsd-workflow.md)).

---

## 5. Vùng ngọt context & model profile

### 5.1 Vùng ngọt context (clear giữa phase)

Nguyên lý GSD: giữ phiên chính ở **0–30% context** ("vùng ngọt") để chất lượng
code không suy giảm. Cụ thể cho Bloóm:

- **`/clear` giữa MỖI bước lớn**, đặc biệt **bắt buộc** giữa hai phase (sau khi
  đổi ROADMAP ✅, trước khi discuss phase kế). Không để context phase 3 lẫn sang
  phase 4.
- Mỗi phase chạy trong **cửa sổ ngữ cảnh tươi mới**: discuss → plan → execute →
  verify nên là các phiên tách bạch; `execute-phase` để subagent chạy riêng,
  không nhồi vào phiên đang plan.
- Mỗi task GSD **commit git riêng** → dễ rà soát, rollback, và là điểm tự nhiên
  để cắt context.
- Dấu hiệu cần clear: phiên đã đọc nhiều file lớn, hoặc đang trộn nhiều phase →
  tóm tắt trạng thái vào `STATE.md`/`ROADMAP.md` rồi `/clear`, sau đó
  `/gsd:map-codebase` để nạp lại hiện trạng gọn gàng.

> Sai lầm cần tránh (xem [`docs/12-gsd-workflow.md §10`](../docs/12-gsd-workflow.md)):
> để context tích lũy xuyên phase, và quên `map-codebase` khi quay lại dự án có code.

### 5.2 Model profile gợi ý

Theo [`docs/12-gsd-workflow.md §9`](../docs/12-gsd-workflow.md):

| Profile | Plan | Execute | Verify |
|---------|------|---------|--------|
| `quality` | Opus | Opus | Sonnet |
| `balanced` (mặc định) | Opus | Sonnet | Sonnet |
| `budget` | Sonnet | Sonnet | Haiku |

**Gợi ý profile theo từng phase Bloóm:**

| Phase | Profile khuyến nghị | Lý do |
|-------|---------------------|-------|
| 1 Framework | **quality** | Quyết định kiến trúc/schema nền tảng — sai là kéo theo cả dự án; đáng dùng Opus cả plan lẫn execute. |
| 2 Ingest | **quality** (plan) → balanced | Prompt + JSON schema + retry là logic AI tinh tế; plan cần Opus, execute có thể Sonnet. |
| 3 Study | **balanced** | Logic chọn từ thuần (có test) + nhiều UI lắp ráp — Opus plan, Sonnet execute. |
| 4 SRS | **quality** (plan) → balanced | Bọc FSRS + transaction + streak theo timezone là logic dễ sai; plan kỹ bằng Opus. |
| 5 Auth/Deploy | **balanced** | 22 task phần nhiều khuôn mẫu (forms, admin tables, scripts deploy) — Sonnet execute hiệu quả; chú ý bảo mật ở plan. |
| 6 Media | **balanced** | Tái dùng pipeline sẵn; phần mới (storage, whisper map, range stream) plan bằng Opus. |
| 7 Stats/Export | **budget**→balanced | Nhiều task UI/biểu đồ khuôn mẫu; chuyển budget cho execute đơn giản, balanced cho export Anki. |

Lệnh đổi: `/gsd:set-profile <quality|balanced|budget>`. Dùng `balanced` mặc định;
`quality` cho phase kiến trúc/logic phức tạp (1, 4); `budget` cho phase execute
nhiều & đơn giản (7).

---

## 6. Bảng liên kết tới mọi file kế hoạch & tài liệu cầu nối

### 6.1 Kế hoạch chi tiết 7 phase (`.planning/`)

| Phase | File kế hoạch (đường dẫn tuyệt đối) |
|-------|-------------------------------------|
| 1 | `/Users/ongbinhit/working/source/Bloóm/.planning/phase-1-framework-foundation-plan.md` |
| 2 | `/Users/ongbinhit/working/source/Bloóm/.planning/phase-2-ai-ingest-import-review-plan.md` |
| 3 | `/Users/ongbinhit/working/source/Bloóm/.planning/phase-3-study-wordselection-flashcards-plan.md` |
| 4 | `/Users/ongbinhit/working/source/Bloóm/.planning/phase-4-srs-gamification-plan.md` |
| 5 | `/Users/ongbinhit/working/source/Bloóm/.planning/phase-5-auth-admin-dashboard-deploy-plan.md` |
| 6 | `/Users/ongbinhit/working/source/Bloóm/.planning/phase-6-phase2-media-grammar-plan.md` |
| 7 | `/Users/ongbinhit/working/source/Bloóm/.planning/phase-7-phase3-stats-social-export-plan.md` |

Đường dẫn tương đối (đọc trong repo): [phase-1](phase-1-framework-foundation-plan.md)
· [phase-2](phase-2-ai-ingest-import-review-plan.md)
· [phase-3](phase-3-study-wordselection-flashcards-plan.md)
· [phase-4](phase-4-srs-gamification-plan.md)
· [phase-5](phase-5-auth-admin-dashboard-deploy-plan.md)
· [phase-6](phase-6-phase2-media-grammar-plan.md)
· [phase-7](phase-7-phase3-stats-social-export-plan.md)

### 6.2 Tài liệu cầu nối GSD (thư mục gốc)

| File | Vai trò | Trạng thái |
|------|---------|------------|
| `ROADMAP.md` | Bảng ánh xạ GSD phase ↔ feature docs + trạng thái done/đang làm. | ⬜ chưa tạo — dựng theo mẫu ở [`docs/12-gsd-workflow.md §3`](../docs/12-gsd-workflow.md) |
| `PROJECT.md` | Điểm vào GSD, trỏ sang `docs/`. | ⬜ chưa tạo — mẫu ở §3 cùng tài liệu |
| `STATE.md` | GSD tự ghi hiện trạng code (qua `map-codebase`). | ⬜ sinh tự động khi chạy `map-codebase` |
| `CONTEXT.md` | Quyết định/sở thích thu được khi `discuss-phase`. | ⬜ sinh tự động khi chạy `discuss-phase` |

> `ROADMAP.md` là tài liệu cầu nối **bắt buộc** — nó cho GSD biết phase nào đã
> ✅ để không làm lại. Tạo nó ngay khi cài GSD (trước Phase 1).

### 6.3 Catalog component & pages-routes (tài liệu điều hướng lớp 2 & 3)

| File | Vai trò | Trạng thái |
|------|---------|------------|
| `components-catalog.md` | Danh mục mọi component lớp 2 (Button3D, ProgressBar, Card, SentenceView, WordPopup, SuggestedWords, ReviewCard, Celebration, ProgressBar, StatCard, UserMenu, AuthForm, admin/*, AudioUploadForm, SentencePlayer, GrammarExplain, HeatmapCalendar, LeaderboardTable, ExportAnkiButton…) + phase tạo + phase mở rộng. | ⬜ chưa tạo — companion của tài liệu này |
| `pages-routes.md` | Sơ đồ mọi route lớp 3 (`/`, `/import`, `/import/[sourceId]/review`, `/study`, `/review`, `/dashboard`, `/login`, `/forgot`, `/reset-password`, `/change-password`, `/admin/*`, `/stats`, `/leaderboard`) + API routes (`/api/ingest*`, `/api/grammar`, `/api/media/[...key]`, `/api/export/anki`, `/api/tts`, `/api/auth/[...nextauth]`) + phase + bảo vệ route. | ⬜ chưa tạo — companion của tài liệu này |

> Hai file này hiện thực hoá luồng **framework → components → pages** ở Mục 1:
> `components-catalog.md` liệt kê lớp 2, `pages-routes.md` liệt kê lớp 3. Nên tạo
> chúng song song với Phase 1 và cập nhật ở mỗi phase khi thêm component/route mới.
> Đặt cạnh tài liệu này trong `.planning/` (vd
> `/Users/ongbinhit/working/source/Bloóm/.planning/components-catalog.md`,
> `/Users/ongbinhit/working/source/Bloóm/.planning/pages-routes.md`).

### 6.4 Nguồn sự thật (`docs/`)

| # | Tài liệu | Phase liên quan nhất |
|---|----------|----------------------|
| 01 | [Tổng quan sản phẩm](../docs/01-product-overview.md) | tất cả |
| 02 | [Kiến trúc kỹ thuật](../docs/02-architecture.md) | 1 (móng), tất cả (repository/lock-in) |
| 03 | [Mô hình dữ liệu](../docs/03-data-model.md) | 1 (schema), 2, 3, 4, 6, 7 |
| 04 | [Tài liệu chức năng](../docs/04-features.md) | tất cả (mô tả F1–F8) |
| 05 | [Hệ thống thiết kế](../docs/05-design-system.md) | 1 (theme), 2–4 (components) |
| 06 | [Lộ trình & rủi ro](../docs/06-roadmap.md) | tất cả (sprint, DoD gốc) |
| 07 | [Hành trình sử dụng](../docs/07-user-journey.md) | 2, 3, 4 |
| 08 | [Chọn từ thông minh](../docs/08-smart-word-selection.md) | 3 |
| 09 | [Các loại flashcard](../docs/09-flashcard-types.md) | 3, 4, 7 (export) |
| 10 | [Chất lượng transcript](../docs/10-transcript-quality.md) | 2 |
| 11 | [AI Ingest](../docs/11-ai-ingest.md) | 2, 6 |
| 12 | [Quy trình GSD](../docs/12-gsd-workflow.md) | **tài liệu nền của Mục 4–5** |

---

## 7. Definition of Done của MVP (hết Phase 5)

MVP coi như **HOÀN THÀNH** khi **Phase 1–5 đều ✅** trong `ROADMAP.md` và thoả
toàn bộ tiêu chí dưới (mở rộng từ [`docs/06-roadmap.md §4`](../docs/06-roadmap.md)).

### 7.1 Tiêu chí chức năng (đối chiếu phase)

- [ ] **Đăng nhập Email + Google chạy ổn** (P5) — login/forgot/reset/change-password
      hoạt động; session JWT; tài khoản `disabled` bị từ chối và bị buộc đăng xuất.
- [ ] **Import + Ingest:** dán text/upload .txt → AI Ingest tách câu + từ + furigana
      + nghĩa Việt; màn **Duyệt & sửa** highlight `confidence=low`, sửa text, bỏ câu
      rác trước khi sang học (P2). Hiển thị nghĩa khi tra **< 3s** (đọc thẳng từ
      tokens, không gọi API runtime).
- [ ] **Học + chọn từ:** màn study render furigana, click từ ra `WordPopup`, gợi ý
      N từ đáng học (lọc known, xếp tần suất, đánh dấu i+1); "Lưu thẻ" sinh 1 note +
      N cards theo `enabled_card_types`, "Đã biết" ghi `user_words=known` (P3).
- [ ] **Ôn tập trọn vòng SRS không lỗi:** `/review` lấy thẻ đến hạn, render 4 loại
      thẻ, chấm 4 mức → cập nhật `fsrs_state` + ghi `reviews` trong 1 transaction;
      thẻ Again xếp lại cuối hàng đợi 1 lần/buổi (P4).
- [ ] **Gamification:** XP cố định theo rating, streak theo `app_timezone`, progress
      bar animate, confetti/Lottie ăn mừng khi xong buổi (P4).
- [ ] **Dashboard tiến độ** hiển thị streak/XP/thẻ đến hạn/tổng thẻ (P5).
- [ ] **Admin** sửa `app_settings` runtime (không deploy lại) + `lib/config`
      invalidate; quản lý user (khoá/mở/đổi role) (P5).

### 7.2 Tiêu chí kiến trúc & chất lượng (xuyên suốt)

- [ ] **Mọi truy vấn dữ liệu đi qua `lib/repositories`** — UI không chạm Drizzle
      trực tiếp (chống lock-in).
- [ ] **Lọc `user_id` triệt để** ở mọi repository; có **test cô lập dữ liệu** chứng
      minh user A không đọc được dữ liệu user B (P5).
- [ ] **Secret chỉ ở env**; cấu hình runtime đọc qua `lib/config` (cache + fallback).
- [ ] Thư viện ngoài bọc sau lib (`ts-fsrs`→`lib/srs`, TTS→`lib/tts`,
      OpenAI→`lib/ai`) — đổi nhà cung cấp chỉ sửa 1 file.
- [ ] Build **xanh**; migration apply sạch lên Postgres 18; seed `app_settings`
      idempotent đúng các key mặc định.

### 7.3 Tiêu chí vận hành / deploy

- [ ] **Deploy chạy thật trên server riêng:** Node (`next start` qua PM2) +
      PostgreSQL tự host (docker-compose postgres:18) sau Caddy reverse proxy + TLS.
- [ ] Có `scripts/backup-db.sh` (pg_dump gzip rotate 14 ngày) và
      `scripts/create-admin.ts`; `docs/deploy.md` đầy đủ.
- [ ] **Smoke test auth/admin end-to-end** đạt; checklist nghiệm thu Phase 5 đã ký.

> **Ngoài phạm vi MVP (KHÔNG yêu cầu để đóng MVP):** audio/video + YouTube + giải
> thích ngữ pháp (P6, GĐ2); heatmap/level/hearts/leaderboard/export Anki/cloud TTS
> (P7, GĐ3). Các tính năng này gắn sau ranh giới MVP và bật/tắt qua `feature_flags`.

---

> **Tóm lược điều hướng:** Build dưới-lên (framework → components → pages). Làm
> tuần tự P1→P5 để đóng MVP (85 task), rồi P6, P7 cho GĐ2/GĐ3. Mỗi phase chạy
> trọn vòng GSD `discuss → plan → execute → verify`, `/clear` giữa phase để giữ
> "vùng ngọt" 0–30% context, chọn model profile theo độ phức tạp. Mở đúng
> `phase-N-*.md` làm đầu vào, giữ `ROADMAP.md` cập nhật ✅, và cập nhật
> `components-catalog.md` + `pages-routes.md` mỗi khi thêm lớp 2/lớp 3.
