# Deploy

One VPS, one compose file. `docker-compose.prod.yml` runs `db` (PostGIS 16 + pgvector), `redis`,
`api` (gunicorn), `agent` (uvicorn), `web` (Next standalone), `nginx` (TLS, the only published
ports), `cron` (nightly jobs) and `backup` (nightly `pg_dump` → object storage).

## 1. Plain compose (any tool, e.g. Deployar)

```sh
cp .env.prod.example .env.prod      # fill it in: §2
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
deploy/smoke.sh https://<SERVER_NAME> # exits non-zero if /api/health or /agent/health fail
```

- The project name is `torobgard-prod`, so it never collides with the dev stack in the same checkout.
- `api` runs `migrate` and `collectstatic` on every start; there is no separate migrate step.
- Set `BUILD_ID` per build (the git sha is a good one): it versions the service worker.
  `BUILD_ID=$(git rev-parse --short HEAD) docker compose ... up -d --build`. Unset, the build time is used.
- `--env-file` feeds compose interpolation (ports, `SERVER_NAME`, `POSTGRES_PASSWORD`, web build args);
  the same file is also every app container's `env_file`. Point `ENV_FILE=` elsewhere if needed.
- Only nginx publishes ports. db and redis are reachable only inside the compose network.

## 2. Environment (`.env.prod`)

Generate secrets with `openssl rand -hex 32` (and `openssl rand -base64 32` for `PHONE_KEY`).
Never commit `.env.prod` (gitignored); `.env.prod.example` has the names only.

| Name | Used by | Required | Notes |
|---|---|---|---|
| `SERVER_NAME` | nginx | yes | the domain, e.g. `torobgard.ir`. Other Host headers get nothing (444 / 421) |
| `SITE_URL` | web | yes | `https://<SERVER_NAME>`: canonical/OG links, sitemap |
| `TLS_CERT`, `TLS_KEY` | nginx | no | paths **inside** the container; default `/etc/letsencrypt/live/<SERVER_NAME>/{fullchain,privkey}.pem` |
| `CERTS_DIR` | nginx | no | host dir mounted at `/etc/letsencrypt` (default `/etc/letsencrypt`) |
| `ACME_DIR` | nginx | no | host webroot for certbot renewals (default `./deploy/certbot`) |
| `HTTP_PORT`, `HTTPS_PORT` | nginx | no | default 80 / 443 |
| `BUILD_ID` | web build | per build | service-worker version (`NEXT_PUBLIC_BUILD_ID`) |
| `NEXT_PUBLIC_IMG_BASE` | web build | yes | `/img`: Torob images through nginx's 7-day cache (R-P7) |
| `POSTGRES_PASSWORD` | db, api, agent, cron, backup | yes | **hex only**, it is pasted into `DATABASE_URL` |
| `DJANGO_SECRET_KEY` | api **and** agent | yes | the agent verifies the signed `tg_uid` cookie with it; api refuses the dev default |
| `ALLOWED_HOSTS` | api | yes | `<SERVER_NAME>,api` (web SSR calls `http://api:8000`) |
| `PHONE_PEPPER` | api | yes | hex; HMAC of phone numbers. api refuses to start without it |
| `PHONE_KEY` | api | yes | base64 of 32 bytes (AES-GCM of phones). api refuses to start without it |
| `KAVENEGAR_KEY`, `KAVENEGAR_TEMPLATE` | api | for login | without them no OTP SMS can be sent in prod (the dev sender works only with DEBUG), so phone login fails; guest use is unaffected |
| `BOXAPI_KEY` | agent, api (`embed`) | yes | |
| `BOXAPI_KEY_SECOND` | agent | no | used once the first key is out of credit |
| `BOXAPI_BASE_URL` | agent | yes | `https://api.gapgpt.app/v1` (GapGPT, decision 14; `https://api.gapapi.com/v1` if that host is unreachable). Models: `AGENT_MODEL` / `FAST_MODEL` `gpt-6-luna`, `EMBED_MODEL` `text-embedding-3-small`. A dump made before 2026-10-23 tags embeddings `openai/text-embedding-3-small`: run `UPDATE catalog_productembedding SET model = 'text-embedding-3-small';` (and `catalog_shopembedding`) after restoring |
| `AGENT_MODEL`, `FAST_MODEL` | agent | yes | as in `.env.example` |
| `EMBED_MODEL`, `EMBED_DIMS` | agent, api | yes | must match the stored embeddings (`text-embedding-3-small`, 1024) |
| `BOXAPI_TOOLS` | agent | yes | `1` |
| `API_WORKERS`, `AGENT_WORKERS` | api, agent | no | default 3 / 2 |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` | backup | yes | any S3-compatible store (e.g. ArvanCloud or Liara object storage); `S3_BUCKET` may be `bucket/prefix` |
| `BACKUP_KEEP` | backup | no | default 14 |
| `DEPLOY_HOST`, `DEPLOY_DIR` | `make push-test` | for push-test | `user@vps`, default `/srv/torobgard` |

Set in the compose file, not the env file: `DEBUG=0`, `DATABASE_URL`, `REDIS_URL` for the apps;
`API_URL=http://api:8000`, `AGENT_URL=http://agent:8001` for the web server side.

## 3. First-time server setup

1. Docker + compose plugin. In Iran, pull through a registry mirror: `/etc/docker/daemon.json`
   `{"registry-mirrors": ["https://<mirror>"]}` (e.g. ArvanCloud's or another Iranian mirror), then
   `systemctl restart docker`. npm and PyPI are fetched during builds; set mirrors there too if blocked.
2. **x86 VPS:** `deploy/db/Dockerfile` and `deploy/backup/Dockerfile` use `imresamu/postgis:16-3.5`
   (multi-arch, needed on the arm64 Mac). On amd64 the official `postgis/postgis:16-3.5` works as the
   base as well; keep both files on the same base so `pg_dump` matches the server. pgvector must be
   ≥ 0.8 (`hnsw.iterative_scan`); the PGDG `postgresql-16-pgvector` package is.
3. TLS. nginx needs the certificate before it starts. With Let's Encrypt:
   `certbot certonly --standalone -d <SERVER_NAME>` (port 80 free, before the first `up`).
   Renewals go through the running nginx:
   `certbot renew --webroot -w <DEPLOY_DIR>/deploy/certbot --deploy-hook "docker compose -f <DEPLOY_DIR>/docker-compose.prod.yml --env-file <DEPLOY_DIR>/.env.prod exec nginx nginx -s reload"`
   in root's crontab. Your own certificate: put it under `CERTS_DIR` and set `TLS_CERT`/`TLS_KEY`.
4. `.env.prod` (§2), then `docker compose ... up -d --build` (§1) and `deploy/smoke.sh`.
5. Data. The CSV dataset is not in git, and re-embedding costs GapGPT money, so seed from a dump of a
   loaded DB (the Mac's dev DB): `make` stack running, then on the Mac
   `docker compose exec -T db pg_dump -U torobgard -Fc torobgard > seed.dump`, copy it over, and
   restore it as in §5 into `torobgard` (stop `api agent web cron` first; drop and recreate the DB, then
   `pg_restore --no-owner -d torobgard`). The next `api` start runs any newer migrations.
6. An admin user: `docker compose -f docker-compose.prod.yml --env-file .env.prod exec api python manage.py createsuperuser`.

## 4. What nginx does (`deploy/nginx/torobgard.conf`)

- `/api/`, `/admin/` → api; `/static/` from the collectstatic volume; `/` → web.
- `/agent/` → agent with `proxy_buffering off`, no gzip, 300 s read timeout (SSE).
- `/img/` → `https://image.torob.com/`, cached 7 days on disk (2 GB cap) whatever upstream says.
- `X-Forwarded-For` is **overwritten** with the client address: the agent and OTP rate limits key
  on its first hop, so a client-sent header must never pass.
- HTTP → HTTPS (except `/.well-known/acme-challenge/`), HSTS, nosniff, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, gzip. No CSP yet (Next inlines scripts; needs nonces).

## 5. Nightly jobs, backups, restore

Times are Tehran (the containers run UTC):

| When | Service | What |
|---|---|---|
| 02:30 | `backup` | `deploy/backup.sh`: `pg_dump -Fc` → `S3_BUCKET/torobgard-YYYYMMDD-HHMMSS.dump`, newest 14 kept |
| 03:00 | `cron` | `anonymise_sessions` (90-day rule), then `price_stats` |

Run either by hand: `docker compose -f docker-compose.prod.yml --env-file .env.prod exec backup backup.sh`
(or `exec cron python manage.py price_stats`). Check the last runs with `logs backup cron`.
A full dump is about 1.1 GB (mostly embeddings).

**Restore** (into a scratch DB first; the same steps restore production):

```sh
C="docker compose -f docker-compose.prod.yml --env-file .env.prod"
$C exec backup sh -c 'rclone lsf "store:$S3_BUCKET" | sort | tail -3'        # pick a dump
$C exec backup sh -c 'rclone copyto "store:$S3_BUCKET/<dump>" /tmp/r.dump \
  && createdb restore_check && pg_restore --no-owner -j 4 -d restore_check /tmp/r.dump \
  && psql -d restore_check -tAc "select count(*) from catalog_shop"'              # 6476
$C exec backup sh -c 'dropdb restore_check && rm /tmp/r.dump'
```

To restore production itself: `$C stop api agent web cron`, then in the `backup` container
`dropdb torobgard && createdb torobgard && pg_restore --no-owner -j 4 -d torobgard /tmp/r.dump`,
then `$C up -d` and `deploy/smoke.sh`. A restore of the full dump takes about 5 minutes.

## 6. `make push-test`

`DEPLOY_HOST=user@vps make push-test` (`deploy/push-test.sh`): `git archive HEAD` over SSH into a fresh
`DEPLOY_DIR.new` (the old `.env.prod` copied in), swapped in for `DEPLOY_DIR` (previous kept as `DEPLOY_DIR.old`), `up -d --build` there with `BUILD_ID=<sha>` (the server keeps its own `.env.prod`;
images come through its registry mirror), `migrate` runs as `api` starts, then `deploy/smoke.sh`
against `https://<SERVER_NAME>`. Only committed code is shipped. nginx is recreated after the swap so its bind mounts (conf, certbot
webroot) point at the new dir. `DEPLOY_DIR.old` is disposable once the smoke passes.

## 7. Checked locally (2026-10-23)

The prod compose ran on the Mac beside the dev stack (ports 18088/18443, self-signed cert):
smoke passed; a spoofed `X-Forwarded-For: 9.9.9.9` reached the agent as the real peer; `/img/` served
and cached a Torob image with a 7-day expiry; admin static, gzip and the security headers were
present; `backup.sh` kept the newest 2 of 3 with `BACKUP_KEEP=2`; a `backup.sh` dump of the dev DB
restored into a scratch DB with 6,476 shops and pgvector 0.8.7. Sitemaps render on request (ids 0–10
fixed, robots lists the same); `/sitemap/1.xml` served product URLs, and with api stopped a cached
chunk still answered while an uncached one gave 500, never a stub. Not done: a real VPS, real object
storage, certbot.

## 8. Known limits

- The env is not split per container: every app container (and `backup`) gets all of `.env.prod`, so api/agent/cron see the S3 keys and backup sees the Django/phone/BoxAPI secrets.
- A failed backup only logs `backup FAILED` (`logs backup`); nothing alerts on it.
- No Content-Security-Policy yet (see §4).

## Liara (Deployar): three apps, no nginx, no compose

Deployar deploys `main` from GitHub: each folder with a Dockerfile is one app on one private network,
`torob-gard-api`, `torob-gard-agent`, `torob-gard-web`, plus a Liara Postgres (16 with PostGIS and pgvector)
and a Liara Redis. Each app's form is its folder's `.env.example` (`api/`, `agent/`, `web/`).

- Each Dockerfile's `CMD` is the production one: api migrates, collects static and runs gunicorn on `$PORT`
  (8000), agent runs uvicorn on `$PORT` (8001), web runs the Next standalone server on `$PORT` (3000).
- web proxies `/api/*` and `/agent/*` itself (`web/src/app/{api,agent}/[...path]`), reading `API_URL` and
  `AGENT_URL` at run time (default `http://torob-gard-api:8000`, `http://torob-gard-agent:8001`). The agent's
  SSE streams through unbuffered. If Liara gives the apps another internal port, set those two.
- Images load straight from `image.torob.com` (`NEXT_PUBLIC_IMG_BASE` empty); the 7-day nginx cache (R-P7) is
  VPS-only.
- `/admin/` is not under web's domain: open it on `https://torob-gard-api.liara.run/admin/` (WhiteNoise serves
  its static files).
- Client address: Liara's ingress appends to `X-Forwarded-For` and web passes it through, so api and agent take
  the entry one from the right (`TRUSTED_PROXY_HOPS=1`). If every visitor shares one rate-limit bucket on Liara,
  there is one more proxy layer: set `TRUSTED_PROXY_HOPS=2` on api and agent.
- Not run on Liara: the nightly `cron` jobs (`anonymise_sessions`, `price_stats`) and the `backup` container.
  Neither is needed for the demo; Liara backs up its databases itself. Run a job by hand from the api app's
  console: `python manage.py price_stats`.
- Phone login needs `KAVENEGAR_KEY` (no SMS sender outside DEBUG); without it the rest works and «ذخیره‌ی سفر»
  says SMS is unavailable.

Data: give the Liara Postgres a public address, then from this Mac (dev stack up):

```sh
deploy/seed-liara.sh   # asks for the DATABASE_URL at a hidden prompt; dump → restore → embedding-model UPDATE
```

The dump is about 1.1 GB, so the restore takes a while on a home connection.
