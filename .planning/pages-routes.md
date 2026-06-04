# Bản đồ PAGES / ROUTES — WorkLingo (App Router)

> **Mục đích:** Liệt kê đầy đủ MỌI route trong `app/` (Next.js 15 App Router) — cả
> trang UI (page) lẫn route handler/API — kèm phân quyền, Feature ID, GSD Phase và
> component chính. Sắp xếp theo **GSD Phase** (1 → 7).
>
> **Nguồn sự thật:** [docs/02-architecture.md](../docs/02-architecture.md),
> [docs/04-features.md](../docs/04-features.md),
> [docs/07-user-journey.md](../docs/07-user-journey.md),
> [docs/12-gsd-workflow.md](../docs/12-gsd-workflow.md) và các kế hoạch trong
> `.planning/phase-*-plan.md`.

---

## 0. Quy ước

### Loại route
- **page** — trang UI render bằng App Router (`page.tsx`). Đa số là **Server
  Component** (lấy `currentUser`, gọi repository), nối với một **Client Component**
  (`*Client.tsx` / `*Session.tsx`) cho phần tương tác.
- **api** — Route Handler (`route.ts`) trả JSON/stream, hoặc xử lý cơ chế auth.
- **layout / hạ tầng** — `layout.tsx` không phải route nhưng quyết định khung &
  điều hướng, liệt kê riêng ở §8.

### Yêu cầu auth
- **public** — không cần đăng nhập (trang auth, endpoint cơ chế auth).
- **user** — bắt buộc đăng nhập; Server Component verify `currentUser`
  (`lib/auth`), chưa có → redirect `/login`; API chưa đăng nhập → `401`.
- **admin** — chỉ `role = admin` mới vào (`/admin/*`).

> **Phân quyền dữ liệu (xuyên suốt):** mọi truy vấn đi qua **tầng repository**,
> luôn kèm `where user_id = <currentUser>`. Source/sentence/card không thuộc user
> → `notFound()`. (Xem [02-architecture.md §6](../docs/02-architecture.md).)

### Ánh xạ GSD Phase ↔ Feature (theo docs/12-gsd-workflow.md)
| GSD Phase | Feature | Giai đoạn |
|-----------|---------|-----------|
| 1 | Nền tảng + khung Auth (F1/F1b/F1c) | MVP |
| 2 | Import + AI Ingest + Duyệt/sửa (F2, F2.5) | MVP |
| 3 | Học & sentence mining (F3) | MVP |
| 4 | Ôn tập SRS + Gamification (F4) | MVP |
| 5 | Auth đầy đủ + Admin + Dashboard + Deploy (F1, F1b, F1c, F1d, F5) | MVP |
| 6 | Upload audio/video + AI giải thích ngữ pháp (F6, F7) | GĐ2 |
| 7 | Thống kê chi tiết + social + export + cloud TTS (F8 nâng cấp) | GĐ3 |

---

## 1. Phase 1 — Nền tảng (scaffolding)

| Route | Loại | Mục đích | Auth | Feature ID | GSD Phase | Component chính |
|-------|------|----------|------|------------|-----------|-----------------|
| `/` | page | Smoke-test theme Duolingo (Card + Button3D + ProgressBar) để xác minh khung; thay/định tuyến lại ở Phase 5 | public | — (scaffold) | 1 | `app/page.tsx`, `Button3D`, `ProgressBar` |
| `/api/auth/[...nextauth]` | api | Route handler Auth.js (khung; providers rỗng — bật Email/Google ở Phase 5) | public | F1 | 1 | `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts` |

> Phase 1 chủ yếu dựng `lib/db`, `lib/config`, `lib/repositories`, `lib/ai`,
> design system; mới có 1 trang nháp `/` + khung endpoint auth.

---

## 2. Phase 2 — Import + AI Ingest + Duyệt & sửa (F2, F2.5)

| Route | Loại | Mục đích | Auth | Feature ID | GSD Phase | Component chính |
|-------|------|----------|------|------------|-----------|-----------------|
| `/import` | page | Chọn loại nguồn (chat/họp/youtube/text), nhập tiêu đề, dán text hoặc upload `.txt`, nút "Phân tích" → gọi `/api/ingest` → điều hướng sang trang Duyệt | user | F2 | 2 | `app/import/page.tsx`, `app/import/ImportForm.tsx` |
| `/import/[sourceId]/review` | page | Duyệt & sửa transcript: đối chiếu `original`↔`text` + ghi chú, highlight câu `confidence=low`, sửa câu, bỏ câu rác (`skipped`), "Xác nhận & học" → `/study` | user (chỉ source của mình) | F2.5 | 2 | `app/import/[sourceId]/review/page.tsx`, `SentenceView` |
| `/api/ingest` | api | POST `{type,title,rawContent}` → AI Ingest gpt-4o server-side (chunk nếu dài) → lưu 1 `sources` + N `sentences` (tokens kèm nghĩa) → trả `{sourceId, sentenceCount}` | user (401 nếu chưa) | F2 | 2 | `app/api/ingest/route.ts`, `lib/ai/ingest.ts` |

---

## 3. Phase 3 — Học & sentence mining (F3)

| Route | Loại | Mục đích | Auth | Feature ID | GSD Phase | Component chính |
|-------|------|----------|------|------------|-----------|-----------------|
| `/study?source=<sourceId>` | page | Màn đọc & đào từ: render câu có furigana từ `sentences.tokens`, gợi ý N "từ đáng học" (i+1 + tần suất), đánh dấu câu i+1, click từ mở popup nghĩa **tức thì (không gọi API)**, lưu thẻ / đánh dấu đã biết | user (source không thuộc user → `notFound()`) | F3 | 3 | `app/study/page.tsx`, `app/study/StudyClient.tsx`, `SentenceView`, `WordPopup`, `SuggestedWords` |
| Server Action `saveWordAsCards` | api (Server Action) | Tạo 1 `note` + N `cards` theo loại đang bật + `user_words = learning`; transaction, idempotent | user (session trong action) | F3 | 3 | `app/study/actions.ts`, `lib/repositories/cards.ts`, `lib/repositories/notes.ts` |
| Server Action `markWordKnown` | api (Server Action) | Ghi `user_words = known` (không tạo thẻ) → không gợi ý lại | user | F3 | 3 | `app/study/actions.ts` |

> **Lưu ý:** "Thư viện / danh sách tài liệu" (07-user-journey Bước 3) là **entry
> point** dẫn vào `/study?source=<id>`; danh sách source được hiển thị trên
> **Dashboard** (Phase 5) chứ không phải một route `/library` riêng ở MVP.

---

## 4. Phase 4 — Ôn tập SRS + Gamification (F4)

| Route | Loại | Mục đích | Auth | Feature ID | GSD Phase | Component chính |
|-------|------|----------|------|------------|-----------|-----------------|
| `/review` | page | Server Component nạp thẻ đến hạn (`getDueCards`, FSRS `due <= now`) từ **mọi tài liệu**; trạng thái rỗng; truyền hàng đợi cho client; kết thúc buổi → confetti + Lottie | user (redirect `/login` nếu chưa) | F4 | 4 | `app/review/page.tsx`, `app/review/ReviewSession.tsx`, `ReviewCard`, `Celebration` |
| Server Action `submitReview` | api (Server Action) | Chấm thẻ (1–4) → `applyReview` (ts-fsrs) + `addXp` + `recordStudyDay` (streak) trong 1 transaction → trả `{newDue, xpGained, streak}` | user (session trong action) | F4 | 4 | `app/review/actions.ts`, `lib/srs/*`, `lib/repositories/stats.ts` |

---

## 5. Phase 5 — Auth đầy đủ + Admin + Dashboard (F1, F1b, F1c, F1d, F5)

### 5.1 Trang xác thực (auth group)
| Route | Loại | Mục đích | Auth | Feature ID | GSD Phase | Component chính |
|-------|------|----------|------|------------|-----------|-----------------|
| `/login` | page | Đăng nhập Email/Password + nút Google; link "Quên mật khẩu?" | public | F1 | 5 | `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`, `AuthForm` |
| `/forgot` | page | Nhập email → gửi link đặt lại mật khẩu (token hết hạn) | public | F1b | 5 | `app/(auth)/forgot/page.tsx` |
| `/reset-password` | page | Đặt mật khẩu mới qua token từ email | public (cần token hợp lệ) | F1b | 5 | `app/(auth)/reset-password/page.tsx` |
| `/change-password` | page | Đổi mật khẩu khi đã đăng nhập (mật khẩu hiện tại + mới + xác nhận, ≥ 8 ký tự) | user | F1c | 5 | `app/change-password/page.tsx` |

### 5.2 Dashboard & cơ chế auth
| Route | Loại | Mục đích | Auth | Feature ID | GSD Phase | Component chính |
|-------|------|----------|------|------------|-----------|-----------------|
| `/dashboard` | page | Streak hiện tại, tổng XP, số thẻ đến hạn hôm nay, tổng số thẻ + danh sách tài liệu (entry point sang `/study`, `/review`) | user | F5 | 5 | `app/dashboard/page.tsx`, `StatCard`, `ProgressBar` |
| `/api/auth/[...nextauth]` | api | Route handler Auth.js đầy đủ: sign-in/out/callback (Email + Google OAuth, Drizzle adapter) | public (cơ chế auth) | F1 | 5 (bật từ khung Phase 1) | `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts` |

### 5.3 Quản trị (admin) — F1d
| Route | Loại | Mục đích | Auth | Feature ID | GSD Phase | Component chính |
|-------|------|----------|------|------------|-----------|-----------------|
| `/admin` | page | Thống kê tổng (số người dùng, tài liệu, thẻ, lượt AI/tháng) + thanh tab | admin | F1d | 5 | `app/admin/page.tsx`, `app/admin/layout.tsx` |
| `/admin/users` | page | Bảng người dùng (tên, email, role, streak, ngày tham gia, trạng thái) + tìm kiếm + khoá/mở/đổi role | admin | F1d | 5 | `app/admin/users/page.tsx`, `admin/UserTable` |
| `/admin/content` | page | Tab Nội dung: tài liệu toàn hệ thống + chủ sở hữu + số câu | admin | F1d | 5 | `app/admin/content/page.tsx`, `admin/ContentTable` |
| `/admin/settings` | page | Trình sửa `app_settings` runtime (model AI, feature flags, giới hạn…) — không cần deploy lại | admin | F1d | 5 | `app/admin/settings/page.tsx`, `admin/SettingForm` |

---

## 6. Phase 6 — GĐ2: Upload audio/video + AI giải thích ngữ pháp (F6, F7)

| Route | Loại | Mục đích | Auth | Feature ID | GSD Phase | Component chính |
|-------|------|----------|------|------------|-----------|-----------------|
| `/import` (sửa) | page | Thêm luồng upload audio/video + dán URL YouTube (ngoài dán text/.txt hiện có) | user | F6 | 6 | `app/import/page.tsx` (mở rộng `ImportForm`) |
| `/study` (sửa) | page | Câu của source audio có nút nghe lại đoạn gốc (`audio_start`); mọi câu có nút "Giải thích" ngữ pháp | user | F6, F7 | 6 | `app/study/page.tsx` (gián tiếp qua `SentenceView`) |
| `/admin` (sửa) | page | Sửa runtime các `app_settings` GĐ2 mới: `whisper_model`, `storage_dir`, `max_audio_mb`, `youtube_caption_lang`, feature flags | admin | F6 | 6 | `app/admin/settings/page.tsx` |
| `/api/ingest/audio` | api | Upload audio/video → lưu Storage → Whisper transcribe → tách câu kèm `audio_start` → lưu source/sentences | user | F6 | 6 | `app/api/ingest/audio/route.ts`, `lib/ai` (Whisper) |
| `/api/ingest/youtube` | api | Nhận URL YouTube → lấy phụ đề → AI Ingest → lưu source/sentences | user | F6 | 6 | `app/api/ingest/youtube/route.ts` |
| `/api/media/[...key]` | api | Stream file audio đã upload (hỗ trợ Range), kiểm `user_id`/admin | user (chỉ chủ sở hữu hoặc admin) | F6 | 6 | `app/api/media/[...key]/route.ts` |
| `/api/grammar` | api | Gọi AI (OpenAI) với câu + ngữ cảnh → trả giải thích ngữ pháp tiếng Việt | user | F7 | 6 | `app/api/grammar/route.ts`, `lib/ai` |

---

## 7. Phase 7 — GĐ3: Thống kê chi tiết + social + export + cloud TTS

| Route | Loại | Mục đích | Auth | Feature ID | GSD Phase | Component chính |
|-------|------|----------|------|------------|-----------|-----------------|
| `/stats` | page | Heatmap 12 tháng + biểu đồ thống kê chi tiết (phân bố rating, XP theo ngày, thẻ theo loại, retention) + level | user (chỉ dữ liệu của mình) | GĐ3 (mở rộng F5) | 7 | `app/stats/page.tsx`, `StatsCharts` (Recharts) |
| `/leaderboard` | page | Bảng xếp hạng XP tuần (top N), highlight user hiện tại; chỉ tên + XP (không email); tôn trọng `leaderboard_enabled` | user (dữ liệu công khai) | GĐ3 | 7 | `app/leaderboard/page.tsx`, `LeaderboardTable` |
| `/dashboard` (sửa) | page | Thêm HeartsBar + level + link sang `/stats`, `/leaderboard` + nút Export Anki | user | GĐ3 | 7 | `app/dashboard/page.tsx`, `HeartsBar` |
| `/admin` (sửa) | page | Sửa runtime `tts_provider`, `tts_voice`, cờ hearts/leaderboard | admin | GĐ3 | 7 | `app/admin/settings/page.tsx` |
| `/api/export/anki` | api | GET: sinh & stream file `.apkg` (fallback TSV) chứa thẻ của user | user (401 nếu chưa; chỉ thẻ của mình) | GĐ3 | 7 | `app/api/export/anki/route.ts` |
| `/api/tts` | api | GET: cloud TTS — trả URL audio (cache theo hash), gọi provider khi miss; chỉ chạy khi `tts_provider=cloud` | user | GĐ3 (nâng cấp F8) | 7 | `app/api/tts/route.ts`, `lib/tts` |

---

## 8. Layout & hạ tầng (không phải route, nhưng định hình điều hướng)

| File | Vai trò | GSD Phase |
|------|---------|-----------|
| `app/layout.tsx` | Layout gốc: font Nunito, theme, `UserMenu` (tên/email, link đổi mật khẩu, link admin theo role, Đăng xuất) | 1 (khung) / 5 (UserMenu) |
| `app/(auth)/` | Route group cho trang xác thực (`login`, `forgot`, `reset-password`) — layout tối giản không cần đăng nhập | 5 |
| `app/admin/layout.tsx` | Layout khu admin: guard `role = admin`, thanh tab (Tổng quan / Người dùng / Nội dung / Cài đặt) | 5 |

> **TTS (F8 — MVP):** phát âm bằng **Web Speech API** chạy **client-side** qua
> `lib/tts` (không có route). Endpoint `/api/tts` chỉ xuất hiện ở Phase 7 khi nâng
> lên cloud TTS + cache.

---

## 9. Sơ đồ điều hướng giữa các trang

### 9.1 Luồng xác thực (Phase 5)
```
        /login ──(Email/Google OK)──► /dashboard
          │  ▲
"Quên mật khẩu?" │ (quay lại sau khi đặt lại)
          ▼  │
        /forgot ──(email link)──► /reset-password ──► /login

  (đã đăng nhập) UserMenu ──► /change-password ──► (báo OK) ──► /dashboard
  (role=admin)   UserMenu ──► /admin
```

### 9.2 Vòng học chính (MVP — Phase 2 → 4)
```
  /dashboard
     │  "Thêm tài liệu"
     ▼
  /import ──(POST /api/ingest)──► /import/[sourceId]/review
     │                                   │  "Xác nhận & học"
     │                                   ▼
     │                          /study?source=<id>
     │                           (click từ → WordPopup → Lưu thẻ)
     │                                   │  (thẻ vào bộ chung)
     │  "danh sách tài liệu"             │
     │  "Tiếp tục/Bắt đầu"               ▼
     └──────────────────────────► /review  ──(submitReview)──► confetti 🎉
                                         │
                                         ▼
                                   /dashboard (streak +1, XP tăng)
```

### 9.3 Khu quản trị (Phase 5–7)
```
  /admin ──► /admin/users
        ├──► /admin/content
        └──► /admin/settings   (sửa app_settings runtime)
```

### 9.4 Mở rộng GĐ2/GĐ3 (Phase 6–7)
```
  /import ──(POST /api/ingest/audio | /api/ingest/youtube)──► /import/[id]/review ──► /study
  /study  ──(POST /api/grammar → giải thích ngữ pháp; GET /api/media/[...key] → nghe lại)
  /dashboard ──► /stats     (heatmap + biểu đồ + level)
            ├──► /leaderboard (XP tuần)
            └──(GET /api/export/anki)──► tải .apkg
  TTS: /study, /review ──(GET /api/tts khi tts_provider=cloud)──► audio (cache)
```

---

## 10. Tổng hợp nhanh theo phân quyền

| Auth | Routes |
|------|--------|
| **public** | `/`, `/login`, `/forgot`, `/reset-password`, `/api/auth/[...nextauth]` |
| **user** | `/change-password`, `/dashboard`, `/import`, `/import/[sourceId]/review`, `/study`, `/review`, `/stats`, `/leaderboard`, `/api/ingest`, `/api/ingest/audio`, `/api/ingest/youtube`, `/api/media/[...key]` (chủ sở hữu), `/api/grammar`, `/api/export/anki`, `/api/tts`, các Server Action (`saveWordAsCards`, `markWordKnown`, `submitReview`) |
| **admin** | `/admin`, `/admin/users`, `/admin/content`, `/admin/settings` |
