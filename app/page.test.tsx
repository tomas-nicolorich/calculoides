import { describe, it, expect, vi, beforeEach } from "vitest";

// `vi.hoisted` — see `app/(app)/layout.test.tsx` for the same TDZ rationale.
const { getUserMock, redirectMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import HomePage from "./page";

// app-navigation-shell: "Root Route Redirects Based on Session State"
describe("app/page", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    redirectMock.mockClear();
  });

  it("redirects a signed-in user to /groups", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });

    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/groups");

    expect(redirectMock).toHaveBeenCalledWith("/groups");
  });

  it("redirects a signed-out user to /login", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
