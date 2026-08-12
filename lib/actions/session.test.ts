import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserMock, signOutMock, redirectMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  signOutMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock, signOut: signOutMock },
    }),
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { getAuthenticatedUserId, signOut } from "./session";

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

// app-navigation-shell: "Account Menu Exposes Identity and Sign-Out"
describe("signOut", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    redirectMock.mockClear();
  });

  it("clears the session and redirects to /login", async () => {
    signOutMock.mockResolvedValue({ error: null });

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("invalidates the server session before redirecting, not just the browser store", async () => {
    const callOrder: string[] = [];
    signOutMock.mockImplementation(() => {
      callOrder.push("signOut");
      return Promise.resolve({ error: null });
    });
    redirectMock.mockImplementation((url: string) => {
      callOrder.push("redirect");
      throw new Error(`NEXT_REDIRECT:${url}`);
    });

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(callOrder).toEqual(["signOut", "redirect"]);
  });
});
