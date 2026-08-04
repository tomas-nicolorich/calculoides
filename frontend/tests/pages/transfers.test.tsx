import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { QueryClient } from "@tanstack/react-query";
import { TransfersPage } from "@/pages/transfers/ui/TransfersPage";
import { transferApi } from "@/entities/transfer";
import { QueryWrapper, createTestQueryClient } from "@/test/queryTestUtils";
import { queryKeys } from "@/shared/api/queryKeys";

vi.mock("@/app/providers/ActiveGroupContext", () => ({
  useSetActiveGroup: vi.fn(),
}));

vi.mock("@/entities/transfer", () => ({
  transferApi: {
    create: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteAll: vi.fn().mockResolvedValue(undefined),
  },
}));

const transfer = {
  id: "t1",
  categoryId: "cat-1",
  categoryName: "Groceries",
  categoryIcon: "groceries",
  fromMemberId: "m1",
  fromMemberName: "Alice",
  toMemberId: "m2",
  toMemberName: "Bob",
  amount: 50,
  date: "2026-06-01T00:00:00.000Z",
};

vi.mock("@/shared/api/dashboardHooks", () => ({
  useDashboardSummary: () => ({
    data: {
      groupName: "Test Group",
      ownerId: "1",
      totalIncome: 5000,
      totalBudget: 4000,
      totalSpent: 1000,
      members: [
        { id: "m1", name: "Alice" },
        { id: "m2", name: "Bob" },
      ],
      recentExpenses: [],
      recentTransfers: [],
    },
    loading: false,
    error: null,
  }),
  useCategoriesList: () => ({ data: [], loading: false }),
  useTransfersList: () => ({
    data: {
      transfers: [transfer],
      pagination: { total: 1, limit: 25, offset: 0 },
    },
    loading: false,
  }),
}));

function renderPage(client: QueryClient = createTestQueryClient()) {
  return render(
    <QueryWrapper client={client}>
      <MemoryRouter initialEntries={["/transfers/group-1"]}>
        <Routes>
          <Route path="/transfers/:groupId" element={<TransfersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  );
}

describe("TransfersPage delete flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a transfer and invalidates the group query instead of calling separate refresh hooks", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const user = userEvent.setup();
    renderPage(client);

    await user.click(screen.getByRole("button", { name: /row options/i }));
    await user.click(screen.getByRole("menuitem", { name: /^delete$/i }));
    await user.click(screen.getByRole("button", { name: "Delete Transfer" }));

    await waitFor(() => {
      expect(transferApi.delete).toHaveBeenCalledWith("t1");
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.group("group-1"),
      });
    });
  });

  it("deletes all transfers and invalidates the group query", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const user = userEvent.setup();
    renderPage(client);

    await user.click(screen.getByRole("button", { name: /delete all/i }));
    await user.click(
      screen.getByRole("button", { name: "Delete All Transfers" }),
    );

    await waitFor(() => {
      expect(transferApi.deleteAll).toHaveBeenCalledWith("group-1");
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.group("group-1"),
      });
    });
  });
});
