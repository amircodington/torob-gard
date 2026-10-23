// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Flip } from "gsap/Flip";

const motion = vi.hoisted(() => ({ reduce: false, keyboard: false }));
vi.mock("gsap/Flip", () => ({ Flip: { getState: vi.fn(() => ({})), from: vi.fn() } }));
vi.mock("../../lib/motion", () => ({ registerMotion: () => {}, reduced: () => motion.reduce, byKeyboard: () => motion.keyboard }));

import { Chip } from "./Chip";
import { ChipGroup, useSlidingPill } from "./ChipGroup";

afterEach(() => {
  cleanup();
  vi.mocked(Flip.from).mockClear();
  motion.reduce = false;
  motion.keyboard = false;
});
// jsdom has no layout: give each chip a distinct offset so the pill's position names its chip.
beforeAll(() => {
  const x: Record<string, number> = { قیمت: 10, فاصله: 120 };
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", { configurable: true, get() { return x[this.textContent ?? ""] ?? 0; } });
});

function Sorts({ start = "قیمت" }: { start?: string }) {
  const [sort, setSort] = useState(start);
  return (
    <ChipGroup label="مرتب‌سازی">
      {["قیمت", "فاصله"].map((s) => (
        <Chip key={s} label={s} selected={sort === s} onClick={() => setSort(s)} />
      ))}
    </ChipGroup>
  );
}

const pillOf = (c: HTMLElement) => c.querySelectorAll<HTMLElement>("[data-pill]");

describe("Chip", () => {
  it("pops only once the user picks it, never at page load", () => {
    render(<Sorts />);
    const [price, near] = ["قیمت", "فاصله"].map((n) => screen.getByRole("button", { name: n }));
    expect(price.className).not.toContain("animate-chip-pop"); // selected from the start
    fireEvent.click(near);
    expect(near.className).toContain("animate-chip-pop");
    expect(price.className).not.toContain("animate-chip-pop");
  });
});

describe("ChipGroup", () => {
  it("renders one pill behind the pressed chip and slides it on click", () => {
    const { container } = render(<Sorts />);
    const group = screen.getByRole("group", { name: "مرتب‌سازی" });
    expect(group.dataset.ready).toBe(""); // the pill took over from the chip's own orange
    const pills = pillOf(container);
    expect(pills).toHaveLength(1);
    expect(pills[0].style.left).toBe("10px");
    fireEvent.click(screen.getByRole("button", { name: "فاصله" }));
    expect(pills[0].style.left).toBe("120px");
    expect(Flip.from).toHaveBeenCalledWith(expect.anything(), { duration: 0.22, ease: "tg.out" });
    expect(screen.getByRole("button", { name: "فاصله" }).dataset.inGroup).toBe("");
  });
  it("reduced motion: the pill jumps", () => {
    motion.reduce = true;
    const { container } = render(<Sorts />);
    fireEvent.click(screen.getByRole("button", { name: "فاصله" }));
    expect(pillOf(container)[0].style.left).toBe("120px");
    expect(Flip.from).not.toHaveBeenCalled();
  });
  it("keyboard action: the pill jumps", () => {
    const { container } = render(<Sorts />);
    motion.keyboard = true;
    fireEvent.click(screen.getByRole("button", { name: "فاصله" }));
    expect(pillOf(container)[0].style.left).toBe("120px");
    expect(Flip.from).not.toHaveBeenCalled();
  });
  it("no pressed chip: no pill", () => {
    const { container } = render(<Sorts start="" />);
    expect(pillOf(container)[0].hidden).toBe(true);
  });
});

describe("useSlidingPill memo", () => {
  function Steps({ on }: { on: string }) {
    const { group, pill } = useSlidingPill<HTMLDivElement>('[aria-current="step"]', "test-steps");
    return (
      <div ref={group}>
        <span ref={pill} data-pill hidden />
        {["قیمت", "فاصله"].map((s) => (
          <button key={s} aria-current={s === on ? "step" : undefined}>{s}</button>
        ))}
      </div>
    );
  }
  it("a remounted group slides on from the last box instead of appearing", () => {
    // jsdom has no layout: an element's on-screen box is its inline left (the group's is 0), as at rest.
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return { left: parseFloat(this.style.left) || 0, top: 0, width: 0, height: 0 } as DOMRect;
    });
    render(<Steps on="قیمت" />);
    expect(Flip.from).not.toHaveBeenCalled(); // first ever placement: no tween from nowhere
    cleanup();
    vi.mocked(Flip.getState).mockImplementationOnce((el) => ({ hidden: (el as HTMLElement).hidden, left: (el as HTMLElement).style.left }) as never);
    const { container } = render(<Steps on="فاصله" />);
    expect(vi.mocked(Flip.getState).mock.results.at(-1)!.value).toEqual({ hidden: false, left: "10px" }); // measured visible, at the old step
    expect(pillOf(container)[0].style.left).toBe("120px");
    expect(Flip.from).toHaveBeenCalledTimes(1);
    rect.mockRestore();
  });
});
