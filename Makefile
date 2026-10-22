# ponytail: `api` (Task 2) and `web` (Task 9) don't exist yet; dev/check guard on their dirs where needed.
.PHONY: dev down check test-api ingest psql

dev:
	docker compose up -d --build
	pnpm -C web dev

down:
	docker compose down

check:
	@if [ -d api ]; then docker compose run --rm api sh -c "ruff check . && pytest"; fi
	@if [ -d web ]; then pnpm -C web tsc --noEmit && pnpm -C web vitest run && pnpm -C web lint; fi

test-api:
	docker compose run --rm api pytest $(ARGS)

ingest:
	docker compose run --rm api python manage.py load_csv --dir /data
	docker compose run --rm api python manage.py parse_addresses
	docker compose run --rm api python manage.py build_venues
	docker compose run --rm api python manage.py price_stats

psql:
	docker compose exec db psql -U torobgard torobgard
