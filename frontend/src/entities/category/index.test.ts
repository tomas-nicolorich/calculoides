import { describe, it, expect, vi } from "vitest";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../shared/api/client", () => ({
  apiClient: { fetch: mockFetch },
}));

import { categoryApi } from "./index";

describe("categoryApi.create", () => {
  it("sends a POST to /transactions?action=category-create&groupId= with the category body", async () => {
    await categoryApi.create("group-1", {
      name: "Rent",
      monthlyBudget: 1000,
      icon: "rent",
      memberIds: ["m1"],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/transactions?action=category-create&groupId=group-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Rent",
          monthlyBudget: 1000,
          icon: "rent",
          memberIds: ["m1"],
        }),
      }),
    );
  });

  it("builds the URL from the given groupId, not a hardcoded one", async () => {
    await categoryApi.create("group-77", {
      name: "Groceries",
      monthlyBudget: 250,
      icon: "food",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/transactions?action=category-create&groupId=group-77",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("categoryApi.update", () => {
  it("sends a POST to /transactions?action=category-update&id= with the category body", async () => {
    await categoryApi.update("cat-1", {
      name: "Groceries",
      monthlyBudget: 500,
      icon: "food",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/transactions?action=category-update&id=cat-1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Groceries",
          monthlyBudget: 500,
          icon: "food",
        }),
      }),
    );
  });
});

describe("categoryApi.delete", () => {
  it("sends a DELETE to /transactions?action=category-delete&id= with no body", async () => {
    await categoryApi.delete("cat-42");

    expect(mockFetch).toHaveBeenCalledWith(
      "/transactions?action=category-delete&id=cat-42",
      expect.objectContaining({ method: "DELETE" }),
    );
    const callArgs = mockFetch.mock.calls[
      mockFetch.mock.calls.length - 1
    ][1] as { body?: string };
    expect(callArgs.body).toBeUndefined();
  });
});

describe("categoryApi.list", () => {
  it("sends a GET to /categories?groupId= forwarding the AbortSignal", async () => {
    const controller = new AbortController();
    await categoryApi.list("group-9", controller.signal);

    expect(mockFetch).toHaveBeenCalledWith(
      "/categories?groupId=group-9",
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
