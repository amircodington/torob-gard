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

// The gate is p95 first token < 2.5 s at 50 VUs and errors < 1 %.
const agentOnly = AGENT ? { agent_ttfb_ms: ["p(95)<2500"] } : {};
export const options = {
  insecureSkipTLSVerify: true, // ponytail: also true against the VPS; the cert is not what is measured
  stages: __ENV.SMOKE === "1"
    ? [{ duration: "30s", target: 2 }]
    : [10, 25, 50].map((target) => ({ duration: "5m", target })), // ponytail: no ramp-down, each stage is a step
  thresholds: { errors: ["rate<0.01"], ...agentOnly },
};

const errors = new Rate("errors");
const ttfb = new Trend("agent_ttfb_ms", true); // ponytail: k6 sees the stream only when it ends, so this is time to the first
// byte = the instant `status` event, a lower bound on the first grounded token (docs/evidence/P3/load.md)
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
