import { render, screen } from "@testing-library/react";
import { SavingsPage } from "@/pages/savings/ui/SavingsPage";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryWrapper } from "@/test/queryTestUtils";

vi.mock("@/app/providers/ActiveGroupContext", () => ({
  useSetActiveGroup: vi.fn(),
}));

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
            share: 1,
            percentage: 100,
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
      <QueryWrapper>
        <MemoryRouter initialEntries={["/savings/group-1"]}>
          <Routes>
            <Route path="/savings/:groupId" element={<SavingsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryWrapper>,
    );

    // Check for title and header
    expect(
      screen.getByRole("heading", { name: /Savings Goals/i }),
    ).toBeInTheDocument();

    // Check for Savings Goal Card (from SavingsGoalList)
    expect(screen.getByText(/New Sofa/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, el) => el?.textContent.trim().startsWith("Target €") ?? false,
      ),
    ).toHaveTextContent(/2,000/);

    // Check for creation trigger button
    expect(
      screen.getByRole("button", { name: /Add Savings Goal/i }),
    ).toBeInTheDocument();
  });
});
