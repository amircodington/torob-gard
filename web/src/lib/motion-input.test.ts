// @vitest-environment jsdom
import { expect, it } from "vitest";
import { byKeyboard } from "./motion";

it("tracks the last input: a key press means keyboard until the next pointer press", () => {
  expect(byKeyboard()).toBe(false);
  document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  expect(byKeyboard()).toBe(true);
  expect(document.documentElement.dataset.input).toBe("keyboard");
  document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
  expect(byKeyboard()).toBe(false);
  expect(document.documentElement.dataset.input).toBe("pointer");
});

it("sees the key even when a handler stops it (capture phase)", () => {
  document.body.addEventListener("keydown", (e) => e.stopPropagation(), { once: true });
  document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
  expect(byKeyboard()).toBe(true);
});
