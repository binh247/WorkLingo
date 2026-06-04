# 04 — Tài liệu chức năng

> Mô tả các tính năng và luồng người dùng. Ký hiệu giai đoạn: **[MVP]**,
> **[GĐ2]**, **[GĐ3]**.

## 1. Bản đồ tính năng

| Nhóm | Tính năng | Giai đoạn |
|------|-----------|-----------|
| Tài khoản | Đăng nhập Email / Google | MVP |
| Tài khoản | **Quên mật khẩu** (gửi link đặt lại) | MVP |
| Tài khoản | **Đổi mật khẩu** | MVP |
| Quản trị | **Trang Admin** (thống kê + quản lý người dùng) | MVP/GĐ2 |
| Nhập liệu | Dán text / upload .txt tiếng Nhật | MVP |
| Nhập liệu | **Duyệt & sửa câu + đánh dấu từ đáng ngờ** | MVP |
| Nhập liệu | Upload audio/video → transcribe + nghe lại | GĐ2 |
| Nhập liệu | Import phụ đề YouTube | GĐ2 |
| Học | Tách câu + tách từ + furigana | MVP |
| Học | Nghĩa Nhật-Việt (AI Ingest sinh sẵn, hiện tức thì) | MVP |
| Học | **Gợi ý "từ đáng học" thông minh (i+1, tần suất)** | **MVP** |
| Học | Lưu flashcard có ngữ cảnh (3 loại: nhận diện/cloze/sản sinh) | MVP |
| Học | Bật/tắt loại thẻ trong cài đặt | MVP |
| Học | AI giải thích ngữ pháp câu | GĐ2 |
| Ôn tập | SRS (FSRS) | MVP |
| Ôn tập | Phản hồi đúng/sai (màu + âm thanh) | MVP |
| Gamification | Streak, XP, progress bar, confetti | MVP |
| Gamification | Hearts, level, bảng xếp hạng | GĐ3 |
| Tiến độ | Dashboard cơ bản | MVP |
| Tiến độ | Heatmap, thống kê chi tiết | GĐ3 |
| Tiện ích | **Phát âm từ/câu (Web Speech API)** | MVP |
| Tiện ích | TTS chất lượng cao (cloud) + cache audio | GĐ sau |
| Tiện ích | Export sang Anki | GĐ3 |

## 2. Luồng người dùng (User Flows)

### F1 — Đăng nhập [MVP]
1. Vào `/login`.
2. Chọn **Email/Password** hoặc **Đăng nhập với Google**.
3. Google: redirect Google → callback → tạo/đăng nhập user (Auth.js).
4. Vào `/dashboard`.
5. Link **"Quên mật khẩu?"** → màn F1b.

### F1b — Quên mật khẩu [MVP]
1. Vào `/forgot` (từ link ở màn đăng nhập).
2. Nhập email → "Gửi liên kết".
3. Hệ thống gửi email chứa link đặt lại (token hết hạn) → người dùng đặt mật khẩu mới.
4. Quay lại đăng nhập.

### F1c — Đổi mật khẩu [MVP]
1. Người dùng đã đăng nhập → vào `/change-password` (từ Cài đặt/menu).
2. Nhập **mật khẩu hiện tại** + **mật khẩu mới** + **xác nhận**.
3. Kiểm tra: đủ ô, ≥ 8 ký tự, hai ô mới khớp → cập nhật; sai → báo lỗi.

### F1d — Quản trị (Admin) [MVP/GĐ2]
1. User vai trò **admin** vào `/admin`.
2. **Thống kê tổng**: số người dùng, tài liệu, thẻ, lượt AI/tháng.
3. **Quản lý người dùng**: bảng (tên, email, vai trò, streak, ngày tham gia,
   trạng thái) + tìm kiếm + **khoá/mở khoá** tài khoản.
4. Tab **Nội dung**: theo dõi tài liệu trong hệ thống.
> Phân quyền: chỉ `role = admin` truy cập; cần thêm cột `role` cho user (Auth.js).

### F2 — Import nội dung [MVP]
1. Vào `/import`.
2. Chọn loại nguồn (chat / meeting / youtube / text) + dán nội dung hoặc upload .txt.
3. Nhấn "Phân tích".
4. Server chạy **AI Ingest (gpt-4o)** 1 lượt → JSON: câu (đã dọn lỗi) + token
   (furigana, loại từ, nghĩa Việt, đánh dấu từ đáng học).
5. Lưu `source` + `sentences`; chuyển sang **bước Duyệt & sửa (F2.5)**.

**Tiêu chí:** một buổi họp ngắn xử lý xong trong vài giây (văn dài thì chunk).

### F2.5 — Duyệt & sửa transcript [MVP]
> Xử lý text STT sai — xem [10-transcript-quality.md](10-transcript-quality.md).
1. Hiển thị các câu đã tách. Câu AI đã sửa hiện **đối chiếu gốc↔sửa** (`original`↔`text`)
   + ghi chú; câu **`confidence = low`** được **highlight cảnh báo**.
2. Người dùng **sửa câu** sai, **bỏ qua câu rác**.
3. AI đã dọn lỗi ngay trong lượt Ingest; tại đây người dùng chỉ **xác nhận/sửa lại**.
4. Xác nhận → sang màn `study` để đào thẻ.
5. Câu vẫn **sửa được sau này**, kể cả trên thẻ đã tạo.

### F3 — Học & sentence mining [MVP]
1. Sau khi phân tích, app **gợi ý sẵn "N từ đáng học cho bạn"** (thuật toán ở
   [08-smart-word-selection.md](08-smart-word-selection.md)) và highlight trong text.
2. Màn `study` hiển thị từng câu với **furigana**; câu i+1 được đánh dấu.
3. Mỗi từ **click được** → mở `WordPopup`.
4. Popup hiện: từ, cách đọc, loại từ, **nghĩa tiếng Việt** — đọc thẳng từ
   `sentences.tokens` (AI Ingest đã sinh sẵn), **không gọi API**.
5. **"Lưu thẻ"** → tạo `card` gắn câu ngữ cảnh (từ → `user_words = learning`).
   **"Đã biết / Bỏ qua"** → `user_words = known` (không gợi ý lại).
6. Từ đã lưu/đã biết được đánh dấu trên câu.

### F4 — Ôn tập SRS [MVP]
1. Vào `/review` → lấy thẻ đến hạn (FSRS `due <= now`).
2. Hiện **câu ngữ cảnh**, ẩn nghĩa từ đích.
3. User nhớ lại → bấm "Hiện đáp án".
4. Tự chấm: **Again / Hard / Good / Easy**.
5. Phản hồi tức thì: màu xanh/đỏ + âm thanh (Howler).
6. `ts-fsrs` tính lịch mới → cập nhật `fsrs_state` + ghi `reviews`.
7. Cập nhật `user_stats` (XP, streak); kết thúc buổi → **confetti + Lottie**.

### F5 — Xem tiến độ [MVP]
1. `/dashboard` hiển thị: streak hiện tại, tổng XP, số thẻ đến hạn hôm nay,
   tổng số thẻ.

### F6 — Upload audio/video [GĐ2]
1. Upload file → lưu Storage → gọi Whisper transcribe.
2. Transcript → tách câu (mỗi câu kèm `audio_start`).
3. Học như F3, có thể nghe lại đoạn audio gốc của câu.

### F7 — AI giải thích ngữ pháp [GĐ2]
1. Trong `study`, chọn câu → "Giải thích".
2. Gọi AI (OpenAI) với câu + ngữ cảnh → giải thích ngữ pháp tiếng Việt.

### F8 — Phát âm (TTS) [MVP: Web Speech]
1. Nút 🔊 ở popup từ / câu ngữ cảnh / thẻ ôn.
2. **MVP:** dùng **Web Speech API** (`speechSynthesis`, `lang='ja-JP'`) — miễn phí,
   không cần hạ tầng.
3. **Đọc theo `reading` (kana)** của từ thay vì kanji thô → phát âm chuẩn; câu thì
   đọc cả câu.
4. Bọc sau **`lib/tts`** → GĐ sau nâng lên cloud TTS (Azure/Google/OpenAI) + **cache
   audio** theo text cho chất lượng đồng nhất.

## 3. Gamification (MVP — mức cơ bản)

| Cơ chế | Quy tắc |
|--------|---------|
| 🔥 **Streak** | +1 nếu học (ôn ≥1 thẻ) trong ngày; reset nếu bỏ 1 ngày. Dựa `last_studied_date` |
| ⭐ **XP** | +X mỗi thẻ ôn đúng (Good/Easy); có thể bonus theo streak |
| 📊 **Progress bar** | Tiến độ buổi ôn (đã ôn / tổng đến hạn), animate bằng Motion |
| 🎉 **Celebration** | Hoàn thành buổi ôn → confetti + Lottie + âm thanh |

> **Triết lý:** gamification gắn với **SRS thật** — streak = học đều, XP = số thẻ
> ôn đúng → vừa vui vừa hiệu quả thật. (Hearts/level/bảng xếp hạng để GĐ3.)

## 4. Quy tắc nghiệp vụ quan trọng

- **Một câu có thể tạo nhiều thẻ** (nhiều từ khác nhau) nhưng giữ chung ngữ cảnh.
- **Nghĩa được "chốt" khi lưu thẻ** — lưu ở `notes.meaning` (mọi `cards` của cùng
  một note dùng chung nghĩa này) để không phụ thuộc thay đổi từ điển về sau.
- **Streak chỉ tính theo ngày** (timezone của user — cần xác nhận cách xử lý TZ).
- **Phân quyền:** user chỉ thấy `sources/sentences/cards/stats` của mình.

## 5. Câu hỏi mở (cần quyết định)
- Cách xử lý timezone cho streak?
- XP mỗi thẻ là cố định hay theo độ khó FSRS?
- Có cho phép sửa furigana/nghĩa thủ công ở MVP không?
