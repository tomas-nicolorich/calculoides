import { describe, it, expect, vi } from "vitest";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../shared/api/client", () => ({
  apiClient: { fetch: mockFetch },
}));

import { transferApi } from "./index";

describe("transferApi.create", () => {
  it("sends a POST to /transactions?action=transfer-create with the transfer body", async () => {
    await transferApi.create("cat-1", "m1", "m2", 100);

    expect(mockFetch).toHaveBeenCalledWith(
      "/transactions?action=transfer-create",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          fromMemberId: "m1",
          toMemberId: "m2",
          amount: 100,
        }),
      }),
    );
  });

  it("builds the body from the given arguments, not hardcoded ones", async () => {
    await transferApi.create("cat-9", "m9", "m8", 42.5);

    expect(mockFetch).toHaveBeenCalledWith(
      "/transactions?action=transfer-create",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-9",
          fromMemberId: "m9",
          toMemberId: "m8",
          amount: 42.5,
        }),
      }),
    );
  });
});
