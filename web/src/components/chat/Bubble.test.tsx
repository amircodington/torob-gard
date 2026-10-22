// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Typing } from "./Bubble";

afterEach(cleanup);

it("Typing always has text for the live region, even with an empty status", () => {
  render(<Typing status="" />);
  expect(screen.getByText("دارم فکر می‌کنم…")).toBeTruthy();
});
