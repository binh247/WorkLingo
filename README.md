# WorkLingo

Học tiếng Nhật từ chính nội dung công việc thật của bạn (chat, transcript họp,
video) theo phương pháp immersion + sentence mining + SRS, trải nghiệm gamified.

> Tài liệu sản phẩm: [`docs/`](docs/) · Tầm nhìn/điểm vào: [PROJECT.md](PROJECT.md)
> · Lộ trình GSD: [ROADMAP.md](ROADMAP.md) · Kế hoạch từng phase: [`.planning/`](.planning/)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 + shadcn/ui ·
Drizzle ORM + postgres.js · **PostgreSQL tự host** · Auth.js v5 · OpenAI (AI Ingest) ·
ts-fsrs (SRS) · Motion. Cấu hình hệ thống lưu trong bảng `app_settings` (đọc qua `lib/config`).

## Setup (chạy lần đầu)

```bash
# 1. Khởi động PostgreSQL tự host (Docker)
docker compose up -d            # Postgres 18, cổng theo POSTGRES_PORT trong .env

# 2. Cài dependency
npm install

# 3. Tạo schema + dữ liệu cấu hình
npm run db:migrate              # tạo 13 bảng
npm run db:seed                 # seed 7 key app_settings (idempotent)

# 4. Chạy dev
npm run dev                     # http://localhost:3000
```

Cấu hình môi trường: copy `.env.example` → `.env` rồi điền `DATABASE_URL`,
`AUTH_SECRET`, (tuỳ phase) `OPENAI_API_KEY`, `AUTH_GOOGLE_ID/SECRET`.

## Scripts

| Lệnh | Việc |
|------|------|
| `npm run dev` | Chạy dev server |
| `npm run build` / `npm run start` | Build & chạy production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | typecheck + build |
| `npm run db:generate` | Sinh migration từ schema |
| `npm run db:migrate` | Apply migration lên DB |
| `npm run db:seed` | Seed `app_settings` (idempotent) |
| `npm run db:studio` | Drizzle Studio |

## Cấu trúc

```
app/            # App Router pages + api routes
components/     # Button3D, ProgressBar, Card + ui/ (shadcn)
lib/db/         # Drizzle schema + kết nối + seed
lib/repositories/  # tầng trung gian (luôn lọc user_id)
lib/config.ts   # đọc app_settings (cache + fallback)
lib/ai/ lib/tts/ lib/srs.ts lib/auth.ts
drizzle/        # migration sinh bởi drizzle-kit
```
