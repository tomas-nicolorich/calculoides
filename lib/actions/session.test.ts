import { describe, it, expect, vi } from "vitest";

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

import { getAuthenticatedUserId } from "./session";

describe("getAuthenticatedUserId", () => {
  it("returns the signed-in user's id", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });

    await expect(getAuthenticatedUserId()).resolves.toBe("user-1");
  });

  it("returns null when there is no signed-in user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
  });
});
