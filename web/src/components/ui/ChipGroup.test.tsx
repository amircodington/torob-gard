// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

vi.mock("gsap/Flip", () => ({ Flip: { getState: vi.fn(), from: vi.fn() } }));
vi.mock("../../lib/motion", () => ({ registerMotion: () => {}, reduced: () => false }));

import { Chip } from "./Chip";
import { ChipGroup } from "./ChipGroup";

afterEach(cleanup);
// jsdom has no layout: give each chip a distinct offset so the pill's position names its chip.
beforeAll(() => {
  const x: Record<string, number> = { قیمت: 10, فاصله: 120 };
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", { configurable: true, get() { return x[this.textContent ?? ""] ?? 0; } });
});

function Sorts() {
  const [sort, setSort] = useState("قیمت");
  return (
    <ChipGroup label="مرتب‌سازی">
      {["قیمت", "فاصله"].map((s) => (
        <Chip key={s} label={s} selected={sort === s} onClick={() => setSort(s)} />
      ))}
    </ChipGroup>
  );
}

describe("ChipGroup", () => {
  it("renders one pill behind the pressed chip and moves it on click", () => {
    const { container } = render(<Sorts />);
    expect(screen.getByRole("group", { name: "مرتب‌سازی" })).toBeTruthy();
    const pills = container.querySelectorAll<HTMLElement>("[data-pill]");
    expect(pills).toHaveLength(1);
    expect(pills[0].style.left).toBe("10px");
    fireEvent.click(screen.getByRole("button", { name: "فاصله" }));
    expect(pills[0].style.left).toBe("120px");
    expect(screen.getByRole("button", { name: "فاصله" }).dataset.inGroup).toBe("");
  });
});
