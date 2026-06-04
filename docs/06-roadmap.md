# 06 — Lộ trình & rủi ro

## 1. Lộ trình theo Sprint

### Sprint 1 — Nền tảng
- [ ] Khởi tạo Next.js + TypeScript + Tailwind + shadcn/ui.
- [ ] Dựng theme Duolingo: font Nunito, color tokens, `Button3D`, cài Motion.
- [ ] Dựng **PostgreSQL tự host** (Docker/local), đặt `DATABASE_URL` trong env.
- [ ] Dựng Drizzle (`lib/db`) + schema + migration (drizzle-kit).
- [ ] Dựng khung tầng repository (`lib/repositories`) + `lib/ai` (OpenAI).
- [ ] Bảng `app_settings` + `lib/config` (đọc cấu hình hệ thống từ DB, cache +
      fallback) + seed các key mặc định.

### Sprint 2 — AI Ingest, hiển thị & duyệt transcript
- [ ] `lib/ai/ingest` + prompt + JSON schema (structured output) cho gpt-4o; chunk văn dài.
- [ ] API `/api/ingest`: text thô → JSON dữ liệu cuối → lưu source/sentences.
- [ ] Component `SentenceView` render furigana + từ click được (đọc từ tokens).
- [ ] Màn `import` → dán text/upload .txt → gọi Ingest.
- [ ] **Màn "Duyệt & sửa"**: đối chiếu gốc↔sửa, highlight câu `confidence=low`,
      sửa câu, bỏ qua câu rác (`sentences.skipped`).

### Sprint 3 — Chọn từ thông minh & flashcard
- [ ] **Thuật toán "từ đáng học"**: dùng `worthLearning` từ Ingest + lọc `user_words`
      đã biết, xếp hạng theo tần suất, đánh dấu câu i+1 (xem [08](08-smart-word-selection.md)).
- [ ] `user_words` (learning/known) + cập nhật khi lưu/bỏ qua.
- [ ] (Tùy chọn) onboarding chọn trình độ JLPT → `user_settings.jlpt_level`.
- [ ] `WordPopup` hiện nghĩa (có sẵn trong tokens) + nút "Lưu thẻ" / "Đã biết".
- [ ] `lib/tts` (Web Speech API) + nút 🔊 đọc **theo `reading` (kana)** cho từ/câu.
- [ ] Lưu `note` + `card`(theo loại bật) qua repository (giữ ngữ cảnh).

### Sprint 4 — SRS + Gamification
- [ ] Tích hợp `ts-fsrs`.
- [ ] Màn `review` — ôn theo lịch, phản hồi đúng/sai (màu + âm thanh).
- [ ] Cập nhật `fsrs_state` + ghi `reviews`.
- [ ] XP + streak (`user_stats`); progress bar animate (Motion).
- [ ] Confetti + Lottie ăn mừng khi xong buổi.

### Sprint 5 — Auth & hoàn thiện MVP
- [ ] Auth.js + Drizzle adapter (Email + Google OAuth).
- [ ] Bảo vệ route + lọc dữ liệu theo `user_id` ở tầng repository.
- [ ] Dashboard tiến độ (streak, XP, thẻ đến hạn).
- [ ] Trang Admin sửa `app_settings` runtime (không cần deploy lại).
- [ ] Deploy lên **server riêng** (Node + PostgreSQL tự host) sau reverse proxy + TLS.

### Giai đoạn 2 (sau MVP)
- [ ] Upload audio/video → Whisper transcribe (kèm `audio_start`).
- [ ] Import phụ đề YouTube.
- [ ] AI giải thích ngữ pháp (OpenAI qua `lib/ai`).
- [ ] Nâng cấp i+1: gợi ý câu/nội dung mới dựa trên vốn từ đã học (đề xuất tài liệu).

### Giai đoạn 3
- [ ] Phân loại nội dung theo nguồn/dự án/người gửi.
- [ ] Heatmap, thống kê chi tiết; level, bảng xếp hạng, hearts.
- [ ] Nâng TTS lên cloud (Azure/Google/OpenAI) + cache audio; export sang Anki.

## 2. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Văn bản dài vượt context AI | Chunk theo đoạn/người nói rồi ghép kết quả |
| AI sinh nghĩa sai ngữ cảnh | Truyền câu gốc vào prompt; cho người dùng sửa nghĩa khi lưu thẻ |
| Furigana AI sai (không deterministic) | Ngữ cảnh cả đoạn giúp đúng; cho sửa tay; có thể thêm Kuromoji làm bộ kiểm tra sau |
| Quên lọc `user_id` → lộ dữ liệu | Lọc tập trung ở tầng repository; viết test kiểm tra |
| Connection pool (server tự host) | Dùng pool của postgres.js (`max` hợp lý), cổng 5432 |
| Di chuyển server PostgreSQL | Đổi `DATABASE_URL`; chạy lại migration; `pg_dump` chuyển dữ liệu |
| Setting hệ thống thay đổi runtime | Lưu `app_settings` trong DB, sửa qua Admin; `lib/config` cache + invalidate |
| Chi phí AI Ingest mỗi import | Chỉ chạy 1 lần/tài liệu, lưu DB; không gọi lại khi học/ôn |
| AI trả JSON sai định dạng | Structured output (JSON schema) + validate + retry |
| AI "tự chế" khi sửa lỗi STT | Prompt yêu cầu sửa dè dặt, giữ `original`, đánh `confidence=low` thay vì đoán; người duyệt |
| Độ trễ lần tra đầu (gọi API) | Cache → lần sau tức thì; có thể prefetch nghĩa các từ gợi ý |
| Lạm dụng animation → chậm máy | Animation ngắn, đúng chỗ; tôn trọng `prefers-reduced-motion` |

## 3. Phụ thuộc & việc chờ

| Việc chờ | Ảnh hưởng |
|----------|-----------|
| `OPENAI_API_KEY` | Cần cho Sprint 2 (AI Ingest) |
| **Prompt + JSON schema cho AI Ingest** | Cốt lõi Sprint 2 — do bạn chuẩn bị/duyệt |
| Google OAuth Client ID/Secret | Cần cho Sprint 5 (đăng nhập Google) |
| Quyết định timezone cho streak | Sprint 4 (gamification) |

> ✅ **Đã gỡ vướng:** không còn chờ từ điển ngoài — AI Ingest lo hết.
> Có thể bắt đầu scaffold ngay.

## 4. Định nghĩa "Hoàn thành MVP" (Definition of Done)
- Đăng nhập Email + Google chạy ổn.
- Dán text → tách từ + nghĩa hiển thị < 3s.
- Tạo & ôn flashcard trọn vòng SRS, không lỗi.
- Streak/XP/confetti hoạt động.
- Deploy chạy thật trên server riêng (Node + PostgreSQL tự host).
- Mọi truy vấn dữ liệu đi qua repository (không gọi DB rải rác).
