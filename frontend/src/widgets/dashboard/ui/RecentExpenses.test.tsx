import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { RecentExpenses } from "./RecentExpenses";
import { RecentExpense } from "../../../../../shared/src/types/redesign";

const members = [
  { id: "m1", name: "Alice", colorIndex: 0 },
  { id: "m2", name: "Bob", colorIndex: 1 },
];

const categories = [
  { id: "c1", icon: "groceries" },
  { id: "c2", icon: "rent" },
];

const expenses: RecentExpense[] = [
  {
    id: "e1",
    description: "Weekly shop",
    amount: 42.5,
    date: "2026-06-20T00:00:00.000Z",
    categoryName: "Groceries",
    categoryId: "c1",
    payerName: "Alice",
    payerId: "m1",
  },
];

function renderList(props?: Partial<Parameters<typeof RecentExpenses>[0]>) {
  return render(
    <MemoryRouter>
      <RecentExpenses
        expenses={expenses}
        groupId="g1"
        members={members}
        categories={categories}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("RecentExpenses", () => {
  it("renders the payer avatar initial resolved from payerId", () => {
    renderList();
    // Alice (m1) avatar initial.
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders the category name as a tag", () => {
    renderList();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("colours the payer avatar by its stable colorIndex, not array position", () => {
    renderList({
      members: [{ id: "m1", name: "Alice", colorIndex: 2 }],
    });
    expect(screen.getByText("A")).toHaveStyle({
      background: "var(--color-member-3)",
    });
  });

  it("falls back to the payer name field when the id is unknown", () => {
    renderList({ members: [] });
    // Avatar initial still comes from the expense's payerName.
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders an empty state when there are no expenses", () => {
    renderList({ expenses: [] });
    expect(screen.getByText("No recent expenses")).toBeInTheDocument();
  });
});
