import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// The `@supabase/ssr` server client hits the network in `getUser()`; mock it
// so tests are deterministic and don't require a live Supabase project.
const getUserMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

import { middleware } from "./middleware";

function requestFor(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("middleware", () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  // Threat Matrix: "Unauthenticated request to a protected page" (1a.3)
  it("redirects an unauthenticated request to a protected page to /login", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await middleware(requestFor("/dashboard/group-1"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  // server-session-auth: "Legacy API paths are excluded from the matcher"
  // (1a.4) — the redirect branch must never fire for /api/*, even when the
  // caller is unauthenticated by cookie, so the existing bearer-token flow
  // (verified independently by the legacy dispatcher) keeps working.
  it("does not redirect /api/* requests even when unauthenticated", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await middleware(requestFor("/api/groups"));

    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  // Triangulation: an authenticated user reaching a protected page is not
  // redirected — proves the branch is conditioned on `user`, not on path
  // alone (a hardcoded "always redirect" would fail this).
  it("does not redirect an authenticated request to a protected page", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const response = await middleware(requestFor("/dashboard/group-1"));

    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  // Triangulation: an unauthenticated user reaching a public auth page
  // (e.g. the login page itself) is not redirected — proves the branch
  // also excludes the `(auth)` route group, not just `/api`.
  it("does not redirect an unauthenticated request to /login itself", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await middleware(requestFor("/login"));

    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });
});
