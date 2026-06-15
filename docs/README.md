# Bloóm — Tài liệu dự án

> Học tiếng Nhật từ chính nội dung công việc thật của bạn — đoạn chat, transcript
> cuộc họp, video YouTube — theo phương pháp immersion + sentence mining (kiểu
> Refold), tích hợp SRS và trải nghiệm gamified kiểu Duolingo.

## Mục lục

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 01 | [Tổng quan sản phẩm](01-product-overview.md) | Tầm nhìn, đối tượng, giá trị cốt lõi, phạm vi |
| 02 | [Kiến trúc kỹ thuật](02-architecture.md) | Tech stack, tầng repository, chống lock-in, luồng dữ liệu |
| 03 | [Mô hình dữ liệu](03-data-model.md) | Sơ đồ quan hệ, chi tiết bảng, phân quyền |
| 04 | [Tài liệu chức năng](04-features.md) | Các tính năng, luồng người dùng, gamification |
| 05 | [Hệ thống thiết kế](05-design-system.md) | Phong cách Duolingo, màu, font, component, animation |
| 06 | [Lộ trình & rủi ro](06-roadmap.md) | Sprint, mốc, rủi ro & giảm thiểu |
| 07 | [Hành trình sử dụng](07-user-journey.md) | App vận hành thế nào — ví dụ cụ thể + wireframe |
| 08 | [Chọn từ thông minh](08-smart-word-selection.md) | Thuật toán gợi ý "từ đáng học", i+1, cold start |
| 09 | [Các loại flashcard](09-flashcard-types.md) | Note vs card, 3 loại thẻ, vị trí câu họp trên thẻ |
| 10 | [Chất lượng transcript](10-transcript-quality.md) | Xử lý text STT sai, độ tin cậy, sửa câu |
| 11 | [AI Ingest](11-ai-ingest.md) | Lõi xử lý: prompt + JSON schema + chunking (gpt-4o) |
| 12 | [Quy trình GSD](12-gsd-workflow.md) | Khung Get Shit Done: cài đặt → thêm chức năng mới với Claude Code |

## Tóm tắt quyết định kỹ thuật

| Hạng mục | Lựa chọn |
|----------|----------|
| Nền tảng | Web app (Next.js 15, App Router, TypeScript) |
| UI | Tailwind CSS + shadcn/ui (custom theme Duolingo) |
| Animation | Motion (framer-motion) + Lottie + canvas-confetti + Howler.js |
| Font | Nunito |
| Database | **PostgreSQL tự host** (không dùng Supabase) |
| Cấu hình app | Bảng `app_settings` trong DB (đọc qua `lib/config`); chỉ secret ở env |
| Query layer | Drizzle ORM + postgres.js (kết nối trực tiếp `DATABASE_URL`) |
| Auth | Auth.js (NextAuth) + Drizzle adapter — Email + Google OAuth |
| Xử lý nội dung (1 lượt) | **AI Ingest (OpenAI gpt-4o)** — dọn lỗi STT + tách câu + tách từ + furigana + loại từ + nghĩa Việt |
| Tách từ / từ điển riêng | ❌ Không dùng (AI lo hết trong lượt Ingest) |
| Phát âm (TTS) | Web Speech API (MVP) → cloud + cache (sau), bọc `lib/tts` |
| SRS | ts-fsrs |
| Chống lock-in | Tầng Repository + `lib/ai` interface; phân quyền `user_id` ở tầng app |
| Transcribe (GĐ2) | OpenAI Whisper API |

## Trạng thái

- **Giai đoạn:** Khởi tạo (chưa có code).
- **Không còn vướng mắc chặn**: đã bỏ từ điển ngoài → dùng AI sinh nghĩa + cache.
  Có thể bắt đầu scaffold bất cứ lúc nào.
