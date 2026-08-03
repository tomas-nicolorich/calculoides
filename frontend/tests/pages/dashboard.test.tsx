import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardPage } from "@/pages/dashboard/ui/DashboardPage";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { QueryClient } from "@tanstack/react-query";
import { QueryWrapper, createTestQueryClient } from "@/test/queryTestUtils";
import { queryKeys } from "@/shared/api/queryKeys";
import { useIsMobile } from "@/shared/lib/hooks/useIsMobile";

// Mock the ActiveGroupContext
vi.mock("@/app/providers/ActiveGroupContext", () => ({
  useSetActiveGroup: vi.fn(),
}));

const { mockCategoryDelete } = vi.hoisted(() => ({
  mockCategoryDelete: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/entities/category", () => ({
  categoryApi: { delete: mockCategoryDelete },
}));

// `useIsMobile` defaults to desktop (false) so existing tests below are
// unaffected. The mobile FAB tests override this per-test with
// `vi.mocked(useIsMobile).mockReturnValue(true)` — the repo's global
// `window.matchMedia` mock in `src/test/setup.ts` always resolves desktop,
// so mocking the hook directly is the only way to exercise the mobile branch.
vi.mock("@/shared/lib/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock the AuthContext
vi.mock("@/app/providers/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", email: "test@example.com" },
    signOut: vi.fn(),
  }),
}));

// Mock the hooks
vi.mock("@/shared/api/dashboardHooks", () => ({
  useDashboardSummary: () => ({
    data: {
      groupName: "Test Group",
      ownerId: "1",
      totalIncome: 5000,
      totalBudget: 4000,
      totalSpent: 1000,
      members: [
        {
          id: "1",
          name: "Member 1",
          income: 3000,
          share: 60,
          spent: 500,
          remainingQuota: 1000,
        },
        {
          id: "2",
          name: "Member 2",
          income: 2000,
          share: 40,
          spent: 500,
          remainingQuota: 500,
        },
      ],
      recentExpenses: [],
      recentTransfers: [],
    },
    loading: false,
    error: null,
  }),
  useCategoriesList: () => ({
    data: [
      {
        id: "cat-1",
        name: "Rent",
        monthlyBudget: 1000,
        icon: "rent",
        balances: [],
      },
    ],
    loading: false,
  }),
}));

function renderPage(client: QueryClient = createTestQueryClient()) {
  return render(
    <QueryWrapper client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryWrapper>,
  );
}

describe("Dashboard Page", () => {
  it("renders all 5 main cards", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: /Income Overview/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Remaining Balance/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Expenses/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Budget Transfers/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Budget Categories/i }),
    ).toBeInTheDocument();
  });

  it("uses xl:grid-cols-3 breakpoint and items-start alignment on grid container", () => {
    renderPage();

    const gridContainer = screen.getByTestId("dashboard-grid");
    expect(gridContainer).toHaveClass("3xl:grid-cols-3");
    expect(gridContainer).not.toHaveClass("lg:grid-cols-3");
    expect(gridContainer).toHaveClass("items-start");
  });

  describe("mobile Add Expense FAB", () => {
    it("hides the header Add Expense button and shows a FAB that opens the existing add-expense dialog on mobile", async () => {
      vi.mocked(useIsMobile).mockReturnValue(true);
      const user = userEvent.setup();

      renderPage();

      const header = screen
        .getByRole("heading", {
          name: /Test Group/i,
        })
        .closest("header");
      if (!header) throw new Error("Dashboard header not found");

      // The header's own Add Expense button must be gone on mobile.
      expect(
        within(header).queryByRole("button", { name: /Add Expense/i }),
      ).not.toBeInTheDocument();

      // The FAB (rendered outside the header) is the only remaining
      // "Add Expense" control.
      const fab = screen.getByRole("button", { name: /Add Expense/i });
      expect(fab).toBeInTheDocument();

      await user.click(fab);

      // Proves the FAB opened Dashboard's existing dialog/form, not a new one.
      expect(
        screen.getByPlaceholderText("e.g. Groceries, Electricity bill"),
      ).toBeInTheDocument();
    });

    it("keeps the header Add Expense button and renders no FAB on desktop", () => {
      vi.mocked(useIsMobile).mockReturnValue(false);

      renderPage();

      const header = screen
        .getByRole("heading", {
          name: /Test Group/i,
        })
        .closest("header");
      if (!header) throw new Error("Dashboard header not found");

      expect(
        within(header).getByRole("button", { name: /Add Expense/i }),
      ).toBeInTheDocument();
      // No FAB rendered anywhere on desktop — exactly one "Add Expense"
      // control total, and it's the one inside the header.
      expect(
        screen.getAllByRole("button", { name: /Add Expense/i }),
      ).toHaveLength(1);
    });
  });

  describe("category delete", () => {
    it("deletes the category and invalidates the group query instead of calling separate refresh closures", async () => {
      const client = createTestQueryClient();
      const invalidateSpy = vi.spyOn(client, "invalidateQueries");
      const user = userEvent.setup();
      renderPage(client);

      await user.click(screen.getByRole("button", { name: /rent/i }));
      await user.click(screen.getByRole("button", { name: "Delete category" }));
      await user.click(screen.getByRole("button", { name: "Delete Category" }));

      await waitFor(() => {
        expect(mockCategoryDelete).toHaveBeenCalledWith("cat-1");
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: queryKeys.group(""),
        });
      });
    });
  });
});
