import { render, screen } from "@testing-library/react";
import { BudgetCategories } from "@/widgets/dashboard/ui/BudgetCategories";
import { describe, it, expect, vi } from "vitest";

import { CategoryWithBalances } from "../../../shared/src/types/redesign";

// Mock UI components that might not exist yet
vi.mock("@/shared/ui/Card", () => ({
  Card: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

// Mock ResponsiveDialog
vi.mock("@/shared/ui/ResponsiveDialog", () => ({
  ResponsiveDialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("BudgetCategories Widget", () => {
  it("shows delete button when user is owner", () => {
    const mockCategories: CategoryWithBalances[] = [
      { id: "1", name: "Food", monthlyBudget: 500, balances: [], icon: "🍔" },
    ];

    render(
      <BudgetCategories
        isOwner={true}
        categories={mockCategories}
        onDelete={vi.fn()}
        groupId="g1"
        members={[]}
        onRefresh={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).toBeInTheDocument();
  });

  it("hides delete button when user is not owner", () => {
    const mockCategories: CategoryWithBalances[] = [
      { id: "1", name: "Food", monthlyBudget: 500, balances: [], icon: "🍔" },
    ];

    render(
      <BudgetCategories
        isOwner={false}
        categories={mockCategories}
        onDelete={vi.fn()}
        groupId="g1"
        members={[]}
        onRefresh={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });

  it("nested balance rows have border-l-2 class", () => {
    const mockCategories: CategoryWithBalances[] = [
      {
        id: "1",
        name: "Food",
        monthlyBudget: 500,
        icon: "🍔",
        balances: [
          { memberId: "m1", quota: 250, spent: 100, remainingQuota: 150 },
        ],
      },
    ];

    render(
      <BudgetCategories
        isOwner={true}
        categories={mockCategories}
        onDelete={vi.fn()}
        groupId="g1"
        members={[{ id: "m1", name: "Alice" }]}
        onRefresh={vi.fn()}
      />,
    );

    const transferBtn = screen.getByTitle("Initiate Transfer");
    // The button lives inside an inner flex div; its parent is the balance row div
    const balanceRow = transferBtn.closest("div.flex")?.parentElement;
    expect(balanceRow).toHaveClass("border-l-2");
  });

  it("transfer icon button has focus-visible:ring-2 class", () => {
    const mockCategories: CategoryWithBalances[] = [
      {
        id: "1",
        name: "Food",
        monthlyBudget: 500,
        icon: "🍔",
        balances: [
          { memberId: "m1", quota: 250, spent: 100, remainingQuota: 150 },
        ],
      },
    ];

    render(
      <BudgetCategories
        isOwner={true}
        categories={mockCategories}
        onDelete={vi.fn()}
        groupId="g1"
        members={[{ id: "m1", name: "Alice" }]}
        onRefresh={vi.fn()}
      />,
    );

    const transferBtn = screen.getByTitle("Initiate Transfer");
    expect(transferBtn).toHaveClass("focus-visible:ring-2");
  });

  it("shows empty state message when categories is empty", () => {
    render(
      <BudgetCategories
        isOwner={true}
        categories={[]}
        onDelete={vi.fn()}
        groupId="g1"
        members={[]}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("No categories yet")).toBeInTheDocument();
  });
});
