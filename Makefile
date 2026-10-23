# ponytail: api runs only in Docker (host has no GDAL); web runs on the host with pnpm. No CI yet, pre-push runs check.
.PHONY: dev down check e2e eval test-api test-agent agent-testdb ingest psql hooks push-test load

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
	$(MAKE) agent-testdb
	docker compose run --rm agent sh -c "ruff check . && pytest"
	pnpm -C web typecheck && pnpm -C web test && pnpm -C web lint

# Not part of check: needs the dev server on :3100 and the compose API.
e2e: web/node_modules
	pnpm -C web e2e

# Real BoxAPI calls against the dev DB: costs money, runs every case once. Exit 1 while the gate is open.
eval: .env
	docker compose run --rm api python manage.py migrate -v0
	docker compose run --rm -e GIT_SHA=$$(git rev-parse --short HEAD) agent python -m torobgard_agent.evals

test-api: .env
	docker compose run --rm api pytest $(ARGS)

test-agent: agent-testdb
	docker compose run --rm agent pytest $(ARGS)

# Ruling R5: agent DB tests run against Django's schema + the P0 mini fixtures.
AGENT_TEST_DB := postgresql://torobgard:torobgard@db:5432/torobgard_agent_test
agent-testdb: .env
	docker compose up -d --wait db
	docker compose exec -T db sh -c "dropdb -U torobgard --if-exists torobgard_agent_test && createdb -U torobgard torobgard_agent_test"
	docker compose run --rm -e DATABASE_URL=$(AGENT_TEST_DB) api sh -c "python manage.py migrate -v0 \
		&& python manage.py load_csv --dir tests/fixtures/mini && python manage.py parse_addresses \
		&& python manage.py build_venues && python manage.py price_stats"

ingest: .env
	docker compose run --rm api python manage.py migrate
	docker compose run --rm api python manage.py load_csv --dir /data
	docker compose run --rm api python manage.py parse_addresses
	docker compose run --rm api python manage.py build_venues
	docker compose run --rm api python manage.py price_stats

psql: .env
	docker compose exec db psql -U torobgard torobgard

# Ship HEAD to the VPS and smoke it (docs/DEPLOY.md). DEPLOY_HOST=user@vps make push-test
push-test:
	deploy/push-test.sh

# k6 load/cost script (docs/evidence/P3/load.md). BASE_URL=https://host AGENT_TURNS=1 make load; SMOKE=1 for 30 s. Agent turns cost money.
load:
	docker run --rm -v $(CURDIR)/deploy/k6:/k6:ro -e BASE_URL -e AGENT_TURNS -e SMOKE grafana/k6 run /k6/journey.js
