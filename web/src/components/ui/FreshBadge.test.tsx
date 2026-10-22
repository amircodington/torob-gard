// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FreshBadge } from "./FreshBadge";

afterEach(cleanup);
const DAY = 24 * 60;

describe("FreshBadge", () => {
  it("59 days: no honesty suffix", () => {
    render(<FreshBadge updatedMinAgo={59 * DAY} />);
    expect(screen.getByText(/۵۹ روز پیش/)).toBeTruthy();
    expect(screen.queryByText(/ممکن است تغییر کرده باشد/)).toBeNull();
  });
  it("61 days: honesty suffix", () => {
    render(<FreshBadge updatedMinAgo={61 * DAY} />);
    expect(screen.getByText(/ممکن است تغییر کرده باشد/)).toBeTruthy();
    expect(screen.queryByText(/قدیمی/)).toBeNull(); // one stale marker, not two
  });
  it("prefixes what the age belongs to", () => {
    render(<FreshBadge updatedMinAgo={5} prefix="کمترین قیمت: " />);
    expect(screen.getByText("کمترین قیمت: به‌روزرسانی ۵ دقیقه پیش")).toBeTruthy();
  });
});
