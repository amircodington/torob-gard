# ponytail: api runs only in Docker (host has no GDAL); web runs on the host with pnpm. No CI yet, pre-push runs check.
.PHONY: dev down check e2e test-api ingest psql hooks

.env:
	cp .env.example .env

hooks:
	git config core.hooksPath .githooks

web/node_modules: web/pnpm-lock.yaml
	pnpm -C web install --frozen-lockfile
	touch $@

dev: .env hooks web/node_modules
	docker compose up -d --build db redis api
	NEXT_TELEMETRY_DISABLED=1 pnpm -C web dev

down:
	docker compose down

check: .env web/node_modules
	docker compose run --rm api sh -c "ruff check . && pytest"
	pnpm -C web typecheck && pnpm -C web test && pnpm -C web lint

# Not part of check: needs the dev server on :3100 and the compose API.
e2e: web/node_modules
	pnpm -C web e2e

test-api: .env
	docker compose run --rm api pytest $(ARGS)

ingest: .env
	docker compose run --rm api python manage.py migrate
	docker compose run --rm api python manage.py load_csv --dir /data
	docker compose run --rm api python manage.py parse_addresses
	docker compose run --rm api python manage.py build_venues
	docker compose run --rm api python manage.py price_stats

psql: .env
	docker compose exec db psql -U torobgard torobgard
