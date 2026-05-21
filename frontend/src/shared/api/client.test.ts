import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.stubGlobal("fetch", vi.fn());

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include Authorization header when session exists", async () => {
    const mockToken = "mock-jwt-token";
    const getSessionMock = vi.spyOn(supabase.auth, "getSession");
    getSessionMock.mockResolvedValue({
      data: {
        session: { access_token: mockToken } as unknown as Session,
      },
      error: null,
    });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "success" }),
    } as Response);

    await apiClient.groups.list();

    expect(fetchMock).toHaveBeenCalled();
    const lastCall = fetchMock.mock.calls[0];
    expect(lastCall[0]).toBe("/api/groups");
    const options = lastCall[1] ?? {};
    const headers = options.headers as Record<string, string>;
    expect(headers).toMatchObject({
      Authorization: `Bearer ${mockToken}`,
      "Content-Type": "application/json",
    });
  });

  it("should not include Authorization header when session does not exist", async () => {
    const getSessionMock = vi.spyOn(supabase.auth, "getSession");
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "success" }),
    } as Response);

    await apiClient.groups.list();

    expect(fetchMock).toHaveBeenCalled();
    const lastCall = fetchMock.mock.calls[0];
    expect(lastCall[0]).toBe("/api/groups");
    const options = lastCall[1] ?? {};
    const headers = options.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
    expect(headers).toMatchObject({
      "Content-Type": "application/json",
    });
  });
});
