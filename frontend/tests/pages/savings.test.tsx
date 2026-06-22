import { render, screen } from "@testing-library/react";
import { SavingsPage } from "@/pages/savings/ui/SavingsPage";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock the hooks
vi.mock("@/shared/api/savingsHooks", () => ({
  useSavingsGoals: () => ({
    data: [
      {
        id: "1",
        groupId: "group-1",
        name: "New Sofa",
        targetAmount: 2000,
        currentAmount: 500,
        targetDate: "2026-12-31T00:00:00.000Z",
        projectedDate: "2026-11-30T00:00:00.000Z",
        varianceMonths: -1,
        breakdown: [
          {
            memberId: "user-1",
            proportionalAmount: 50,
            actualAmount: 50,
            isOverridden: false,
            user: { name: "Alice", email: "alice@example.com" },
          },
        ],
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

describe("Savings Page", () => {
  it("renders the Savings Goal page with redesigned elements", () => {
    render(
      <MemoryRouter initialEntries={["/savings/group-1"]}>
        <Routes>
          <Route path="/savings/:groupId" element={<SavingsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Check for title and header
    expect(screen.getByText(/Savings Calculator/i)).toBeInTheDocument();

    // Check for Savings Goal Card (from SavingsGoalList)
    expect(screen.getByText(/New Sofa/i)).toBeInTheDocument();
    expect(screen.getByText(/Target:/i)).toHaveTextContent(/2,000/);

    // Check for creation trigger button
    expect(
      screen.getByRole("button", { name: /Add Goal/i }),
    ).toBeInTheDocument();

    // Check for back button
    expect(
      screen.getByRole("link", { name: /Back to Dashboard/i }),
    ).toBeInTheDocument();
  });
});
