#!/usr/bin/env bash
# Tái sinh deploy/schema.sql từ database đang chạy (container worklingo-postgres).
# Chạy: npm run db:schema-sql  (hoặc bash deploy/gen-schema-sql.sh)
set -euo pipefail

cd "$(dirname "$0")/.."
CONTAINER="${POSTGRES_CONTAINER:-worklingo-postgres}"
DB_USER="${POSTGRES_USER:-worklingo}"
DB_NAME="${POSTGRES_DB:-worklingo}"
OUT="deploy/schema.sql"

dump() { docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" "$@"; }

{
  cat << 'HDR'
-- =====================================================================
-- WorkLingo — schema.sql (cấu trúc database đầy đủ)
-- Sinh từ: pg_dump --schema-only + sổ migration Drizzle
--
-- CÁCH DÙNG (môi trường mới, database RỖNG):
--   1) docker compose up -d        (hoặc Postgres có sẵn)
--   2) Tạo DB rỗng nếu chưa có:
--        createdb -U worklingo worklingo
--   3) Nạp schema:
--        psql -U worklingo -d worklingo -f deploy/schema.sql
--      (qua docker: docker exec -i worklingo-postgres \
--         psql -U worklingo -d worklingo < deploy/schema.sql)
--   4) Seed cấu hình mặc định + user dev:
--        npm run db:seed && npx tsx lib/db/seed-user.ts
--
-- Ghi chú:
--   - File đã kèm dữ liệu drizzle.__drizzle_migrations → về sau thêm
--     migration mới chỉ cần `npm run db:migrate` (không chạy lại từ đầu).
--   - KHÔNG chạy file này lên database đã có bảng (sẽ báo lỗi trùng).
--   - File này là ảnh chụp; nguồn sự thật của schema vẫn là
--     lib/db/schema.ts + thư mục drizzle/. Tái sinh file:
--        npm run db:schema-sql
-- =====================================================================

HDR
  dump --schema-only --no-owner --no-privileges
  echo ''
  echo '-- ====================================================================='
  echo '-- Sổ migration Drizzle (đánh dấu các migration đã áp dụng)'
  echo '-- ====================================================================='
  dump --data-only --inserts --table='drizzle.__drizzle_migrations'
} | grep -Ev '^\\(un)?restrict' > "$OUT"
# \restrict/\unrestrict là meta-command chỉ psql mới hiểu — bỏ đi để file
# chạy được với cả psql cũ lẫn client GUI (DBeaver, TablePlus…).

echo "Đã ghi $OUT ($(grep -c 'CREATE TABLE' "$OUT") bảng, $(wc -l < "$OUT") dòng)"
