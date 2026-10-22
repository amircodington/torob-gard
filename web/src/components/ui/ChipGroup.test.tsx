// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Flip } from "gsap/Flip";

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock("gsap/Flip", () => ({ Flip: { getState: vi.fn(() => ({})), from: vi.fn() } }));
vi.mock("../../lib/motion", () => ({ registerMotion: () => {}, reduced: () => motion.reduce }));

import { Chip } from "./Chip";
import { ChipGroup, useSlidingPill } from "./ChipGroup";

afterEach(() => {
  cleanup();
  vi.mocked(Flip.from).mockClear();
  motion.reduce = false;
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
    render(<Steps on="قیمت" />);
    expect(Flip.from).not.toHaveBeenCalled(); // first ever placement: no tween from nowhere
    cleanup();
    const { container } = render(<Steps on="فاصله" />);
    expect(pillOf(container)[0].style.left).toBe("120px");
    expect(Flip.from).toHaveBeenCalledTimes(1);
  });
});
