// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Loader, LOADER_DELAY_MS } from "./Loader";
import { RowSkeletons, Skeleton, TierSkeletons } from "./Skeleton";

const css = readFileSync("src/app/globals.css", "utf8");
const reducedBlock = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
afterEach(cleanup);

it("waits ~150 ms before it shows: the fade holds opacity 0 through the delay (fill backwards)", () => {
  expect(LOADER_DELAY_MS).toBe(150);
  expect(css).toMatch(new RegExp(`--animate-loader-in: fade [^;]* ${LOADER_DELAY_MS}ms backwards;`));
  render(<Loader />);
  expect(screen.getByRole("status").className).toContain("animate-loader-in");
});

it("keeps the delay under reduced motion and drops the hop, shadow and shimmer", () => {
  expect(reducedBlock).not.toContain("--animate-loader-in");
  for (const t of ["loader-hop", "loader-shadow", "shimmer"]) expect(reducedBlock).toContain(`--animate-${t}: none;`);
});

it("says what is happening, in Persian, with a decorative hopping mascot", () => {
  render(<Loader />);
  expect(screen.getByRole("status").textContent).toContain("یه لحظه…");
  const img = document.querySelector("img")!;
  expect(img.getAttribute("aria-hidden")).toBe("true");
  expect(img.className).toContain("animate-loader-hop");
});

it("a skeleton bar is hidden from assistive tech; the sheen runs once per card, not per bar", () => {
  const { container } = render(<Skeleton className="h-4 w-20" />);
  const el = container.firstElementChild!;
  expect(el.getAttribute("aria-hidden")).toBe("true");
  expect(el.innerHTML).not.toContain("animate-shimmer");
  cleanup();
  expect(render(<Skeleton sheen className="h-4 w-20" />).container.innerHTML).toContain("animate-shimmer");
  cleanup();
  for (const [node, cards] of [[<TierSkeletons key="t" />, 3], [<RowSkeletons key="r" />, 4]] as const) {
    const { container: c } = render(node);
    expect(c.querySelectorAll(".animate-shimmer")).toHaveLength(cards);
    expect(screen.getAllByRole("status")).toHaveLength(1); // the loader's one live status, not an aria-label on a div
    expect(c.querySelector("[aria-label]")).toBeNull();
    cleanup();
  }
});
