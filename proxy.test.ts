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

import { proxy, config } from "./proxy";

function requestFor(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("proxy", () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  // Threat Matrix: "Unauthenticated request to a protected page" (1a.3)
  it("redirects an unauthenticated request to a protected page to /login", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await proxy(requestFor("/dashboard/group-1"));

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

    const response = await proxy(requestFor("/api/groups"));

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

    const response = await proxy(requestFor("/dashboard/group-1"));

    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  // Triangulation: an unauthenticated user reaching a public auth page
  // (e.g. the login page itself) is not redirected — proves the branch
  // also excludes the `(auth)` route group, not just `/api`.
  it("does not redirect an unauthenticated request to /login itself", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await proxy(requestFor("/login"));

    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  // server-session-auth: "A protected route shaped like a static asset
  // still fails closed" — /dashboard/x.woff2 does not start with /fonts/,
  // so it must remain a protected route path at the proxy's own logic
  // level: this path is not conditioned on file extension, only on
  // isApiPath/isPublicPath, so it still redirects regardless of what
  // config.matcher decides for real Next.js request routing.
  it("still redirects an unauthenticated request to a protected route that looks like a font asset", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await proxy(requestFor("/dashboard/x.woff2"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });
});

describe("config.matcher", () => {
  const matcherPattern = new RegExp(config.matcher[0]);

  // server-session-auth: "Font asset request bypasses the matcher entirely"
  // — the /fonts prefix rule excludes this path so it never reaches the
  // proxy at all (no session refresh, no redirect, served as a static
  // 200 by Next.js directly).
  it("excludes /fonts/* paths from the matcher", () => {
    expect(matcherPattern.test("/fonts/geist-variable.woff2")).toBe(false);
  });
});
