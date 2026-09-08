// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Badge } from "./Badge";

/**
 * `main`'s `BadgeTone` union is `income | balance | expense | transfer |
 * category | neutral` — the full five-variant money vocabulary plus
 * `neutral`, so this suite asserts all five per spec scenario "A
 * transfer-related badge uses the transfer variant".
 */
describe("Badge", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses the income variant's brand color token", () => {
    render(<Badge tone="income">Income</Badge>);
    expect(screen.getByText("Income")).toHaveClass("text-brand-income");
  });

  it("uses the balance variant's brand color token", () => {
    render(<Badge tone="balance">Balance</Badge>);
    expect(screen.getByText("Balance")).toHaveClass("text-brand-balance");
  });

  it("uses the expense variant's brand color token", () => {
    render(<Badge tone="expense">Expense</Badge>);
    expect(screen.getByText("Expense")).toHaveClass("text-brand-expense");
  });

  it("uses the transfer variant's brand color token for a transfer status badge", () => {
    render(<Badge tone="transfer">Transfer</Badge>);
    expect(screen.getByText("Transfer")).toHaveClass("text-brand-transfer");
  });

  it("uses the category variant's brand color token", () => {
    render(<Badge tone="category">Category</Badge>);
    expect(screen.getByText("Category")).toHaveClass("text-brand-category");
  });

  it("defaults to the neutral tone", () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText("Status")).toHaveClass("bg-slate-100");
  });

  it("renders a leading dot when dot is true", () => {
    const { container } = render(<Badge dot>Active</Badge>);
    expect(container.querySelector(".bg-current")).toBeInTheDocument();
  });
});
