import { describe, expect, it } from "vitest";
import { parseSSE } from "./sse";

async function* chunks(...parts: string[]) {
  for (const p of parts) yield p;
}

describe("parseSSE", () => {
  it("parses events split across chunks, with JSON data", async () => {
    const out = [];
    for await (const e of parseSSE(
      chunks('event: status\ndata: {"text": "دارم', ' می‌گردم…"}\n\nevent: tok', 'en\ndata: {"text": "سلام"}\n\n', "event: done\r\ndata: {}\r\n\r\n"),
    ))
      out.push(e);
    expect(out).toEqual([
      { event: "status", data: { text: "دارم می‌گردم…" } },
      { event: "token", data: { text: "سلام" } },
      { event: "done", data: {} },
    ]);
  });
});
