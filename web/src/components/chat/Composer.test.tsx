// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Composer } from "./Composer";

afterEach(cleanup);

describe("Composer", () => {
  it("while a turn is pending it does not send, and keeps the draft", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} disabled />);
    const box = screen.getByRole("textbox", { name: "نیاز خرید تو" });
    fireEvent.change(box, { target: { value: "یه هدفون هم" } });
    fireEvent.keyDown(box, { key: "Enter" });
    fireEvent.submit(box.closest("form")!);
    expect(onSend).not.toHaveBeenCalled();
    expect((box as HTMLTextAreaElement).value).toBe("یه هدفون هم");
    expect(screen.getByRole("button", { name: "ارسال" })).toHaveProperty("disabled", true);
  });
});
