// Load and cost check (P3.6): stats -> desk -> offers rows -> 3 agent turns. Usage: docs/evidence/P3/load.md.
//   BASE_URL   default https://localhost:18443 (self-signed TLS is accepted; use the real https URL on the VPS)
//   SMOKE=1    2 VUs for 30 s instead of the 10/25/50 VU x 5 min gate stages
//   AGENT_TURNS=1  also run 3 /agent/chat turns per iteration. They spend BoxAPI money: off by default.
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "https://localhost:18443";
const AGENT = __ENV.AGENT_TURNS === "1";
const JSON_H = { headers: { "Content-Type": "application/json" } };
const TURNS = [
  "یه گوشی با دوربین خوب تا ۲۰ میلیون می‌خوام",
  "کدومشون باتری بهتری داره؟",
  "کجا می‌تونم همین رو ارزون‌تر بخرم؟",
];

// The gate is p95 first token < 2.5 s at 50 VUs and errors < 1 %. Each level is its own flat constant-VU
// scenario run back to back (10, 25, 50 VUs x 5 min), tagged `level`, so the 50-VU p95 reads on its own line.
const LEVELS = __ENV.SMOKE === "1" ? [2] : [10, 25, 50];
const DUR = __ENV.SMOKE === "1" ? 30 : 300;
const scenarios = {}, thresholds = {};
LEVELS.forEach((vus, i) => {
  scenarios[`vus${vus}`] = { executor: "constant-vus", vus, duration: `${DUR}s`, startTime: `${i * DUR}s`,
    tags: { level: String(vus) } };
  thresholds[`errors{level:${vus}}`] = ["rate<0.01"];
  // ponytail: first-event time, NOT first token (see docs/evidence/P3/load.md); a green result here does not pass the gate
  if (AGENT) thresholds[`agent_first_event_ms{level:${vus}}`] = ["p(95)<2500"];
});
export const options = { insecureSkipTLSVerify: true, scenarios, thresholds }; // ponytail: skip-verify also against the VPS; the cert is not what is measured

const errors = new Rate("errors");
// k6 sees the first SSE byte = the instant `status` event, not the first grounded token.
const ttfb = new Trend("agent_first_event_ms", true);
const full = new Trend("agent_full_ms", true);
const turns = new Counter("agent_turns");

function ok(res, name) {
  const good = check(res, { [`${name} 200`]: (r) => r.status === 200 });
  errors.add(!good);
  return good;
}

function turn(text, session_id) {
  const res = http.post(`${BASE}/agent/chat`, JSON.stringify({ session_id, text, context: {} }), {
    ...JSON_H, timeout: "120s", tags: { name: "agent_chat" },
  });
  const done = res.status === 200 && res.body.includes("event: done");
  errors.add(!done); // a 200 stream that ends in `event: error` (or never finishes) is a failed turn
  if (!done) return session_id;
  turns.add(1);
  ttfb.add(res.timings.waiting);
  full.add(res.timings.duration);
  const m = res.body.match(/event: done\ndata: (.*)/);
  return (m && JSON.parse(m[1]).session_id) || session_id;
}

export default function () {
  ok(http.get(`${BASE}/api/stats`, { tags: { name: "stats" } }), "stats");
  const desk = http.post(`${BASE}/api/desk`, JSON.stringify(
    { category: "mobile", budget_min: 0, budget_max: 30000000, priority: "camera" }), { ...JSON_H, tags: { name: "desk" } });
  if (!ok(desk, "desk")) return;
  const pid = desk.json("tiers.0.product_id");
  ok(http.get(`${BASE}/api/products/${pid}/offers?lat=35.6892&lng=51.4056`, { tags: { name: "offers" } }), "offers");
  if (AGENT) {
    let sid;
    for (const t of TURNS) sid = turn(t, sid);
  }
  sleep(1);
}
