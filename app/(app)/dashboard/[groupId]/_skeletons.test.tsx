// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  IncomeOverviewSkeleton,
  RemainingBalanceSkeleton,
  RecentExpensesSkeleton,
  BudgetTransfersSkeleton,
  BudgetCategoriesSkeleton,
  SummaryColumnSkeleton,
  CategoriesColumnSkeleton,
  DashboardSkeleton,
} from "./_skeletons";

/**
 * task 1.6. `DashboardSkeleton` MUST reproduce `DashboardClient`'s exact
 * container chain (design.md Interfaces/Contracts) so the `loading.tsx` ->
 * shell -> region hand-offs cause no layout shift (ADR-0003, ADR-0007). Each
 * leaf skeleton MUST render `animate-pulse` placeholder nodes, not text.
 */
describe("_skeletons", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    ["IncomeOverviewSkeleton", IncomeOverviewSkeleton],
    ["RemainingBalanceSkeleton", RemainingBalanceSkeleton],
    ["RecentExpensesSkeleton", RecentExpensesSkeleton],
    ["BudgetTransfersSkeleton", BudgetTransfersSkeleton],
    ["BudgetCategoriesSkeleton", BudgetCategoriesSkeleton],
  ] as const)("%s renders at least one animate-pulse node", (_name, Comp) => {
    const { container } = render(<Comp />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("SummaryColumnSkeleton composes the four left-column widget skeletons", () => {
    render(<SummaryColumnSkeleton />);

    expect(screen.getAllByTestId(/-skeleton$/).length).toBe(4);
  });

  it("CategoriesColumnSkeleton composes the right-column BudgetCategoriesSkeleton", () => {
    render(<CategoriesColumnSkeleton />);

    expect(screen.getByTestId("budget-categories-skeleton")).toBeInTheDocument();
  });

  it("DashboardSkeleton reproduces DashboardClient's exact container chain", () => {
    const { container } = render(<DashboardSkeleton />);

    const root = container.firstElementChild;
    expect(root).toHaveClass(
      "p-4",
      "md:p-8",
      "max-w-7xl",
      "mx-auto",
      "space-y-8",
    );

    const grid = screen.getByTestId("dashboard-skeleton-grid");
    expect(grid).toHaveClass(
      "grid",
      "grid-cols-1",
      "lg:grid-cols-2",
      "3xl:grid-cols-3",
      "gap-6",
      "items-start",
    );

    const left = screen.getByTestId("dashboard-skeleton-left");
    expect(left).toHaveClass(
      "flex",
      "flex-col",
      "gap-6",
      "3xl:col-span-2",
      "3xl:grid",
      "3xl:grid-cols-2",
    );

    const right = screen.getByTestId("dashboard-skeleton-right");
    expect(right).toHaveClass("flex", "flex-col", "gap-6");
  });

  it("DashboardSkeleton composes SummaryColumnSkeleton and CategoriesColumnSkeleton", () => {
    render(<DashboardSkeleton />);

    expect(screen.getAllByTestId(/-skeleton$/).length).toBe(5);
  });
});
