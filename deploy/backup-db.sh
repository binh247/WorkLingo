#!/usr/bin/env bash
# Sao lưu PostgreSQL (pg_dump nén), giữ N ngày. Thêm vào cron hằng ngày.
# Ví dụ cron:  0 3 * * *  /path/Bloóm/deploy/backup-db.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
CONTAINER="${PG_CONTAINER:-bloom-postgres}"
DB="${POSTGRES_DB:-bloom}"
USER="${POSTGRES_USER:-bloom}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/bloom_${STAMP}.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$USER" "$DB" | gzip > "$OUT"
echo "Backup → $OUT"

# Xoá backup cũ hơn KEEP_DAYS ngày
find "$BACKUP_DIR" -name 'bloom_*.sql.gz' -mtime +"$KEEP_DAYS" -delete
