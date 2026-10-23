import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const fail = { logout: false };
vi.mock("../../lib/api", () => ({
  api: {
    logout: vi.fn(async () => { calls.push("logout"); if (fail.logout) throw new Error("offline"); }),
    deleteMe: vi.fn(async () => { calls.push("deleteMe"); }),
  },
}));
vi.mock("../../lib/sw", () => ({ clearSavedTrips: vi.fn(async () => { calls.push("trips"); }) }));
vi.mock("../../state/session", () => ({ resetStorage: vi.fn(() => { calls.push("journey"); }) }));

const { deleteData, logOut } = await import("./MePage");

describe("leaving /me forgets this device's journey (shared phone)", () => {
  beforeEach(() => { calls.length = 0; fail.logout = false; });

  it("logout clears the saved trips and the journey's agent session", async () => {
    await logOut();
    expect(calls).toEqual(["logout", "trips", "journey"]);
  });

  it("a failed logout still clears them, then rejects", async () => {
    fail.logout = true;
    await expect(logOut()).rejects.toThrow("offline");
    expect(calls).toEqual(["logout", "trips", "journey"]);
  });

  it("delete clears them too", async () => {
    await deleteData();
    expect(calls).toEqual(["deleteMe", "trips", "journey"]);
  });
});
