#!/usr/bin/env bash
# Seed a Liara Postgres (PostGIS + pgvector) from this Mac's dev database (docs/DEPLOY.md, "Liara").
# The dataset is not in git and re-embedding costs money, so the demo data is the local DB.
# The target DATABASE_URL (its public address) is read at a hidden prompt and passed as PG* environment
# variables: never on a command line, never in a file.
set -euo pipefail
DEV=${DEV_DB_CONTAINER:-torob-gard-db-1}

read -rsp "Liara DATABASE_URL (public address, hidden): " url; echo
[ -n "$url" ] || { echo "no URL" >&2; exit 1; }
eval "$(URL="$url" python3 - <<'PY'
import os, shlex
from urllib.parse import urlparse, unquote
u = urlparse(os.environ["URL"])
for k, v in {"PGHOST": u.hostname, "PGPORT": u.port or 5432, "PGUSER": unquote(u.username or ""),
             "PGPASSWORD": unquote(u.password or ""), "PGDATABASE": u.path.lstrip("/")}.items():
    print(f"export {k}={shlex.quote(str(v))}")
PY
)"
unset url
read -rp "Restore into $PGDATABASE on $PGHOST? Existing tables of the same name are replaced. [y/N] " ok
[ "$ok" = y ] || exit 1

# The dev container's own pg tools (Postgres 16): -e NAME passes the variable through from this shell.
run() { docker exec -i -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE "$DEV" "$@"; }
run psql -v ON_ERROR_STOP=1 -qc "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS vector;"
docker exec "$DEV" pg_dump -Fc -U torobgard torobgard \
  | run pg_restore --no-owner --no-privileges --clean --if-exists -d "$PGDATABASE" || echo "pg_restore reported warnings (extension objects owned by Liara are expected)"
# A dump made before 2026-10-23 tags embeddings with the old model id (docs/DEPLOY.md)
run psql -v ON_ERROR_STOP=1 -qc "UPDATE catalog_productembedding SET model = 'text-embedding-3-small'; UPDATE catalog_shopembedding SET model = 'text-embedding-3-small';"
run psql -qtc "SELECT 'products: ' || count(*) FROM catalog_product UNION ALL SELECT 'offers: ' || count(*) FROM catalog_offer;"
