import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserMock, upsertUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  upsertUserMock: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: getUserMock } }),
  ),
}));

vi.mock("../server/services/user", () => ({
  UserService: { upsertUser: upsertUserMock },
}));

import { upsert } from "./user";

const SESSION_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "99999999-9999-4999-8999-999999999999";

// resource-authorization: "User Profile Access Is Self-Scoped" (3b.6).
describe("upsert", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    upsertUserMock.mockReset();
  });

  it("upserts the caller's own profile keyed by the session id", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: SESSION_USER_ID, email: "me@example.com" } },
    });
    upsertUserMock.mockResolvedValue({
      id: SESSION_USER_ID,
      email: "me@example.com",
      name: "Jane",
    });

    const result = await upsert({ name: "Jane" });

    expect(result).toEqual({
      ok: true,
      data: { id: SESSION_USER_ID, email: "me@example.com", name: "Jane" },
    });
    expect(upsertUserMock).toHaveBeenCalledWith(
      SESSION_USER_ID,
      "me@example.com",
      "Jane",
    );
  });

  // A client-supplied `id` in the payload has no matching schema key and is
  // never read — the session's own id is always what reaches the service.
  it("ignores a client-supplied id in the payload; uses the session id instead", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: SESSION_USER_ID, email: "me@example.com" } },
    });
    upsertUserMock.mockResolvedValue({
      id: SESSION_USER_ID,
      email: "me@example.com",
      name: "Jane",
    });

    await upsert({ id: OTHER_USER_ID, name: "Jane" });

    expect(upsertUserMock).toHaveBeenCalledWith(
      SESSION_USER_ID,
      "me@example.com",
      "Jane",
    );
    expect(upsertUserMock).not.toHaveBeenCalledWith(
      OTHER_USER_ID,
      expect.anything(),
      expect.anything(),
    );
  });

  it("denies an unauthenticated caller with 403 and never touches the service", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await upsert({ name: "Jane" });

    expect(result).toEqual({ ok: false, error: "Unauthorized", status: 403 });
    expect(upsertUserMock).not.toHaveBeenCalled();
  });
});
