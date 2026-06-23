import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BudgetCategories,
  MemberRich,
} from "@/widgets/dashboard/ui/BudgetCategories";
import { describe, it, expect, vi } from "vitest";
import { CategoryWithBalances } from "../../../shared/src/types/redesign";

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

vi.mock("@/shared/ui/ResponsiveDialog", () => ({
  ResponsiveDialog: ({
    children,
    open,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    title: string;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

vi.mock("@/shared/api/client", () => ({
  apiClient: { fetch: vi.fn().mockResolvedValue(undefined) },
}));

const defaultMembers: MemberRich[] = [
  { id: "m1", name: "Alice", income: 3000, share: 60, index: 0 },
  { id: "m2", name: "Bob", income: 2000, share: 40, index: 1 },
];

const categoryWithBalances: CategoryWithBalances = {
  id: "cat-1",
  name: "Food",
  monthlyBudget: 500,
  icon: "🍔",
  balances: [
    { memberId: "m1", quota: 300, spent: 100, remainingQuota: 200 },
    { memberId: "m2", quota: 200, spent: 80, remainingQuota: 120 },
  ],
};

function renderWidget(
  overrides: Partial<React.ComponentProps<typeof BudgetCategories>> = {},
) {
  return render(
    <BudgetCategories
      isOwner={true}
      categories={[categoryWithBalances]}
      onDelete={vi.fn()}
      groupId="g1"
      members={defaultMembers}
      onRefresh={vi.fn()}
      {...overrides}
    />,
  );
}

describe("BudgetCategories Widget — accordion", () => {
  it("renders category headers collapsed by default (member rows not visible)", () => {
    renderWidget();

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("expanding a category reveals its per-member rows", async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByRole("button", { name: /food/i }));

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows Category Member Share % for all-members category", async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByRole("button", { name: /food/i }));

    expect(screen.getByText("(60%)")).toBeInTheDocument();
    expect(screen.getByText("(40%)")).toBeInTheDocument();
  });

  it("shows re-normalised shares for a Member Subset category", async () => {
    const user = userEvent.setup();
    renderWidget({
      categories: [
        {
          ...categoryWithBalances,
          id: "cat-2",
          balances: [
            { memberId: "m1", quota: 300, spent: 100, remainingQuota: 200 },
          ],
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /food/i }));

    expect(screen.getByText("(100%)")).toBeInTheDocument();
  });

  it("shows Edit and Delete in expanded body when owner", async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByRole("button", { name: /food/i }));

    expect(
      screen.getByRole("button", { name: /edit category/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete category/i }),
    ).toBeInTheDocument();
  });

  it("hides Delete in expanded body when not owner", async () => {
    const user = userEvent.setup();
    renderWidget({ isOwner: false });

    await user.click(screen.getByRole("button", { name: /food/i }));

    expect(
      screen.queryByRole("button", { name: /delete category/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit category/i }),
    ).toBeInTheDocument();
  });

  it("transfer trigger opens the Transfer dialog pre-filled with source member", async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByRole("button", { name: /food/i }));
    const transferBtn = screen.getAllByTitle("Initiate Transfer")[0];
    await user.click(transferBtn);

    expect(
      screen.getByRole("dialog", { name: /transfer budget/i }),
    ).toBeInTheDocument();
  });

  it("shows empty state when there are no categories", () => {
    renderWidget({ categories: [] });

    expect(screen.getByText("No categories yet")).toBeInTheDocument();
  });

  it("panel header button is labelled 'New Category'", () => {
    renderWidget({ categories: [] });

    expect(
      screen.getByRole("button", { name: /new category/i }),
    ).toBeInTheDocument();
  });

  it("overspent member shows 'over' label", async () => {
    const user = userEvent.setup();
    renderWidget({
      categories: [
        {
          ...categoryWithBalances,
          id: "cat-3",
          balances: [
            { memberId: "m1", quota: 100, spent: 150, remainingQuota: -50 },
            { memberId: "m2", quota: 200, spent: 80, remainingQuota: 120 },
          ],
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /food/i }));

    expect(screen.getByText(/over$/)).toBeInTheDocument();
    expect(screen.getByText(/left$/)).toBeInTheDocument();
  });
});
