# P3.6 Load and cost check

Script: `deploy/k6/journey.js`. One iteration = `GET /api/stats` → `POST /api/desk` (mobile, ≤ 30M, camera) →
`GET /api/products/{id}/offers` for the first tier → with `AGENT_TURNS=1`, three `POST /agent/chat` turns
(one session, `session_id` taken from the `done` event). Three flat constant-VU scenarios back to back, 10 / 25 / 50 VUs × 5 min, tagged `level` (thresholds and the summary are per level). `SMOKE=1`: 2 VUs, 30 s.

## Local smoke (NOT the gate)

Local prod compose (`docker-compose.prod.yml`, ports 18088/18443, self-signed cert, full 6,476-shop dataset
loaded with `load_csv`), `grafana/k6` image, `SMOKE=1`, agent turns **off**, on a Mac:

| | |
|---|---|
| iterations / requests | 27 / 81 (stats, desk, offers) |
| checks | 81 / 81 passed |
| error rate | 0.00 % (threshold < 1 %) |
| http_req_duration | avg 50 ms · med 24 ms · p95 115 ms · max 125 ms |

This only proves the script and the endpoints line up. It says nothing about 50 VUs, the VPS, or the agent:
no agent turn was run, so first-token, full-answer and cost numbers are **not measured**.

## The gate (left to students, T-13)

Not run: it needs the VPS and spends BoxAPI money. From any machine with Docker (not the VPS itself, so the
generator does not compete for its CPU):

```sh
docker run --rm --network host -v $PWD/deploy/k6:/k6:ro -e BASE_URL=https://<SERVER_NAME> -e AGENT_TURNS=1 \
  grafana/k6 run /k6/journey.js            # or: BASE_URL=... AGENT_TURNS=1 make load
```

Pass: `errors` < 1 % and `agent_first_event_ms` p(95) < 2500 at `level:50`, cost < $0.02 per conversation.
**A green k6 threshold does NOT satisfy the first-token gate** (see below); it only bounds the first event.
Read `agent_full_ms` (p95 full answer) and `agent_turns` from the same summary.

Caveats the students must handle:

- **First token.** k6 sees an SSE response only when it ends; `agent_first_event_ms` is time to the first byte, the
  instant `status` event, long before any grounded `token`. It cannot pass or fail the first-token gate. The real
  first-token number needs server-side timing (time from request to the first `token` event), left to T-13.
- **Rate limit.** `/agent/chat` allows 30 turns / 10 min per client IP and nginx overwrites `X-Forwarded-For`,
  so one k6 host will get 429s (counted as errors) after ~10 conversations. Either run from several IPs, or
  raise `TURNS` in `agent/torobgard_agent/api.py` for the test and put it back. Ask Mohammad before shipping that.
- **Cost.** The `done` event does not carry cost; it is stored per assistant message. After the run:
  ```sql
  -- docker compose -f docker-compose.prod.yml --env-file .env.prod exec db psql -U torobgard torobgard
  SELECT round(avg(c), 5) AS usd_per_conversation, max(c) FROM (
    SELECT session_id, sum(cost) AS c FROM conversation_message
    WHERE role = 'assistant' AND created_at > now() - interval '30 minutes' GROUP BY session_id) s;
  ```
  Set the interval to cover only the load run, and note that real shoppers' sessions in the window count too.
- The offers/desk part reads only the DB: it stresses api + postgres, not BoxAPI.
