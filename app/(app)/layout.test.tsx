import { describe, it, expect, vi, beforeEach } from "vitest";

// `vi.mock` factories are hoisted above all imports; referencing a plain
// top-level `const` directly inside one hits a TDZ error ("no top level
// variables inside a factory"). `vi.hoisted` runs before that hoisting so
// the mocks below can be safely captured by reference.
const { getUserMock, redirectMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock },
    }),
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import Layout from "./layout";

describe("app/(app)/layout", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    redirectMock.mockClear();
  });

  // server-session-auth: "Missing or invalid session is redirected" (1a.8)
  it("redirects to /login without rendering content when there is no session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    await expect(Layout({ children: "protected content" })).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  // server-session-auth: "Tampered cookie without a valid Supabase session"
  // (1a.9) — a cookie can be present and even produce an error object, but
  // `getUser()` returning no `user` MUST still be treated as unauthenticated
  // regardless of cookie presence.
  it("treats a tampered cookie (getUser resolves no user) as unauthenticated", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid claim: missing sub claim" },
    });

    await expect(Layout({ children: "protected content" })).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
  });

  // Triangulation: a verified session renders children instead of redirecting.
  it("renders children for a verified session", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@b.com" } },
      error: null,
    });

    const result = await Layout({ children: "protected content" });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
