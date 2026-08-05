import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.mock factories are hoisted above top-level const declarations, so the
// mock fns themselves must be created inside vi.hoisted() to be referenced
// both here and from inside the test bodies below.
const { getSessionMock, getUserFromSessionMock, getGroupsForUserMock } =
  vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    getUserFromSessionMock: vi.fn(),
    getGroupsForUserMock: vi.fn(),
  }));

// Server Supabase client — used by the adapter to look up the cookie
// session's access_token when no `Authorization` header is present
// (server-session-auth: "Both Auth Paths Derive From the Same Supabase
// Session"). Mocked so tests don't require a live Supabase project.
vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getSession: getSessionMock } }),
  ),
}));

// Legacy bearer-token verification (`withAuth`'s dependency, unchanged) —
// mocked so 401/200 outcomes are deterministic and don't hit a real
// Supabase project.
vi.mock("../../../api/_src/services/auth", () => ({
  getUserFromSession: getUserFromSessionMock,
  extractTokenFromHeader: (header?: string) =>
    header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null,
}));

// One representative service call so the "groups list" happy path can be
// exercised end-to-end without a real database.
vi.mock("../../../lib/server/services/group", () => ({
  GroupService: { getGroupsForUser: getGroupsForUserMock },
}));

import { GET } from "./route";

function requestFor(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers,
  });
}

describe("legacy adapter route", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getUserFromSessionMock.mockReset();
    getGroupsForUserMock.mockReset();
  });

  // 1b.5 (Threat Matrix case 2): unauthenticated request to /api/* returns
  // 401 JSON, never an HTML redirect.
  it("returns 401 JSON, not a redirect, for a fully unauthenticated request", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const response = await GET(requestFor("/api/groups"), {
      params: Promise.resolve({ legacy: ["groups"] }),
    });

    expect(response.status).toBe(401);
    expect(response.status < 300 || response.status >= 400).toBe(true);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.json()).toEqual({
      error: "Unauthorized: Missing token",
    });
  });

  // 1b.6 (server-session-auth: "Legacy bearer token from an unrelated/expired
  // session is rejected"): a bearer token that isn't a currently valid
  // session is rejected with 401, independent of any cookie state.
  it("rejects a bearer token from an unrelated/expired session with 401", async () => {
    getUserFromSessionMock.mockResolvedValue(null);

    const response = await GET(
      requestFor("/api/groups", { authorization: "Bearer stale-token" }),
      { params: Promise.resolve({ legacy: ["groups"] }) },
    );

    expect(response.status).toBe(401);
    expect(getUserFromSessionMock).toHaveBeenCalledWith("stale-token");
  });

  // 1b.4 (Threat Matrix case 3): legacy path with a cookie session but no
  // Authorization header — adapter injects a synthetic bearer token from the
  // server Supabase client, and the handler behaves identically to a real
  // bearer-token call (same 200 response, same downstream service call).
  it("injects a synthetic bearer token from the cookie session and reaches the handler", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "session-derived-token" } },
    });
    getUserFromSessionMock.mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
    });
    getGroupsForUserMock.mockResolvedValue([{ id: "group-1" }]);

    const response = await GET(requestFor("/api/groups"), {
      params: Promise.resolve({ legacy: ["groups"] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "group-1" }]);
    // Proves the injected token — not a hardcoded/absent one — is what
    // withAuth verified, i.e. the same code path a real bearer call takes.
    expect(getUserFromSessionMock).toHaveBeenCalledWith(
      "session-derived-token",
    );
    expect(getGroupsForUserMock).toHaveBeenCalledWith("user-1");
  });
});
