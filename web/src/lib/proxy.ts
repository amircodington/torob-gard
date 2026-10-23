/** /api and /agent to the Django api and the agent, with their addresses read at run time (API_URL, AGENT_URL),
 *  so one image runs anywhere: compose (nginx routes these itself), Liara (no nginx), dev. The response streams,
 *  so the agent's SSE arrives event by event; its `Cache-Control: no-transform` keeps compression off. */
const HOP = ["host", "connection", "content-length", "accept-encoding", "transfer-encoding", "keep-alive"];

export async function proxy(req: Request, base: string): Promise<Response> {
  const url = new URL(req.url);
  const headers = new Headers(req.headers);
  HOP.forEach((h) => headers.delete(h));
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  try {
    const res = await fetch(`${base}${url.pathname}${url.search}`, {
      method: req.method,
      headers,
      // read whole, sent with a length: Django (WSGI) does not read a chunked request body. Bodies here are small.
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: req.signal,
    });
    const out = new Headers(res.headers);
    ["content-encoding", "content-length", "transfer-encoding", "connection"].forEach((h) => out.delete(h));
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  } catch {
    return new Response(JSON.stringify({ detail: "upstream unreachable" }), { status: 502, headers: { "content-type": "application/json" } });
  }
}
