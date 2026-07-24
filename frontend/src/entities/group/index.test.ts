import { describe, it, expect, vi, beforeEach } from "vitest";
import { groupApi } from "./index";

vi.mock("../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

vi.stubGlobal("fetch", vi.fn());

describe("groupApi.updateMemberIncome", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: "member-1",
          userId: "user-1",
          income: 4200,
          joinedAt: "2026-01-01T00:00:00.000Z",
        }),
    } as Response);
  });

  it("sends a PUT request to /members/:id/income with the income body", async () => {
    await groupApi.updateMemberIncome("member-1", 4200);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/members/member-1/income",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ income: 4200 }),
      }),
    );
  });

  it("resolves with the typed Member returned by the API", async () => {
    const result = await groupApi.updateMemberIncome("member-1", 4200);

    expect(result).toEqual(
      expect.objectContaining({ id: "member-1", income: 4200 }),
    );
  });
});
