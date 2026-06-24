import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { BudgetTransfers } from "./BudgetTransfers";

const members = [
  { id: "m1", name: "Alice", colorIndex: 0 },
  { id: "m2", name: "Bob", colorIndex: 1 },
];

const transfers = [
  {
    id: "t1",
    categoryName: "Groceries",
    fromMemberName: "Alice",
    fromMemberId: "m1",
    toMemberName: "Bob",
    toMemberId: "m2",
    amount: 50,
    date: "2026-06-20T00:00:00.000Z",
  },
];

function renderList(props?: Partial<Parameters<typeof BudgetTransfers>[0]>) {
  return render(
    <MemoryRouter>
      <BudgetTransfers transfers={transfers} members={members} {...props} />
    </MemoryRouter>,
  );
}

describe("BudgetTransfers", () => {
  it("renders the card title and widget header label", () => {
    renderList();
    expect(screen.getByText("Budget Transfers")).toBeInTheDocument();
    expect(screen.getByText("Money moved between members")).toBeInTheDocument();
  });

  it("renders category name and formatted amount for a transfer", () => {
    renderList();
    const row = screen.getByTestId("transfer-row");
    expect(within(row).getByText("Groceries")).toBeInTheDocument();
    // Amount is rendered via formatCurrency — just verify it is present.
    expect(within(row).getByText(/50/)).toBeInTheDocument();
  });

  it("renders both the from-avatar and to-avatar initials resolved from ids", () => {
    renderList();
    const row = screen.getByTestId("transfer-row");
    // Alice (from) and Bob (to) avatar initials.
    expect(within(row).getByText("AL")).toBeInTheDocument();
    expect(within(row).getByText("BO")).toBeInTheDocument();
  });

  it("renders from and to member first names in the sub-line", () => {
    renderList();
    const row = screen.getByTestId("transfer-row");
    expect(within(row).getByText("Alice")).toBeInTheDocument();
    expect(within(row).getByText("Bob")).toBeInTheDocument();
  });

  it("colours each avatar by its stable colorIndex", () => {
    renderList({
      members: [
        { id: "m1", name: "Alice", colorIndex: 2 },
        { id: "m2", name: "Bob", colorIndex: 4 },
      ],
    });
    const row = screen.getByTestId("transfer-row");
    expect(within(row).getByText("AL")).toHaveStyle({
      background: "var(--color-member-3)",
    });
    expect(within(row).getByText("BO")).toHaveStyle({
      background: "var(--color-member-5)",
    });
  });

  it("falls back to the member name fields when ids are unknown", () => {
    renderList({ members: [] });
    const row = screen.getByTestId("transfer-row");
    expect(within(row).getByText("AL")).toBeInTheDocument();
    expect(within(row).getByText("BO")).toBeInTheDocument();
  });

  it("renders an empty state when there are no transfers", () => {
    renderList({ transfers: [] });
    expect(screen.getByText("No recent transfers")).toBeInTheDocument();
  });

  it("renders a View All link pointing to /transfers", () => {
    renderList();
    const link = screen.getByRole("link", { name: "View All" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/transfers");
  });

  it("transfer row does not have a border class", () => {
    renderList();
    const row = screen.getByTestId("transfer-row");
    expect(row.className).not.toContain("border-slate-200");
  });
});
