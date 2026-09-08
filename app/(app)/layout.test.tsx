import { describe, it, expect, vi, beforeEach } from "vitest";

// `vi.mock` factories are hoisted above all imports; referencing a plain
// top-level `const` directly inside one hits a TDZ error ("no top level
// variables inside a factory"). `vi.hoisted` runs before that hoisting so
// the mocks below can be safely captured by reference.
const { getUserMock, redirectMock, getGroupsForUserMock, getUserServiceMock } =
  vi.hoisted(() => ({
    getUserMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    getGroupsForUserMock: vi.fn(),
    getUserServiceMock: vi.fn(),
  }));

vi.mock("../../lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: getUserMock },
    }),
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("../../lib/server/services/group", () => ({
  GroupService: { getGroupsForUser: getGroupsForUserMock },
}));

vi.mock("../../lib/server/services/user", () => ({
  UserService: { getUser: getUserServiceMock },
}));

import Layout from "./layout";

interface RenderedElement<P> {
  props: P;
}

interface AppShellProps {
  groups: { id: string; name: string }[];
}

describe("app/(app)/layout", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    redirectMock.mockClear();
    getGroupsForUserMock.mockReset();
    getGroupsForUserMock.mockResolvedValue([]);
    getUserServiceMock.mockReset();
    getUserServiceMock.mockResolvedValue(null);
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

  // Triangulation: a verified session with a completed profile renders
  // children instead of redirecting.
  it("renders children for a verified session", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@b.com" } },
      error: null,
    });
    getUserServiceMock.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "a@b.com",
    });

    const result = await Layout({ children: "protected content" });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  // Mirrors `main`'s `AuthProvider.profileIncomplete` gate: a verified
  // session with no user row yet (a fresh signup whose profile-provisioning
  // step never ran) is routed to complete it before reaching the app.
  it("redirects to /complete-profile when the session has no user profile row", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@b.com" } },
      error: null,
    });
    getUserServiceMock.mockResolvedValue(null);

    await expect(Layout({ children: "protected content" })).rejects.toThrow(
      "NEXT_REDIRECT:/complete-profile",
    );

    expect(redirectMock).toHaveBeenCalledWith("/complete-profile");
  });

  // app-navigation-shell: "Switcher lists the signed-in user's groups" —
  // `getGroupNames()`'s always-`[]` stub is replaced by real
  // `GroupService`/`UserService` calls, both passed into `AppShell`.
  it("populates AppShell from GroupService.getGroupsForUser and UserService.getUser", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@b.com" } },
      error: null,
    });
    getGroupsForUserMock.mockResolvedValue([
      { id: "group-1", name: "Roomies" },
      { id: "group-2", name: "Weekend House" },
    ]);
    getUserServiceMock.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "a@b.com",
    });

    const result = await Layout({ children: "protected content" });

    expect(getGroupsForUserMock).toHaveBeenCalledWith("user-1");
    expect(getUserServiceMock).toHaveBeenCalledWith("user-1");

    const providersElement = result as unknown as RenderedElement<{
      children: RenderedElement<AppShellProps>;
    }>;
    const appShellProps = providersElement.props.children.props;

    expect(appShellProps.groups).toEqual([
      { id: "group-1", name: "Roomies" },
      { id: "group-2", name: "Weekend House" },
    ]);
  });
});
