# Bloóm — CATALOG COMPONENT đầy đủ

> Danh mục **mọi component** cần xây cho Bloóm, gồm **component nghiệp vụ**
> (study/review/import/admin/gamification) và **component nền** (layout, nav,
> shadcn `ui/*`). Nhóm theo **GSD Phase** (1→7).
>
> **Nguồn sự thật:** `docs/05-design-system.md`, `docs/09-flashcard-types.md`,
> `docs/07-user-journey.md`, `docs/04-features.md`, `docs/02-architecture.md`, và
> các kế hoạch phase trong `.planning/phase-*-plan.md`.
>
> **Ánh xạ Phase ↔ Feature ↔ Giai đoạn** (theo `ROADMAP.md` / `docs/12-gsd-workflow.md`):
>
> | Phase | Tên phase | Feature docs | Giai đoạn |
> |-------|-----------|--------------|-----------|
> | 1 | Nền tảng / Framework Foundation | (theme, skeleton) | MVP |
> | 2 | AI Ingest + Import + Duyệt transcript | F2, F2.5 | MVP |
> | 3 | Học + chọn từ thông minh + flashcard | F3 | MVP |
> | 4 | Ôn tập SRS + Gamification | F4 | MVP |
> | 5 | Auth + Admin + Dashboard + Deploy | F1, F1b, F1c, F1d, F5 | MVP |
> | 6 | GĐ2 — Media (audio/video/YouTube) + Ngữ pháp | F6, F7 | GĐ2 |
> | 7 | GĐ3 — Thống kê, Social, Export, Cloud TTS | (stats/hearts/leaderboard/export) | GĐ3 |

---

## 0. Quy ước design system bám theo (áp dụng cho MỌI component)

> Đây là "luật vàng" mọi component dưới đây phải tuân (theo `docs/05-design-system.md`).

| Khía cạnh | Quy ước bắt buộc |
|-----------|------------------|
| **Font** | Nunito (400/700/800/900); tiêu đề `font-extrabold`; nội dung `font-bold`. Tiếng Nhật fallback Noto Sans JP; furigana = ruby text (`<ruby><rt>`) |
| **Màu (tokens)** | `primary #58CC02` / `primary-dark #46A302`, `danger #FF4B4B`, `xp #FFC800`, `info #1CB0F6`, `bg #FFFFFF/#F7F7F7`, `text #3C3C3C`, `muted #AFAFAF` — khai báo CSS vars + map Tailwind |
| **Control chuẩn** | Nút → `.btn-3d` + biến thể (`.btn-primary/.btn-info/.btn-danger/.btn-xp/.btn-neutral`, `.btn-sm`); ô nhập → `.wl-input`; dropdown → `.wl-select`; thẻ → `.wl-card`; nhãn → `.wl-badge`; chip/tab → `.wl-chip/.wl-chip-on`. KHÔNG tự chế bo góc/viền/padding |
| **Hình khối** | Bo góc lớn `rounded-2xl`/`rounded-3xl`; viền dày `border-2` (cảm giác sticker); spacing thoáng |
| **Animation (Motion)** | < 300ms cho phản hồi; chuyển trang fade+slide; progress animate width; thẻ ôn flip/scale; sai = rung nhẹ, đúng = nảy nhẹ |
| **Ăn mừng** | Lottie (`lottie-react`) + confetti (`canvas-confetti`) khi hoàn thành buổi |
| **Âm thanh (Howler)** | ding (đúng) / buzz (sai) / fanfare (hoàn thành); chỉ phát khi `user_settings.sound_enabled`; tôn trọng chế độ im lặng |
| **A11y / Responsive** | Tương phản đạt chuẩn; phím tắt ôn (Space/Enter hiện, 1/2/3/4 chấm); mobile-first 1 cột, nút lớn; **tôn trọng `prefers-reduced-motion`** (giảm/tắt animate + confetti) |

---

## Phase 1 — Nền tảng / Framework Foundation (MVP)

> Chỉ dựng **theme + component chữ ký + skeleton**; các phase sau cắm logic vào.

### 1A. Component nền (CSS chuẩn + shadcn ui/*)

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| Bộ class chuẩn CSS (`.btn-3d` + biến thể, `.wl-input`, `.wl-select`, `.wl-card`, `.wl-badge`, `.wl-chip/.wl-chip-on`, ruby `rt`) | "Hệ điều hành" style đồng nhất toàn app — port từ `mockups/index.html` vào `app/globals.css` | (class CSS, không phải React) | Toàn bộ app | 1 |
| `ui/button` (shadcn) | Control nút nền (a11y/focus) làm nền cho `Button3D` | `variant`, `size`, `asChild`, `disabled`… | Toàn bộ app | 1 |
| `ui/input` (shadcn) | Ô nhập nền (gắn class `.wl-input`) | `type`, `value`, `placeholder`… | Import, Auth, Admin | 1 |
| `ui/select` (shadcn) | Dropdown nền (gắn `.wl-select`) | `value`, `onValueChange`, `options`… | Import, Admin | 1 |
| `ui/card` (shadcn) | Thẻ nền (gắn `.wl-card`) | `children`, `className` | Toàn bộ app | 1 |
| `ui/badge` (shadcn) | Nhãn nền (gắn `.wl-badge`) | `variant`, `children` | Dashboard, Admin, Study | 1 |
| `ui/dialog` (shadcn) | Modal nền cho popup/xác nhận | `open`, `onOpenChange`, `children` | WordPopup, Admin (xác nhận) | 1 |
| `ui/popover` (shadcn) | Lớp nền cho `WordPopup` | `open`, `anchor`, `children` | Study | 1 |
| `ui/tabs` (shadcn) | Tab nền (Admin dùng `.wl-chip` style) | `value`, `onValueChange` | Admin | 1 |
| `ui/toast` (shadcn) | Thông báo ngắn (lưu thẻ, lỗi…) | `title`, `description`, `variant` | Toàn bộ app | 1 |
| `ui/skeleton` (shadcn) | Placeholder khi loading | `className` | Dashboard, Study, Import | 1 |

### 1B. Component chữ ký + nền tảng layout

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `Button3D` | **Nút chữ ký Duolingo** (`.btn-3d` + biến thể màu + `btn-sm`) — nền cho mọi nút | `variant: 'primary'\|'info'\|'danger'\|'xp'\|'neutral'`, `size: 'default'\|'sm'`, `...buttonProps` | Toàn bộ app | 1 |
| `ProgressBar` | Thanh tiến độ animate width (Motion <300ms), tôn trọng reduced-motion | `value` (0..1 hoặc 0..100), `className` | Review, Dashboard, Import ("đang phân tích") | 1 |
| `Card` | Khối/thẻ nội dung style `.wl-card` | `children`, `className`, padding | Toàn bộ app | 1 |
| `RootLayout` (`app/layout.tsx`) | Khung gốc: nạp font Nunito + Noto Sans JP, body màu/nền, providers (Toast) | `children` | Toàn bộ app | 1 |
| `PageTransition` (wrapper Motion) | Hiệu ứng chuyển trang/màn fade+slide; tôn trọng reduced-motion | `children` | Toàn bộ app | 1 |
| Trang nền `/` (`app/page.tsx`) | Smoke-test theme (Card + Button3D + ProgressBar) — tạm để xác minh khung | — | `/` | 1 |

> **Skeleton phi-UI cùng phase (không phải component, ghi nhận để đủ):** `lib/db`,
> `lib/config`, `lib/repositories/*`, `lib/ai/*`, `lib/tts`, `lib/srs` — là nền cho
> các component phase sau gọi vào.

---

## Phase 2 — AI Ingest + Import + Duyệt transcript (MVP — F2, F2.5)

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `SentenceView` | **Render câu + furigana (ruby)** từ `sentences.tokens`; mỗi token **click được**; KHÔNG gọi API (nghĩa đã có sẵn) | `sentence` (text+tokens), `onTokenClick(token)`, `plusOne?` (đánh dấu i+1), `statusMap?` | Import (duyệt), Study | 2 (tạo, dùng lại Phase 3) |
| `ImportForm` | Form thêm tài liệu: chọn loại nguồn (chat/họp/youtube/text) + tiêu đề + dán text / upload .txt + nút **Phân tích**; hiện trạng thái "Đang phân tích…" | `onSubmit({type,title,rawContent})`, `loading` | `/import` | 2 |
| `ReviewList` (duyệt transcript) | Danh sách câu đã tách để **duyệt & sửa**: đối chiếu `original↔text`, **highlight câu `confidence=low`**, sửa câu, bỏ qua câu rác (`skipped`), nút Xác nhận | `sentences[]`, `onEditText(id,text)`, `onToggleSkip(id)`, `onConfirm` | `/import/[sourceId]/review` | 2 |
| `ReviewSentenceRow` (con của ReviewList) | 1 dòng câu trong danh sách duyệt: badge cảnh báo low, ô sửa text, nút skip | `sentence`, `onEdit`, `onToggleSkip` | `/import/[sourceId]/review` | 2 |
| `AnalyzingState` / spinner (dùng `ProgressBar`) | Trạng thái "Đang phân tích…" khi gọi `/api/ingest` | `progress?` | `/import` | 2 (tái dùng ProgressBar) |
| `EmptyState` (chung) | Trạng thái rỗng/đang tải cho danh sách | `icon`, `title`, `action?` | Import, Review, Dashboard | 2 (tạo dùng chung) |

> Trang: `/import` (`app/import/page.tsx` + `ImportForm`), `/import/[sourceId]/review`
> (duyệt). Sau xác nhận → điều hướng `/study`.

---

## Phase 3 — Học + chọn từ thông minh + Flashcard (MVP — F3)

> Loại thẻ (theo `docs/09-flashcard-types.md`): Nhận diện (mặc định), Cloze, Sản
> sinh, (tùy chọn) Đọc kanji. Mọi loại **hiển thị lại câu họp gốc**.

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `WordPopup` | **Popup nghĩa từ:** surface/reading/pos/`meaning_vi` đọc thẳng từ `tokens` (KHÔNG API) + nút 🔊 (TTS đọc theo `reading`) + nút **"Lưu thẻ"** + **"Đã biết / Bỏ qua"** | `token`, `onSave`, `onMarkKnown`, `onSpeak`, `onClose` | `/study` | 3 |
| `SentenceView` (mở rộng) | Bổ sung: đánh dấu **câu i+1** (nền vàng), badge trạng thái từ (`learning`/`known`), token click mở `WordPopup` | (như Phase 2) + `plusOne`, `statusMap` | `/study` | 3 (mở rộng) |
| `SuggestedWords` | Khối **"✨ N từ đáng học cho bạn"**: chip từng từ (surface + reading nhỏ), chạm để **bỏ** (→ `known`, chip mờ), nút **"✓ Lưu tất cả"**; cảnh báo quá tải khi bật ≥3 loại thẻ ("Bật 3 loại = mỗi từ thành 3 thẻ ôn") | `suggestions[]`, `onSaveAll`, `onToggleSkip(lemma)`, `statusMap` | `/study` | 3 |
| `StudyClient` | **Vỏ client của `/study`:** state câu hiện tại + token đang chọn; header (tiêu đề source, "câu i/N"); danh sách `SentenceView`; điều khiển Câu trước/Câu tiếp; nối callback popup/suggested vào Server Actions; cập nhật lạc quan `statusMap`; Motion fade chuyển câu | `source`, `sentences[]`, `suggestions[]`, `plusOneSentenceIds`, `statusMap`, actions | `/study` | 3 |
| `WordStatusBadge` | Nhãn nhỏ trạng thái từ trên câu (`learning`/`known`) dùng `.wl-badge` | `status` | `/study` | 3 |
| `SpeakButton` (🔊) | Nút phát âm dùng `lib/tts` (Web Speech, đọc theo kana); no-op nếu không hỗ trợ | `text`, `mode: 'word'\|'sentence'`, `reading?` | WordPopup, SentenceView, ReviewCard | 3 |

> Trang: `/study` (`app/study/page.tsx` Server Component + `StudyClient`). Server
> Actions kèm: `saveWordAsCards` (tạo `note` + N `cards` theo loại bật + `user_words=learning`),
> `markWordKnown` (`user_words=known`).

---

## Phase 4 — Ôn tập SRS + Gamification (MVP — F4)

> Phản hồi đúng/sai: màu xanh/đỏ + icon + âm (Howler) + +XP bay lên. Hoàn thành
> buổi → confetti + Lottie + fanfare. Tôn trọng `prefers-reduced-motion`.

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `ReviewCard` | **Thẻ ôn SRS:** render mặt trước/sau theo `card.type` (recognition/cloze/production/reading) đúng `docs/09`; **luôn hiện câu ngữ cảnh gốc** (trừ reading); ẩn nghĩa từ đích; nút **"Hiện đáp án"** (`.btn-info`) → 4 nút **Again/Hard/Good/Easy** (Again=danger, Hard=neutral, Good=primary, Easy=info) kèm nhãn khoảng thời gian; flip Motion <300ms; phím tắt Space/Enter + 1/2/3/4; chừa chỗ 🔊 | `card`, `note`, `sentence`, `onRate(1\|2\|3\|4)`, `previewIntervals` | `/review` | 4 |
| `ReviewSession` (vỏ client) | Quản hàng đợi ôn: hiện `ReviewCard` lần lượt, cập nhật `ProgressBar` buổi, phát âm đúng/sai (Howler theo `soundEnabled`), gọi Server Action chấm, kết thúc → `Celebration` | `queue[]`, `soundEnabled`, `xpTable`, `timezone` | `/review` | 4 |
| `ProgressBar` (tái dùng) | Tiến độ buổi ôn (đã ôn / tổng đến hạn), animate Motion | `value` (0..1) | `/review` | 4 (tái dùng Phase 1) |
| `Celebration` | **Hoàn thành buổi:** bắn `canvas-confetti` (vài burst) + Lottie chúc mừng (`public/lottie/celebrate.json`) + `playComplete()` fanfare; hiện `reviewed/xpGained/streak`; reduced-motion → ảnh tĩnh, không bắn animate | `reviewed`, `xpGained`, `streak`, `onClose` | `/review` (cuối buổi) | 4 |
| `LottieMascot` | **Linh vật hoạt cảnh** (Lottie) dùng trong Celebration / trạng thái rỗng — tách riêng để tái dùng | `src`, `loop?`, `autoplay?`, `reducedMotionFallback` | Review (celebration), Dashboard, EmptyState | 4 |
| `ConfettiOverlay` | Lớp phủ confetti tách riêng (gọi `canvas-confetti`); reduced-motion → no-op | `trigger`, `intensity?` | Review (celebration), Dashboard (mốc streak) | 4 |
| `XpFloat` (+XP bay lên) | Hiệu ứng "+XP" nảy/bay lên khi chấm đúng (Good/Easy) | `amount`, `show` | `/review` | 4 |
| `RatingButtons` (con của ReviewCard) | 4 nút chấm Again/Hard/Good/Easy với màu + nhãn khoảng thời gian + phím tắt | `intervals`, `onRate` | `/review` | 4 |
| `EmptyDueState` | Trạng thái "Hết thẻ đến hạn" (`.wl-card`) + link Dashboard (không confetti) | `onGoDashboard` | `/review` | 4 |

> Trang: `/review` (`app/review/page.tsx` Server Component bảo vệ route → nạp
> `getDueCards` → truyền queue cho `ReviewSession`). Điểm vào "Ôn tập" gắn vào nav/Dashboard.
> Asset: `public/lottie/celebrate.json`, file âm `ding/buzz/fanfare` (Howler).

---

## Phase 5 — Auth + Admin + Dashboard + Deploy (MVP — F1, F1b, F1c, F1d, F5)

### 5A. Layout & Navigation nền (ở phase này nav chính thức được dựng)

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `AppHeader` / `NavBar` | Thanh điều hướng chính: logo Bloóm, link Dashboard/Học/Ôn tập (danh sách tài liệu nằm trên Dashboard — **không có link `/library` ở MVP**), gắn `UserMenu`; ẩn ở `(auth)` | `user`, `activePath` | Mọi trang đã đăng nhập | 5 |
| `UserMenu` | Menu user: tên/email (từ session), link **Đổi mật khẩu**, link **/admin** (chỉ khi `role=admin`), nút **Đăng xuất** (`signOut`) | `user`, `isAdmin` | Header layout chính | 5 |
| `AppShell` / layout chính | Bọc các trang đã đăng nhập: Header + nội dung; `(auth)` layout riêng (không header) | `children` | Mọi trang app | 5 |
| `AuthLayout` (`app/(auth)/layout.tsx`) | Khung tối giản cho login/forgot/reset (logo + card giữa màn) | `children` | `/login`, `/forgot`, `/reset-password` | 5 |

### 5B. Auth (F1, F1b, F1c)

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `AuthForm` | Form đăng nhập Email/Password + nút **Đăng nhập với Google** (`.wl-input` + `.btn-3d`); link "Quên mật khẩu?" | `onSubmit`, `error?`, `loading` | `/login` | 5 |
| `ForgotPasswordForm` | Nhập email → "Gửi liên kết" đặt lại mật khẩu | `onSubmit`, `sent` | `/forgot` | 5 |
| `ResetPasswordForm` | Đặt mật khẩu mới từ token (mật khẩu + xác nhận) | `token`, `onSubmit`, `error?` | `/reset-password` | 5 |
| `ChangePasswordForm` | Đổi mật khẩu: hiện tại + mới + xác nhận (validate ≥8 ký tự, khớp) | `onSubmit`, `error?` | `/change-password` | 5 |
| `GoogleSignInButton` | Nút OAuth Google riêng (icon + `.btn-3d .btn-neutral`) | `onClick` | `/login` | 5 |

### 5C. Dashboard (F5)

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `StatCard` | Thẻ số liệu Dashboard (streak / XP / đến hạn hôm nay / tổng thẻ) theo `.wl-card` | `icon`, `label`, `value`, `accent?` | `/dashboard` | 5 |
| `StreakWidget` (🔥) | Widget streak nổi bật: số ngày liên tục + ngọn lửa; nảy nhẹ khi tăng (Motion) | `streak`, `active` | `/dashboard` (và Header gọn) | 5 |
| `DueTodayCard` | Khối "thẻ đến hạn hôm nay" + nút `.btn-primary` "Bắt đầu ôn" → `/review` | `count`, `onStart` | `/dashboard` | 5 |
| `DashboardGrid` | Bố cục lưới các `StatCard` + `StreakWidget` + `DueTodayCard` | `stats` | `/dashboard` | 5 |

### 5D. Admin (F1d)

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `AdminLayout` + tab bar | Layout `/admin`: `requireAdmin()` (phòng thủ kép) + thanh tab `.wl-chip` (Thống kê / Người dùng / Nội dung / Cấu hình) | `children`, `activeTab` | `/admin/*` | 5 |
| `AdminStatsPanel` | 4 ô thống kê tổng: số người dùng, tài liệu, thẻ, lượt AI/tháng | `stats` | `/admin` | 5 |
| `UserTable` (AdminUserTable) | **Bảng quản lý người dùng:** tên, email, vai trò, streak, ngày tham gia, trạng thái + tìm kiếm + **khoá/mở khoá** + đổi role | `users[]`, `onSearch`, `onToggleLock`, `onChangeRole` | `/admin/users` | 5 |
| `ContentTable` | Bảng tab **Nội dung:** tài liệu toàn hệ thống + chủ sở hữu | `sources[]` | `/admin/content` | 5 |
| `SettingForm` (AdminSettingsForm) | **Trình sửa `app_settings` runtime:** render control theo cột `type` (string/number/boolean/json), lưu không cần deploy lại | `settings[]`, `onSave(key,value)` | `/admin/settings` | 5 |
| `AdminSearchBar` | Ô tìm kiếm chung cho bảng user/nội dung (`.wl-input`) | `value`, `onChange` | `/admin/*` | 5 |

> Trang: `/login`, `/forgot`, `/reset-password`, `/change-password`, `/dashboard`,
> `/admin`, `/admin/users`, `/admin/content`, `/admin/settings`.

### 5E. Danh sách tài liệu trên Dashboard — entry point quản lý source (F5, theo `docs/07` Bước 3)

> `docs/07-user-journey.md` mô tả màn **Thư viện** (Bước 3) và **Bộ thẻ** (Bước 5).
> **Quyết định phạm vi MVP** (nhất quán với `pages-routes.md` §3 ghi chú + `phase-5-*-plan.md`):
> **KHÔNG có route `/library` hay `/deck` riêng ở MVP**. Danh sách tài liệu được nhúng
> ngay trên **`/dashboard`** làm điểm vào dẫn sang `/study?source=<id>`; "bộ thẻ gom
> chung" được phục vụ qua `/review` (gom thẻ đến hạn từ MỌI tài liệu, Phase 4).
> Trải nghiệm Thư viện/Bộ thẻ đầy đủ (route riêng, lọc/tìm/đổi tên/xóa, % đã đọc)
> được **dời sang GĐ2/GĐ3** (xem Phase 6/7 — chưa lên lịch component ở MVP).

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `SourceList` | Danh sách tài liệu của user nhúng trên Dashboard (mỗi source 1 dòng/thẻ): icon loại (💼/💬), tiêu đề, loại · số câu · số thẻ đã đào, nút "Tiếp tục/Bắt đầu" → `/study?source=<id>`; nút "➕ Thêm tài liệu" → `/import` | `sources[]` | `/dashboard` | 5 |

> **Ghi chú phạm vi 5E:** Các component `LibraryList` / `SourceCard` / `LibraryToolbar`
> / `DeckView` cùng route `/library`, `/deck` thuộc **trải nghiệm GĐ2/GĐ3** (lọc nâng cao,
> tìm kiếm, sắp xếp, % đã đọc, đổi tên/xóa, màn Bộ thẻ riêng) — **KHÔNG nằm trong MVP**
> và sẽ được lên lịch ở phase tương ứng khi mở rộng `docs/07` Bước 3/Bước 5. Ở MVP chỉ
> dựng `SourceList` nhúng Dashboard (đồng bộ với task `/dashboard` ở `phase-5-*-plan.md`).

---

## Phase 6 — GĐ2: Media (audio/video/YouTube) + Ngữ pháp (F6, F7)

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `AudioUploadForm` | Form upload file audio/video + dán URL YouTube tại `/import`; gọi API ingest tương ứng; hiển thị "Đang transcribe…" | `onUpload(file)`, `onYoutube(url)`, `status` | `/import` | 6 |
| `SentencePlayer` (🔊 audio gốc) | Nút nghe lại **đoạn audio gốc** của câu từ `audio_start` qua **Howler** (KHÁC nút TTS) | `audioUrl`, `start`, `end?` | `/study` (câu có `audio_start`) | 6 |
| `SentenceView` (mở rộng) | Thêm chỗ gắn `SentencePlayer` (khi câu có `audio_start`) + `GrammarExplain`; **không đổi** logic furigana/token | (như trước) | `/study` | 6 (mở rộng) |
| `GrammarExplain` | Nút **"Giải thích"** cạnh mỗi câu → gọi `POST /api/grammar` → render giải thích ngữ pháp tiếng Việt (markdown) trong panel/Sheet; cache theo `sentenceId` trong phiên; ẩn nếu `feature_flags.grammar_explain` tắt | `sentenceId`, `onExplain` | `/study` | 6 |
| `TranscribeProgress` | Trạng thái tiến trình transcribe (Whisper) — dùng `ProgressBar` | `status`, `progress?` | `/import` | 6 |

> Trang/API: mở rộng `/import` (audio/youtube), `/study` (player + grammar);
> `app/api/media/<key>`, `app/api/grammar`.

---

## Phase 7 — GĐ3: Thống kê, Social, Export, Cloud TTS

| Tên | Mục đích | Props chính | Dùng ở trang nào | Phase |
|-----|----------|-------------|------------------|-------|
| `StatsHeatmap` | Heatmap kiểu GitHub (số lượt ôn theo ngày) — dựng tay bằng CSS Grid + Motion; chỉ data của user | `data[]` (ngày→count) | `/stats` | 7 |
| `StatsCharts` | Biểu đồ (Recharts): XP theo ngày, phân bố rating, retention | `series`, `kind` | `/stats` | 7 |
| `LevelBadge` | Hiển thị level người dùng (tính từ XP) | `level`, `xp` | `/dashboard`, `/stats` | 7 |
| `HeartsBar` (❤️) | Thanh **hearts/mạng:** hiện số tim còn lại, hồi theo thời gian, mất khi ôn sai; ẩn nếu `feature_flags.hearts_enabled` tắt | `hearts`, `max`, `nextRefillAt` | `/review`, Header | 7 |
| `LeaderboardTable` | **Bảng xếp hạng** theo XP tuần (chỉ tên + XP, không lộ email) | `rows[]`, `currentUserId?` | `/leaderboard` | 7 |
| `ExportAnkiButton` | Nút **Export sang Anki** (`.apkg`): gọi `GET /api/export/anki`, stream file về (chỉ thẻ của user) | `onExport`, `loading` | `/deck`, `/dashboard`, Settings | 7 |
| `StatsSummaryCards` | Các thẻ tổng quan thống kê (tổng ôn, retention %, ngày học…) | `summary` | `/stats` | 7 |

> Trang/API: `/stats`, `/leaderboard`, `app/api/export/anki/route.ts`,
> `app/api/tts/route.ts` (cloud TTS + cache). `lib/tts` đổi provider sang cloud
> (Azure/Google/OpenAI) — không thêm component UI mới ngoài cấu hình ở Admin.

---

## Phụ lục A — Bảng tổng hợp nhanh component theo Phase

| Phase | Component nghiệp vụ chính | Component nền chính |
|-------|---------------------------|---------------------|
| **1** | Button3D, ProgressBar, Card | shadcn `ui/*`, RootLayout, PageTransition, bộ class chuẩn CSS |
| **2** | SentenceView, ImportForm, ReviewList, ReviewSentenceRow | EmptyState, AnalyzingState |
| **3** | WordPopup, SuggestedWords, StudyClient, SpeakButton, WordStatusBadge | (SentenceView mở rộng) |
| **4** | ReviewCard, ReviewSession, Celebration, LottieMascot, ConfettiOverlay, XpFloat, RatingButtons, EmptyDueState | (ProgressBar tái dùng) |
| **5** | AuthForm, ForgotPasswordForm, ResetPasswordForm, ChangePasswordForm, GoogleSignInButton, StatCard, StreakWidget, DueTodayCard, UserTable, ContentTable, SettingForm, AdminStatsPanel, SourceList (Dashboard) | AppHeader/NavBar, UserMenu, AppShell, AuthLayout, AdminLayout, DashboardGrid, AdminSearchBar |
| **6** | AudioUploadForm, SentencePlayer, GrammarExplain, TranscribeProgress | (SentenceView mở rộng) |
| **7** | StatsHeatmap, StatsCharts, LevelBadge, HeartsBar, LeaderboardTable, ExportAnkiButton, StatsSummaryCards | — |

## Phụ lục B — Component tái dùng xuyên phase (xây 1 lần, dùng nhiều nơi)

| Component | Xây ở Phase | Tái dùng ở |
|-----------|-------------|------------|
| `Button3D` | 1 | Mọi phase (mọi nút) |
| `Card` | 1 | Mọi phase |
| `ProgressBar` | 1 | 2 (phân tích), 4 (buổi ôn), 5 (dashboard), 6 (transcribe) |
| `SentenceView` | 2 | 3, 6 (mở rộng dần) |
| `SpeakButton` (🔊 TTS) | 3 | 4 (ReviewCard), 6 |
| `LottieMascot` / `ConfettiOverlay` | 4 | 5 (mốc streak), trạng thái rỗng |
| `StatCard` | 5 | 7 (`/stats`) |
| `EmptyState` | 2 | Toàn bộ trang có danh sách |
| shadcn `ui/*` | 1 | Mọi phase |

## Phụ lục C — Asset gắn theo design system (chuẩn bị cùng component)

| Asset | Dùng cho | Phase |
|-------|----------|-------|
| Font Nunito (400/700/800/900) + Noto Sans JP (kanji/kana/furigana) | Toàn app | 1 |
| Lottie ăn mừng (`public/lottie/celebrate.json`) + linh vật | Celebration, EmptyState | 4 |
| Âm thanh Howler: `ding` (đúng), `buzz` (sai), `fanfare` (hoàn thành) | ReviewSession, Celebration | 4 |
| Icon lucide-react | Toàn app (StatCard, nav, badge…) | 1+ |

---

> **Ghi chú phạm vi:** Component **MVP** = Phase 1–5. Component **GĐ2** = Phase 6.
> Component **GĐ3** = Phase 7. Khi `plan-phase` từng phase, đối chiếu bảng này để
> không bỏ sót component và không xây trùng (xem Phụ lục B cho component tái dùng).
