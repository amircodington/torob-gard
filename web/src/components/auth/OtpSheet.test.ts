import { afterEach, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import { parseList, parseToman } from "../me/MePage";
import { cleanCode, cleanPhone } from "./OtpSheet";

afterEach(() => vi.unstubAllGlobals());

it("accepts Persian digits in the phone and code fields", () => {
  expect(cleanPhone("۰۹۱۲ ۱۲۳-۴۵۶۷")).toBe("09121234567");
  expect(cleanPhone("+98 912 123 4567")).toBe("+989121234567");
  expect(cleanCode("۱۲٣ ۴۵۶")).toBe("12345");
  expect(parseToman("۲۰٬۰۰۰٬۰۰۰")).toBe(20_000_000);
  expect(parseToman("")).toBeNull();
  expect(parseList("سامسونگ، شیائومی ,, اپل")).toEqual(["سامسونگ", "شیائومی", "اپل"]);
});

it("a guest's /me is null and a 204 needs no body", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("login required", { status: 401 })));
  expect(await api.me()).toBeNull();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
  await expect(api.requestOtp("09121234567")).resolves.toBeUndefined();
});
