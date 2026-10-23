#!/bin/sh
# make push-test: ship HEAD to the VPS, build there, restart, smoke. Never run from CI.
# Env: DEPLOY_HOST (user@host, required), DEPLOY_DIR (default /srv/torobgard),
#      SMOKE_URL (default https://$SERVER_NAME read from the server's .env.prod).
# The server keeps its own .env.prod in DEPLOY_DIR; docker pulls through the registry mirror
# configured in its /etc/docker/daemon.json (docs/DEPLOY.md).
set -eu
host="${DEPLOY_HOST:?set DEPLOY_HOST=user@vps}"
dir="${DEPLOY_DIR:-/srv/torobgard}"
sha="$(git rev-parse --short HEAD)"
[ -z "$(git status --porcelain)" ] || echo "warning: uncommitted changes are not shipped (git archive HEAD)"

git archive --format=tar HEAD | ssh "$host" "mkdir -p '$dir' && tar -x -C '$dir'"
# The api container runs `migrate` and `collectstatic` on start.
ssh "$host" "cd '$dir' && BUILD_ID=$sha docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --remove-orphans"
url="${SMOKE_URL:-https://$(ssh "$host" "sed -n 's/^SERVER_NAME=//p' '$dir/.env.prod'")}"
sleep 5
deploy/smoke.sh "$url"
echo "deployed $sha to $host"
