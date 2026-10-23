#!/bin/sh
# Nightly backup: pg_dump (custom format) -> object storage, newest $BACKUP_KEEP kept.
# Runs in the `backup` service (docker-compose.prod.yml). Env:
#   PGHOST PGUSER PGPASSWORD PGDATABASE      the database
#   RCLONE_CONFIG_STORE_*                    the `store:` remote; compose maps it from S3_* (any
#                                            S3-compatible store, e.g. ArvanCloud, Liara)
#   S3_BUCKET                                bucket (optionally bucket/prefix)
#   BACKUP_REMOTE                            override the target (a local dir in tests)
#   BACKUP_KEEP                              default 14
set -eu
remote="${BACKUP_REMOTE:-store:${S3_BUCKET:?set S3_BUCKET or BACKUP_REMOTE}}"
keep="${BACKUP_KEEP:-14}"
name="torobgard-$(date -u +%Y%m%d-%H%M%S).dump"
tmp="/tmp/$name"
trap 'rm -f "$tmp"' EXIT

pg_dump -Fc -f "$tmp"
rclone copyto "$tmp" "$remote/$name"
# Names sort by time; delete all but the newest $keep.
rclone lsf "$remote" --include 'torobgard-*.dump' | sort | head -n "-$keep" | while read -r old; do
  rclone deletefile "$remote/$old"
done
echo "backup: $name ($(rclone lsf "$remote" --include 'torobgard-*.dump' | wc -l) kept)"
