# Bloóm — Tầm nhìn dự án (điểm vào cho GSD)

> **File này là ĐIỂM VÀO cho GSD.** Nó chỉ tóm tắt tầm nhìn và trỏ sang bộ tài
> liệu thật trong [`docs/`](docs/README.md) — **nguồn sự thật duy nhất**. Khi cần
> chi tiết, luôn đọc file `docs/` tương ứng chứ không nhân bản nội dung vào đây.

## Tầm nhìn (ngắn)

**Bloóm** giúp người đi làm học tiếng Nhật từ **chính nội dung công việc thật
của họ** (đoạn chat công ty, transcript cuộc họp, video YouTube) thay vì giáo
trình chung chung. App biến nội dung đó thành bài học: tách câu, tách từ +
furigana, nghĩa tiếng Việt, tạo flashcard **giữ nguyên ngữ cảnh**, rồi ôn tập
theo SRS (FSRS) với trải nghiệm gamified kiểu Duolingo (streak, XP, confetti).

- **Đối tượng:** người đi làm môi trường tiếng Nhật (kỹ sư, BrSE, nhân viên công
  ty Nhật) trình độ sơ–trung cấp.
- **Phương pháp:** Comprehensible Input + Sentence mining (Refold) + i+1 + SRS,
  luôn giữ câu gốc + nguồn cho mỗi thẻ.

## Bảng trỏ sang docs

| # | Tài liệu | Khi nào đọc |
|---|----------|-------------|
| 01 | [Tổng quan sản phẩm](docs/01-product-overview.md) | Tầm nhìn, đối tượng, giá trị cốt lõi, phạm vi giai đoạn |
| 02 | [Kiến trúc kỹ thuật](docs/02-architecture.md) | Tech stack, tầng repository, chống lock-in, luồng dữ liệu, env vs DB |
| 03 | [Mô hình dữ liệu](docs/03-data-model.md) | Sơ đồ quan hệ, chi tiết bảng, `tokens`, index, `app_settings` |
| 04 | [Tài liệu chức năng](docs/04-features.md) | Bản đồ tính năng + luồng F1–F8, gamification, quy tắc nghiệp vụ |
| 05 | [Hệ thống thiết kế](docs/05-design-system.md) | Phong cách Duolingo, màu, font, component, animation |
| 06 | [Lộ trình & rủi ro](docs/06-roadmap.md) | Sprint, mốc, rủi ro & giảm thiểu, Definition of Done |
| 07 | [Hành trình sử dụng](docs/07-user-journey.md) | App vận hành thế nào — ví dụ + wireframe |
| 08 | [Chọn từ thông minh](docs/08-smart-word-selection.md) | Thuật toán "từ đáng học", i+1, cold start |
| 09 | [Các loại flashcard](docs/09-flashcard-types.md) | Note vs card, 4 loại thẻ, vị trí câu trên thẻ |
| 10 | [Chất lượng transcript](docs/10-transcript-quality.md) | Xử lý STT sai, độ tin cậy, sửa câu (Duyệt & sửa) |
| 11 | [AI Ingest](docs/11-ai-ingest.md) | Lõi xử lý: prompt + JSON schema + chunking (gpt-4o) |
| 12 | [Quy trình GSD](docs/12-gsd-workflow.md) | Khung Get Shit Done: cài đặt → thêm chức năng với Claude Code |

> Ánh xạ **GSD Phase ↔ Feature ID ↔ Giai đoạn ↔ Trạng thái** nằm ở
> [`ROADMAP.md`](ROADMAP.md). Kế hoạch task nguyên tử từng phase nằm ở
> [`.planning/`](.planning/).

## Quyết định kiến trúc cố định (đọc kỹ trước khi code)

Các quyết định dưới đây đã chốt cho toàn dự án. **Không** đảo ngược trong từng
phase mà không cập nhật docs trước.

1. **PostgreSQL tự host — KHÔNG dùng Supabase.** Cả DB lẫn Auth đều tự host. Kết
   nối trực tiếp qua `DATABASE_URL` (Drizzle ORM + postgres.js, connection pool,
   cổng 5432). Auth bằng Auth.js (NextAuth) + Drizzle adapter, user lưu trong
   Postgres của ta. Chi tiết: [docs/02-architecture.md §1](docs/02-architecture.md).

2. **Cấu hình hệ thống ở bảng `app_settings`, đọc qua `lib/config`.** Mọi setting
   hệ thống (model AI, feature flags, giá trị mặc định, giới hạn...) lưu trong DB
   ở bảng `app_settings` (key–value + `type` để render form Admin), **không** rải
   rác trong code/env. `lib/config` cache in-memory TTL ~30s + fallback hằng
   `DEFAULTS` (trùng seed) + `invalidate()` cho Admin sửa runtime. **Chỉ secret
   khởi động** (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_*`, `OPENAI_API_KEY`)
   mới nằm ở env. Chi tiết: [docs/02-architecture.md §7](docs/02-architecture.md),
   [docs/03-data-model.md §4](docs/03-data-model.md).

3. **AI Ingest = OpenAI gpt-4o, 1 lượt làm hết.** Nhận text thô → dọn lỗi STT
   (dè dặt, giữ `original`) → tách câu → tách từ kèm furigana + loại từ + nghĩa
   Việt + đánh dấu từ "đáng học"/câu "đáng ngờ" — tất cả **trong 1 lượt**, dùng
   structured output (JSON schema) + validate Zod + retry. Kết quả lưu thẳng vào
   `sentences.tokens` → màn Học/popup đọc trực tiếp, **không gọi AI lại** lúc học/
   ôn. Model `gpt-4o` đọc từ `app_settings.openai_model` qua `lib/config`; API key
   ở env. **KHÔNG dùng Kuromoji / từ điển ngoài.** Chi tiết:
   [docs/11-ai-ingest.md](docs/11-ai-ingest.md), [docs/02-architecture.md §5](docs/02-architecture.md).

4. **Tầng repository chống lock-in.** UI **không bao giờ** gọi DB trực tiếp — mọi
   truy vấn đi qua `lib/repositories/*`. Đổi hạ tầng chỉ sửa một chỗ. Hệ quả phân
   quyền: **mọi truy vấn trong repository luôn kèm `where user_id = <currentUser>`**
   (phân quyền ở tầng app, không dùng RLS/`auth.uid()` của provider).
   `currentUser` lấy từ session Auth.js server-side. Tương tự, AI bọc sau
   `lib/ai`, TTS bọc sau `lib/tts`, SRS bọc sau `lib/srs` để đổi nhà cung cấp dễ.
   Chi tiết: [docs/02-architecture.md §3, §6](docs/02-architecture.md).

## Trạng thái hiện tại

- **Giai đoạn:** Khởi tạo — **chưa có code** (mới có `docs/`, `mockups/`,
  `docker-compose.yml` Postgres 18, `.env`/`.env.example`, kế hoạch `.planning/`).
- Tất cả phase trong [`ROADMAP.md`](ROADMAP.md) đang ở trạng thái ⬜ chưa làm.
