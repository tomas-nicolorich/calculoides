import { render, screen } from "@testing-library/react";
import { BudgetTransfers } from "@/widgets/dashboard/ui/BudgetTransfers";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/shared/ui/Card");

describe("BudgetTransfers Widget", () => {
  const mockTransfers = [
    {
      id: "t1",
      categoryName: "Groceries",
      fromMemberName: "Alice",
      fromMemberId: "m1",
      toMemberName: "Bob",
      toMemberId: "m2",
      amount: 150.0,
      date: "2026-06-01",
    },
    {
      id: "t2",
      categoryName: "Utilities",
      fromMemberName: "Bob",
      fromMemberId: "m2",
      toMemberName: "Charlie",
      toMemberId: "m3",
      amount: 80.0,
      date: "2026-06-02",
    },
  ];

  const mockMembers = [
    { id: "m1", name: "Alice", colorIndex: 0 },
    { id: "m2", name: "Bob", colorIndex: 1 },
    { id: "m3", name: "Charlie", colorIndex: 2 },
  ];

  it("renders the card title", () => {
    render(
      <MemoryRouter>
        <BudgetTransfers transfers={mockTransfers} members={mockMembers} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Budget Transfers")).toBeInTheDocument();
  });

  it("renders transfer category names", () => {
    render(
      <MemoryRouter>
        <BudgetTransfers transfers={mockTransfers} members={mockMembers} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Utilities")).toBeInTheDocument();
  });

  it("shows empty state when transfers is empty", () => {
    render(
      <MemoryRouter>
        <BudgetTransfers transfers={[]} members={mockMembers} />
      </MemoryRouter>,
    );

    expect(screen.getByText("No recent transfers")).toBeInTheDocument();
  });

  it("transfer item rows have class bg-slate-50", () => {
    render(
      <MemoryRouter>
        <BudgetTransfers transfers={mockTransfers} members={mockMembers} />
      </MemoryRouter>,
    );

    const rows = screen.getAllByTestId("transfer-row");
    expect(rows.length).toBe(2);
    rows.forEach((row) => {
      expect(row).toHaveClass("bg-slate-50");
    });
  });

  it("transfer item rows have border-l-2 class", () => {
    render(
      <MemoryRouter>
        <BudgetTransfers transfers={mockTransfers} members={mockMembers} />
      </MemoryRouter>,
    );

    const rows = screen.getAllByTestId("transfer-row");
    rows.forEach((row) => {
      expect(row).toHaveClass("border-l-2");
    });
  });
});
