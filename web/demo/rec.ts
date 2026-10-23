import fs from "node:fs";
import path from "node:path";
import type { CDPSession, Locator, Page } from "@playwright/test";

/** The demo recorder: a CDP screencast (sharper than Playwright's video), burned-in Persian subtitles,
 *  a visible cursor, and an SRT + voice-over script on the same clock. */

// Runs in every document; state lives in sessionStorage so it survives page loads.
const OVERLAY = () => {
  const css = `
  #demo-cap{position:fixed;inset-inline:0;bottom:28px;margin:auto;width:max-content;max-width:min(1100px,90vw);z-index:2147483646;
    pointer-events:none;direction:rtl;text-align:center;background:rgba(14,14,14,.86);color:#fff;font-weight:600;font-size:25px;line-height:1.75;
    padding:12px 26px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);transition:opacity .25s}
  #demo-cap:empty{opacity:0}
  #demo-sec{position:fixed;top:16px;left:16px;z-index:2147483646;pointer-events:none;direction:rtl;background:#ee8a2a;color:#141414;
    font-weight:800;font-size:15px;line-height:1;padding:9px 14px;border-radius:999px}
  #demo-sec:empty{display:none}
  #demo-cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:transform .05s linear}
  .demo-ring{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #ee8a2a;z-index:2147483647;
    pointer-events:none;animation:demo-ring .5s ease-out forwards}
  @keyframes demo-ring{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
  #demo-card{position:fixed;inset:0;z-index:2147483645;display:grid;place-content:center;gap:18px;text-align:center;direction:rtl;
    background:#141414;color:#fff;font-family:inherit}
  #demo-card h1{font-size:64px;font-weight:800;margin:0}
  #demo-card p{font-size:28px;margin:0;color:#ffffffb3;max-width:1000px;line-height:1.8}
  #demo-card b{color:#ee8a2a}`;
  const mount = () => {
    if (document.getElementById("demo-cap")) return;
    const s = document.createElement("style");
    s.textContent = css;
    document.head.append(s);
    const el = (id: string, tag = "div") => {
      const e = document.createElement(tag);
      e.id = id;
      document.body.append(e);
      return e;
    };
    const ss = sessionStorage;
    el("demo-cap").textContent = ss.getItem("demo-cap") ?? "";
    el("demo-sec").textContent = ss.getItem("demo-sec") ?? "";
    const card = ss.getItem("demo-card");
    if (card) el("demo-card").innerHTML = card;
    const cur = el("demo-cur");
    cur.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#141414" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const at = (x: number, y: number) => {
      cur.style.transform = `translate(${x - 3}px,${y - 2}px)`;
      ss.setItem("demo-xy", `${x},${y}`);
    };
    const [x, y] = (ss.getItem("demo-xy") ?? "720,450").split(",").map(Number);
    at(x, y);
    addEventListener("mousemove", (e) => at(e.clientX, e.clientY), true);
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      r.className = "demo-ring";
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.body.append(r);
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", mount);
  else mount();
};

type Cap = { start: number; end: number; text: string; sec: string };

export class Rec {
  private cdp!: CDPSession;
  private frames: { file: string; t: number }[] = [];
  private caps: Cap[] = [];
  private sec = "";
  private n = 0;

  constructor(private page: Page, private dir: string) {}

  async start() {
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(this.dir, "frames"), { recursive: true });
    await this.page.addInitScript(OVERLAY);
    await this.page.goto("about:blank");
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      const file = path.join(this.dir, "frames", `${String(this.n++).padStart(6, "0")}.jpg`);
      fs.writeFileSync(file, Buffer.from(data, "base64"));
      this.frames.push({ file, t: metadata.timestamp ?? Date.now() / 1000 });
      this.cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1200, everyNthFrame: 2 });
  }

  private async set(key: string, value: string) {
    await this.page.evaluate(([k, v]) => {
      sessionStorage.setItem(k, v);
      const id = k === "demo-card" ? null : k;
      if (id) {
        const e = document.getElementById(id);
        if (e) e.textContent = v;
      }
    }, [key, value]);
  }

  /** The section badge (top corner) and, with it, a chapter in the voice-over script. */
  async section(name: string) {
    this.sec = name;
    console.log(`[demo] ${new Date().toLocaleTimeString()} ${name}`);
    await this.set("demo-sec", name);
  }

  /** A subtitle line; it stays until the next one. Also the voice-over line for that stretch. */
  async say(text: string, holdMs = 2600) {
    const now = Date.now() / 1000;
    const last = this.caps.at(-1);
    if (last && last.end === 0) last.end = now;
    if (text) this.caps.push({ start: now, end: 0, text, sec: this.sec });
    await this.set("demo-cap", text);
    await this.page.waitForTimeout(holdMs);
  }

  /** A full-screen title card. */
  async card(title: string, sub: string, ms = 3500) {
    const html = `<h1>${title}</h1><p>${sub}</p>`;
    await this.page.evaluate((h) => {
      sessionStorage.setItem("demo-card", h);
      let c = document.getElementById("demo-card");
      if (!c) {
        c = document.createElement("div");
        c.id = "demo-card";
        document.body.append(c);
      }
      c.innerHTML = h;
    }, html);
    await this.say(`${title} — ${sub.replace(/<[^>]+>/g, "")}`, ms);
    await this.page.evaluate(() => {
      sessionStorage.removeItem("demo-card");
      document.getElementById("demo-card")?.remove();
    });
    await this.say("", 0);
  }

  /** Move the cursor there the way a hand would, pause, click. */
  async tap(target: Locator, pauseMs = 450) {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (box) await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
    await this.page.waitForTimeout(pauseMs);
    await target.click();
    await this.page.waitForTimeout(350);
  }

  async type(target: Locator, text: string) {
    await this.tap(target);
    await target.pressSequentially(text, { delay: 75 });
    await this.page.waitForTimeout(400);
  }

  /** Smooth scroll by `dy` px over `ms`. */
  async scroll(dy: number, ms = 1400) {
    await this.page.evaluate(([d, t]) => window.scrollBy({ top: d, behavior: "smooth" }) ?? t, [dy, ms]);
    await this.page.waitForTimeout(ms);
  }

  hold(ms: number) {
    return this.page.waitForTimeout(ms);
  }

  /** Stop, then write demo.mp4 (frames at their real times), subtitles.srt and voiceover.md. */
  async finish(outDir: string) {
    await this.say("", 0);
    await this.page.waitForTimeout(800);
    await this.cdp.send("Page.stopScreencast");
    const t0 = this.frames[0].t;
    const list = this.frames.map((f, i) => `file '${f.file}'\nduration ${((this.frames[i + 1]?.t ?? f.t + 1.5) - f.t).toFixed(3)}`);
    list.push(`file '${this.frames.at(-1)!.file}'`);
    fs.writeFileSync(path.join(this.dir, "frames.txt"), list.join("\n"));

    const ts = (s: number, sep = ",") => {
      const ms = Math.max(0, Math.round((s - t0) * 1000));
      const p = (n: number, w = 2) => String(n).padStart(w, "0");
      return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
    };
    const end = this.frames.at(-1)!.t;
    const caps = this.caps.map((c) => ({ ...c, end: c.end || end }));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "subtitles.srt"), caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join("\n"));
    let md = "# متن صداگذاری ترب‌گرد\n\nهر خط همون زیرنویسیه که توی ویدیو می‌آد، با زمان شروع و پایانش. صدا رو روی همین زمان‌ها ضبط کن.\n";
    let sec = "";
    for (const c of caps) {
      if (c.sec !== sec) md += `\n## ${(sec = c.sec) || "شروع"}\n\n`;
      md += `- \`${ts(c.start, ".").slice(3, 8)}–${ts(c.end, ".").slice(3, 8)}\` ${c.text}\n`;
    }
    fs.writeFileSync(path.join(outDir, "voiceover.md"), md);
    return path.join(this.dir, "frames.txt");
  }
}
