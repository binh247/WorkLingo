#!/usr/bin/env bash
# Sao lưu PostgreSQL (pg_dump nén), giữ N ngày. Thêm vào cron hằng ngày.
# Ví dụ cron:  0 3 * * *  /path/WorkLingo/deploy/backup-db.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
CONTAINER="${PG_CONTAINER:-worklingo-postgres}"
DB="${POSTGRES_DB:-worklingo}"
USER="${POSTGRES_USER:-worklingo}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/worklingo_${STAMP}.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$USER" "$DB" | gzip > "$OUT"
echo "Backup → $OUT"

# Xoá backup cũ hơn KEEP_DAYS ngày
find "$BACKUP_DIR" -name 'worklingo_*.sql.gz' -mtime +"$KEEP_DAYS" -delete
