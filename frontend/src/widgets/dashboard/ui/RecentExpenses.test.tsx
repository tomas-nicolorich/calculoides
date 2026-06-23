import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { RecentExpenses } from "./RecentExpenses";
import { RecentExpense } from "../../../../../shared/src/types/redesign";

const members = [
  { id: "m1", name: "Alice Smith", colorIndex: 0 },
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
    payerName: "Alice Smith",
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
  it("renders a red expense marker (Receipt icon) for each row", () => {
    renderList();
    expect(screen.getAllByTestId("expense-marker")).toHaveLength(1);
  });

  it("renders the payer avatar initial resolved from payerId", () => {
    renderList();
    // Alice (m1) avatar initial — first character of "Alice Smith".
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders payer first name and category name inline on the sub-line", () => {
    renderList();
    // The sub-line <p> contains avatar initial + first name + dot + category.
    const subLine = screen.getByText("Alice").closest("p");
    expect(subLine).toBeInTheDocument();
    expect(subLine?.textContent).toContain("Alice");
    expect(subLine?.textContent).toContain("·");
    expect(subLine?.textContent).toContain("Groceries");
  });

  it("renders only the payer first name, not the full name, on the sub-line", () => {
    renderList();
    // "Alice Smith" → sub-line shows "Alice", not "Alice Smith"
    const subLine = screen.getByText("Alice").closest("p");
    expect(subLine?.textContent).not.toContain("Alice Smith");
  });

  it("does not render a category Badge/pill", () => {
    renderList();
    // Badge renders as a <span> with role not implied — ensure no Badge wrapper for Groceries.
    // There should be no element with the badge tone class around the category name.
    const groceriesElements = screen.getAllByText("Groceries");
    groceriesElements.forEach((el) => {
      // Badge wraps in a span; the category name here must be a plain span inside a <p>
      expect(el.tagName.toLowerCase()).toBe("span");
      expect(el.closest("p")).not.toBeNull();
    });
  });

  it("colours the payer avatar by its stable colorIndex, not array position", () => {
    renderList({
      members: [{ id: "m1", name: "Alice Smith", colorIndex: 2 }],
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

  it("renders the card title as 'Recent Expenses'", () => {
    renderList();
    expect(screen.getByText("Recent Expenses")).toBeInTheDocument();
  });

  it("renders the 'Latest 5 spends' header label", () => {
    renderList();
    expect(screen.getByText("Latest 5 spends")).toBeInTheDocument();
  });

  it("renders a 'View All' link to the expenses page", () => {
    renderList();
    const link = screen.getByRole("link", { name: "View All" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/expenses/g1");
  });
});
