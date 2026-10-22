# ponytail: api (Task 2) and web (Task 9) don't exist yet; dev and check skip them while their dirs are missing.
.PHONY: dev down check test-api ingest psql hooks

.env:
	cp .env.example .env

hooks:
	git config core.hooksPath .githooks

dev: .env hooks
	docker compose up -d --build db redis $$(test -d api && echo api)
	@if [ -d web ]; then pnpm -C web dev; fi

down:
	docker compose down

check: .env
	@if [ -d api ]; then docker compose run --rm api sh -c "ruff check . && pytest"; fi
	@if [ -d web ]; then pnpm -C web typecheck && pnpm -C web test && pnpm -C web lint; fi

test-api: .env
	docker compose run --rm api pytest $(ARGS)

ingest: .env
	docker compose run --rm api python manage.py load_csv --dir /data
	docker compose run --rm api python manage.py parse_addresses
	docker compose run --rm api python manage.py build_venues
	docker compose run --rm api python manage.py price_stats

psql: .env
	docker compose exec db psql -U torobgard torobgard
