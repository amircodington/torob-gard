"use client";

// The root layout itself failed: no globals.css, no fonts, so plain inline styles only.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "64px 16px", background: "#fbf7f3" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- no layout, no optimizer: a static file is all that is left */}
        <img src="/mascot/torob-gard-mascot-stuck.webp" alt="" aria-hidden width={144} height={144} />
        <h1 style={{ fontSize: 24 }}>یه مشکلی پیش اومد</h1>
        <p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 16px" }}>
            تلاش دوباره
          </button>{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the point once the root layout broke */}
          <a href="/" style={{ display: "inline-block", minHeight: 44, lineHeight: "44px", padding: "0 16px" }}>
            برگشت به خانه
          </a>
        </p>
      </body>
    </html>
  );
}
