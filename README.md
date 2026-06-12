# WorkLingo

Học tiếng Nhật từ chính nội dung công việc thật của bạn (chat, transcript họp,
video) theo phương pháp immersion + sentence mining + SRS, trải nghiệm gamified
kiểu Duolingo (tim ❤️, combo ⚡, XP, streak, âm thanh).

> Tài liệu sản phẩm: [`docs/`](docs/) · Tầm nhìn/điểm vào: [PROJECT.md](PROJECT.md)
> · Lộ trình GSD: [ROADMAP.md](ROADMAP.md) · Kế hoạch từng phase: [`.planning/`](.planning/)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 + shadcn/ui ·
Drizzle ORM + postgres.js · **PostgreSQL tự host** · Auth.js v5 · OpenAI (AI Ingest) ·
ts-fsrs (SRS) · Web Audio (hiệu ứng âm thanh tổng hợp, không cần asset).
Cấu hình hệ thống lưu trong bảng `app_settings` (đọc qua `lib/config`).

## Yêu cầu môi trường

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | ≥ 20 | kèm npm |
| Docker + Docker Compose | mới nhất | chạy PostgreSQL tự host |
| PostgreSQL | 18 (qua Docker) | hoặc Postgres ≥ 16 có sẵn, tự trỏ `DATABASE_URL` |

## Cài đặt & khởi động (lần đầu)

```bash
# 0. Lấy mã nguồn + cài dependency
git clone https://github.com/binh247/WorkLingo.git
cd WorkLingo
npm install

# 1. Cấu hình môi trường
cp .env.example .env
# Bắt buộc điền:
#   - POSTGRES_PASSWORD  (và sửa DATABASE_URL khớp user/pass/port)
#   - AUTH_SECRET        (tạo bằng: openssl rand -base64 32)
# Tuỳ chọn: AUTH_GOOGLE_ID/SECRET (Google OAuth).
# OpenAI (API key/endpoint/model) + SMTP cấu hình SAU trong trang
# Quản trị /admin (bảng app_settings), không nằm trong .env.

# 2. Khởi động PostgreSQL (Docker)
docker compose up -d          # container worklingo-postgres, cổng POSTGRES_PORT

# 3. Tạo cấu trúc database — chọn MỘT trong hai cách:
# (A) Nhanh — nạp thẳng file SQL đầy đủ (đã kèm sổ migration Drizzle):
docker exec -i worklingo-postgres psql -U worklingo -d worklingo < deploy/schema.sql
# (B) Chuẩn Drizzle — chạy lần lượt các migration:
npm run db:migrate

# 4. Seed dữ liệu khởi tạo
npm run db:seed               # 7 key cấu hình app_settings (idempotent)
npx tsx lib/db/seed-user.ts   # user dev: dev@worklingo.local / devpass123 (admin)

# 5. Chạy
npm run dev                   # http://localhost:3000
```

Đăng nhập lần đầu: dùng user dev ở bước 4 (email + mật khẩu), hoặc Google OAuth
nếu đã điền key.

## Chuyển môi trường / triển khai

- **Cấu trúc DB**: [`deploy/schema.sql`](deploy/schema.sql) là ảnh chụp đầy đủ
  (13 bảng + enum + index + FK + sổ migration Drizzle) — nạp một phát là xong
  trên database **rỗng**; về sau có migration mới chỉ cần `npm run db:migrate`.
  Tái sinh file sau khi đổi schema: `npm run db:schema-sql`.
- **Production**: `npm run build && npm run start`. Mẫu cấu hình trong
  [`deploy/`](deploy/): `Caddyfile` (reverse proxy), `ecosystem.config.cjs`
  (PM2), `backup-db.sh` (backup Postgres).
- **Media upload** lưu ở `storage/` (gitignore) — nhớ mount/backup thư mục này.

## Scripts

| Lệnh | Việc |
|------|------|
| `npm run dev` | Chạy dev server |
| `npm run build` / `npm run start` | Build & chạy production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | typecheck + build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Sinh migration từ `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migration lên DB |
| `npm run db:seed` | Seed `app_settings` (idempotent) |
| `npm run db:schema-sql` | Tái sinh `deploy/schema.sql` từ DB đang chạy |
| `npm run db:studio` | Drizzle Studio (GUI xem DB) |
| `npx tsx lib/db/seed-user.ts` | Tạo user dev (dev@worklingo.local) |

## Cấu trúc

```
app/               # App Router: dashboard, study, review, library, cards,
                   # stats, settings, admin + api/ (tts, ...)
components/        # AppShell (nav), ReviewQuiz, Hearts, ComboMeter,
                   # NavIcons (SVG tự vẽ), Button3D + ui/ (shadcn)
lib/db/            # Drizzle schema + kết nối + seed
lib/repositories/  # tầng truy cập dữ liệu (LUÔN lọc user_id)
lib/config.ts      # đọc app_settings (cache + fallback)
lib/sound.ts       # âm thanh Web Audio tổng hợp (đúng/sai/hoàn thành)
lib/ai/ lib/tts/ lib/srs.ts lib/auth.ts
drizzle/           # migration sinh bởi drizzle-kit
deploy/            # schema.sql, Caddyfile, PM2, backup script
```

## Sự cố thường gặp

- **Lỗi kết nối DB**: kiểm tra container `docker ps`, `DATABASE_URL` khớp
  `POSTGRES_*` trong `.env`, cổng không bị chiếm.
- **Đăng nhập user dev không được**: cần chạy `npx tsx lib/db/seed-user.ts`
  trước (tạo user dev@worklingo.local / devpass123).
- **AI Ingest lỗi**: kiểm tra `openai_api_key`/`openai_base_url`/`openai_model`
  trong trang Quản trị (bảng `app_settings`).
