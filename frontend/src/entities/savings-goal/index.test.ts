import { describe, it, expect, vi, beforeEach } from "vitest";
import { savingsGoalApi } from "./index";

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

describe("savingsGoalApi.deleteContribution", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(null),
    } as Response);
  });

  it("sends a DELETE request to the goal/member contribution URL with no body", async () => {
    await savingsGoalApi.deleteContribution("goal-1", "member-1");

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/savings/contribution?goalId=goal-1&memberId=member-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    const callArgs = vi.mocked(fetch).mock.calls[0][1] ?? {};
    expect(callArgs.body).toBeUndefined();
  });

  it("builds the URL from the given goalId/memberId pair, not a hardcoded one", async () => {
    await savingsGoalApi.deleteContribution("goal-42", "member-99");

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/savings/contribution?goalId=goal-42&memberId=member-99",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
