/* The agent's SSE stream (ARCHITECTURE §7): POST /agent/chat → status · token · block · done | error. */

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- block shapes live in agent/contract.py

export type AgentEvent =
  | { event: "status" | "token"; data: { text: string } }
  | { event: "block"; data: Raw }
  | { event: "done"; data: Raw }
  | { event: "error"; data: Raw };

export interface ChatBody {
  session_id?: string;
  text: string;
  context: { req: unknown; anchor: unknown; stage: string };
}

/** Text chunks → events. Only `event:` and single-line `data:` fields; the agent sends nothing else. */
export async function* parseSSE(chunks: AsyncIterable<string>): AsyncGenerator<AgentEvent> {
  let buf = "";
  for await (const c of chunks) {
    buf += c.replace(/\r/g, "");
    let end: number;
    while ((end = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, end);
      buf = buf.slice(end + 2);
      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) yield { event, data: JSON.parse(data) } as AgentEvent;
    }
  }
}

async function* text(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield dec.decode(value, { stream: true }); // a Persian letter may straddle two chunks
  }
}

/** Throws on a non-2xx answer or a network failure; aborting `signal` rejects the pending read. */
export async function* streamChat(input: ChatBody, signal: AbortSignal): AsyncGenerator<AgentEvent> {
  const res = await fetch("/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`agent ${res.status}`);
  yield* parseSSE(text(res.body));
}
