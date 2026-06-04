# 02 — Kiến trúc kỹ thuật

## 1. Nguyên tắc chủ đạo: POSTGRESQL TỰ HOST, KHÔNG LOCK-IN

WorkLingo dùng **PostgreSQL tự host** ngay từ đầu — **không dùng Supabase** (cả
DB lẫn Auth). Kiến trúc giữ nguyên tắc chống lock-in để không phụ thuộc nhà cung
cấp nào:

- Truy vấn DB qua **connection string trực tiếp** (Drizzle + postgres.js).
- Auth bằng **Auth.js** (user lưu trong Postgres của ta).
- Mọi truy vấn đi qua **tầng repository** → đổi hạ tầng chỉ sửa một chỗ.

> **Kết quả:** đổi server Postgres = đổi `DATABASE_URL` + chạy lại migration +
> `pg_dump` chuyển dữ liệu. Code UI/logic/auth không đổi.

> **Cấu hình app trong DB:** mọi **setting hệ thống** (model AI, feature flag,
> giá trị mặc định, giới hạn...) lưu trong bảng `app_settings` (xem
> [03-data-model.md](03-data-model.md)), **không** rải rác trong code/env. Chỉ
> các **secret khởi động** bắt buộc (`DATABASE_URL`, `AUTH_SECRET`, OAuth/API
> key) mới ở env. Đọc cấu hình qua `lib/config` (cache + fallback mặc định).

## 2. Tech stack

| Lớp | Công nghệ | Ghi chú |
|-----|-----------|---------|
| Framework | Next.js 15 (App Router) + TypeScript | Full-stack 1 repo |
| UI | React + Tailwind CSS + shadcn/ui | Custom theme Duolingo |
| Animation | Motion (framer-motion) | Bouncy, mượt |
| Animation phong phú | lottie-react | Linh vật, hoạt cảnh |
| Ăn mừng | canvas-confetti | Confetti khi đúng/hoàn thành |
| Âm thanh | Howler.js | Ding/buzz feedback |
| Font | Nunito | Tròn, đậm, thân thiện |
| Icon | lucide-react | Đi kèm shadcn |
| Xử lý nội dung | **AI Ingest** — OpenAI **gpt-4o** qua `lib/ai` | 1 lượt: dọn lỗi STT + tách câu + tách từ + furigana + loại từ + nghĩa Việt |
| Database | **PostgreSQL tự host** | Không dùng Supabase |
| Query layer | Drizzle ORM + postgres.js | Kết nối trực tiếp `DATABASE_URL` |
| Cấu hình app | Bảng `app_settings` trong DB qua `lib/config` | Setting hệ thống ở DB, không ở env (trừ secret) |
| Auth | Auth.js (NextAuth) + Drizzle adapter | Email + Google OAuth |
| Phát âm (TTS) | **Web Speech API** (MVP) qua `lib/tts` | Free, không hạ tầng; GĐ sau nâng cloud + cache |
| SRS | ts-fsrs | Lên lịch ôn tập |
| Transcribe (GĐ2) | OpenAI Whisper API | Audio → text |
| Deploy | Server riêng (Node + PostgreSQL tự host), reverse proxy | |

### Vì sao các lựa chọn này?
- **AI Ingest (gpt-4o) làm TẤT CẢ trong 1 lượt**: nhận text thô → dọn lỗi STT
  (dè dặt, giữ câu gốc) → tách câu → tách từ kèm furigana + loại từ + nghĩa Việt
  + đánh dấu từ "đáng học" / câu "đáng ngờ". Có **ngữ cảnh cả đoạn** nên đọc
  furigana chính xác hơn nhiều so với tra từ lẻ. Bọc sau `lib/ai` → đổi nhà cung
  cấp dễ. **Không dùng Kuromoji / từ điển ngoài.**
- Kết quả Ingest lưu thẳng vào `sentences.tokens` → màn Học/đào thẻ đọc trực tiếp
  (popup nghĩa **tức thì, không gọi API lại**).
- **Drizzle ORM** type-safe, migration rõ ràng, chạy trên mọi Postgres.
- **Auth.js** lưu user/session trong Postgres của ta → không phụ thuộc auth bên ngoài.
- **ts-fsrs** là chuẩn SRS hiện đại, hơn SM-2 cũ của Anki.
- **Next.js Server Actions / API routes** đặt lượt AI Ingest ở server, giấu API key.

## 3. Sơ đồ tầng (layered architecture)

```
┌─────────────────────────────────────────────────────────┐
│  UI: App Router pages + components (shadcn + Motion)      │
│  — KHÔNG bao giờ gọi DB trực tiếp                          │
└───────────────┬───────────────────────────────────────────┘
                │ gọi hàm nghiệp vụ
┌───────────────▼───────────────────────────────────────────┐
│  lib/repositories/  — TẦNG TRUNG GIAN (chống lock-in)      │
│  getCards(), saveCard(), lookupWord(), getStats()...       │
│  — luôn kèm điều kiện user_id (phân quyền)                  │
└───────────────┬───────────────────────────────────────────┘
                │ Drizzle queries
┌───────────────▼───────────────────────────────────────────┐
│  lib/db/  — Drizzle + postgres.js (CHỈ đây biết DB cụ thể) │
└───────────────┬───────────────────────────────────────────┘
                │ DATABASE_URL
┌───────────────▼───────────────────────────────────────────┐
│  PostgreSQL tự host                                        │
└─────────────────────────────────────────────────────────────┘

Phụ trợ (server-side):
  lib/ai/ingest.ts  → AI Ingest: text thô → JSON (câu + token + furigana + nghĩa)
  lib/srs.ts        → ts-fsrs (lịch ôn tập)
  lib/auth.ts       → Auth.js cấu hình + Drizzle adapter
  lib/config.ts     → đọc app_settings (cache + fallback mặc định)

Xử lý nội dung (khi import):
  text thô → [chunk nếu dài] → lib/ai/ingest → JSON dữ liệu cuối
    → repositories.sources/sentences lưu câu + tokens (đã có nghĩa)
```

## 4. Cấu trúc thư mục

```
WorkLingo/
├── app/
│   ├── (auth)/login/             # đăng nhập (Auth.js: email + Google)
│   ├── api/auth/[...nextauth]/   # route handler của Auth.js
│   ├── import/                   # màn dán/import text
│   ├── study/                    # đọc & sentence mining
│   ├── review/                   # ôn tập SRS
│   ├── dashboard/                # tiến độ, streak, XP
│   └── api/
│       └── ingest/route.ts       # nhận text → gọi AI Ingest → trả JSON
├── lib/
│   ├── db/
│   │   ├── index.ts              # khởi tạo Drizzle từ DATABASE_URL
│   │   └── schema.ts             # định nghĩa bảng (Drizzle schema)
│   ├── config.ts                # đọc app_settings (cache + fallback mặc định)
│   ├── repositories/
│   │   ├── cards.ts              # getCards / saveCard ...
│   │   ├── sources.ts            # tạo/đọc source + sentences
│   │   ├── settings.ts           # app_settings (hệ thống) + user_settings
│   │   └── stats.ts              # XP / streak
│   ├── ai/                       # interface AI (OpenAI), đổi provider dễ
│   │   ├── index.ts              # interface chung
│   │   ├── openai.ts             # cài đặt cụ thể OpenAI
│   │   ├── ingest.ts             # AI Ingest: text thô → JSON dữ liệu cuối
│   │   └── prompts.ts            # prompt + schema structured output
│   ├── auth.ts                   # cấu hình Auth.js + Drizzle adapter
│   ├── tts/                      # phát âm: Web Speech (MVP), đổi cloud sau
│   │   └── index.ts              # interface speak(text, {lang})
│   └── srs.ts                    # wrap ts-fsrs
├── components/
│   ├── SentenceView.tsx          # render câu + furigana
│   ├── WordPopup.tsx             # popup nghĩa từ
│   ├── ReviewCard.tsx            # thẻ ôn tập
│   └── ui/                       # shadcn components
├── drizzle/                      # migration do drizzle-kit sinh ra
└── docs/                         # tài liệu này
```

## 5. Luồng dữ liệu chính

### Import & AI Ingest (1 lượt làm hết)
```
User dán text / upload .txt → Server Action / API (/api/ingest)
  → [chunk nếu dài] → lib/ai/ingest (gpt-4o) → JSON dữ liệu cuối:
      sentences[]: { original, text, corrected, note, confidence,
                     tokens[]: { surface, reading, lemma, pos, meaning_vi, worthLearning } }
  → lưu sources + sentences (tokens đã kèm nghĩa)
  → màn Duyệt & sửa → màn Học (render SentenceView từ tokens)
```

### Tra nghĩa (khi click từ) — TỨC THÌ, không gọi API
```
Click từ → đọc thẳng token trong sentences.tokens (đã có reading + meaning_vi)
         → WordPopup hiển thị ngay
```

### Lưu flashcard
```
Click từ → WordPopup (nghĩa có sẵn) → "Lưu thẻ"
  → repositories.sources.upsert(source) (nếu chưa có)
  → repositories.cards.save(card gắn sentence + ngữ cảnh)
```

### Ôn tập SRS
```
repositories.cards.getDue(userId)  (FSRS due <= now)
  → hiện câu, ẩn nghĩa từ đích
  → user chấm Again/Hard/Good/Easy
  → ts-fsrs tính lịch mới → cập nhật fsrs_state + ghi reviews
  → cập nhật user_stats (XP, streak) → confetti khi xong
```

## 6. Phân quyền (authorization)

- KHÔNG dùng RLS/`auth.uid()` của bất kỳ provider nào — phân quyền ở tầng app.
- **Mọi truy vấn trong repository luôn kèm `where user_id = <currentUser>`.**
- `currentUser` lấy từ session Auth.js (server-side).
- Có thể bật RLS như lớp phòng thủ phụ sau này, nhưng không bắt buộc cho MVP.

## 7. Cấu hình: env (chỉ secret) vs DB (`app_settings`)

**Nguyên tắc:** chỉ giữ trong env những **secret khởi động** mà DB không thể tự
cung cấp (chicken-and-egg) hoặc tuyệt đối không được lộ. Mọi cấu hình hệ thống
khác nằm trong bảng `app_settings`, đọc qua `lib/config`.

### Env (`.env`) — chỉ secret bootstrap

| Biến | Mô tả |
|------|-------|
| `DATABASE_URL` | Connection string PostgreSQL tự host (bắt buộc để kết nối DB) |
| `AUTH_SECRET` | Khoá ký session Auth.js |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth (secret) |
| `OPENAI_API_KEY` | OpenAI — sinh nghĩa/giải thích (MVP) + Whisper (GĐ2) |

### `app_settings` (DB) — cấu hình hệ thống (không secret)

Ví dụ key lưu trong DB thay vì env: `openai_model` (mặc định `gpt-4o`),
`whisper_model`, `ingest_chunk_size`, `default_card_types`, `feature_flags`,
`max_import_chars`, `tts_provider`... Sửa được runtime qua trang Admin, không cần
deploy lại. Chi tiết bảng xem [03-data-model.md](03-data-model.md).

## 8. Lưu ý triển khai (server tự host)

- Chạy app (Node) + **PostgreSQL tự host** sau reverse proxy (nginx/Caddy);
  bật TLS, sao lưu DB định kỳ (`pg_dump`).
- Long-running server (không serverless) → dùng **connection pool** của
  postgres.js (`max` hợp lý) kết nối trực tiếp cổng `5432`.
- `lib/config` **cache** `app_settings` trong bộ nhớ (TTL ngắn) để không truy
  vấn DB mỗi request; có cơ chế invalidate khi Admin sửa setting.
- AI Ingest chạy lúc import (không phải lúc ôn) → độ trễ vài giây chấp nhận được;
  văn dài thì **chunk** theo đoạn/người nói để tránh vượt giới hạn context.
