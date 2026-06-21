import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BudgetCategories } from "./BudgetCategories";
import type { CategoryWithBalances } from "../../../../../shared/src/types/redesign";

vi.mock("../../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

const members = [
  { id: "m1", name: "Alice", income: 3000, share: 100, index: 0 },
];

function makeCategory(
  overrides: Partial<CategoryWithBalances> = {},
): CategoryWithBalances {
  return {
    id: "cat-1",
    name: "Rent",
    monthlyBudget: 1000,
    icon: "rent",
    balances: [],
    ...overrides,
  };
}

function renderWidget(categories: CategoryWithBalances[]) {
  return render(
    <BudgetCategories
      categories={categories}
      isOwner
      onDelete={vi.fn()}
      groupId="group-1"
      members={members}
      onRefresh={vi.fn()}
    />,
  );
}

describe("BudgetCategories category icon tile", () => {
  it("renders a violet tile for a known icon key", () => {
    renderWidget([makeCategory({ icon: "rent" })]);
    const tile = screen.getByRole("img", { name: "rent" });
    expect(tile).toBeInTheDocument();
    expect(tile.className).toContain("bg-brand-category/10");
    expect(tile.className).toContain("text-brand-category");
    expect(tile.querySelector("svg")).toBeInTheDocument();
  });

  it("renders the Folder fallback (labelled 'other') for an unknown/legacy icon", () => {
    renderWidget([makeCategory({ id: "cat-2", name: "Legacy", icon: "💰" })]);
    const tile = screen.getByRole("img", { name: "other" });
    expect(tile).toBeInTheDocument();
    expect(tile.querySelector("svg")).toBeInTheDocument();
  });
});

describe("BudgetCategories urgency pill (ADR 0007 thresholds)", () => {
  it("shows an on-track pill at 79% spend", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 1000, spent: 790, remainingQuota: 210 },
        ],
      }),
    ]);
    expect(screen.getByText("79%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-state",
      "on-track",
    );
  });

  it("shows a behind pill at the 80% boundary", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 1000, spent: 800, remainingQuota: 200 },
        ],
      }),
    ]);
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-state",
      "behind",
    );
  });

  it("shows a blocked pill above 100% spend", () => {
    renderWidget([
      makeCategory({
        monthlyBudget: 1000,
        balances: [
          { memberId: "m1", quota: 1000, spent: 1010, remainingQuota: -10 },
        ],
      }),
    ]);
    expect(screen.getByText("101%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-state",
      "blocked",
    );
  });
});
