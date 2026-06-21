import { render, screen } from "@testing-library/react";
import { DashboardPage } from "@/pages/dashboard/ui/DashboardPage";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

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
    data: [],
    loading: false,
  }),
}));

describe("Dashboard Page", () => {
  it("renders all 5 main cards", () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

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
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const gridContainer = screen.getByTestId("dashboard-grid");
    expect(gridContainer).toHaveClass("3xl:grid-cols-3");
    expect(gridContainer).not.toHaveClass("lg:grid-cols-3");
    expect(gridContainer).toHaveClass("items-start");
  });
});
