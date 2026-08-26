// @vitest-environment jsdom
import { Suspense, use } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../../../lib/query-client";
import type { BudgetService } from "../../../../lib/server/services/budget";
import type { SavingsService } from "../../../../lib/server/services/savings";
import { SummaryRegion, CategoriesRegion, SavingsWarmRegion } from "./_regions";

/**
 * design.md Decision 4 / Testing Strategy: each region is an `async`
 * Server Component. RTL's client renderer cannot render an unresolved
 * async component as JSX (that capability belongs to the RSC render
 * pipeline, not `ReactDOM`), so every test here calls the region function
 * directly and `await`s its resolved output before handing it to
 * `render()` — matching `page.test.tsx`'s own `await DashboardPage(...)`
 * convention. Genuine RED before this module existed — import not found.
 */

const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "user-1";

const SUMMARY_FIXTURE = {
  groupName: "Roomies",
  ownerId: USER_ID,
  totalIncome: 4000,
  totalBudget: 400,
  totalSpent: 120,
  members: [],
  recentExpenses: [],
  recentTransfers: [],
};

const CATEGORIES_FIXTURE: Awaited<
  ReturnType<typeof BudgetService.listCategoriesWithBalances>
> = [];
const SAVINGS_FIXTURE: Awaited<
  ReturnType<typeof SavingsService.getGoalsForGroup>
> = [];

function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** A plain Client Component (not an async Server Component) that suspends
 * forever via React 19's `use()` — the client-renderer-safe way to prove a
 * sibling/nested boundary never blocks an already-resolved region. */
function NeverResolves() {
  use(new Promise<never>(() => undefined));
  return null;
}

describe("_regions", () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // dashboard-view: "Loading state precedes hydration, per independent
  // region" — the summary region paints from its own resolved promise
  // without waiting on a nested subtree that never resolves.
  it("paints summary widgets even while the nested categories subtree never resolves", async () => {
    const result = await SummaryRegion({
      groupId: GROUP_ID,
      currentUserId: USER_ID,
      summaryPromise: Promise.resolve(SUMMARY_FIXTURE),
      children: (
        <Suspense fallback={<div data-testid="categories-fallback" />}>
          <NeverResolves />
        </Suspense>
      ),
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        {result}
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Roomies")).toBeInTheDocument();
    expect(screen.getByText("Remaining Balance")).toBeInTheDocument();
    expect(screen.getByTestId("categories-fallback")).toBeInTheDocument();
  });

  // client-data-cache: "A per-region streamed read is still Server-
  // Component-owned" — ports the former `page.test.tsx` fetchMock
  // assertion onto the awaited, nested region output now that the
  // prefetch is split across two independently streamed regions.
  it("renders the full widget tree from the two regions' server prefetch with no client-side fetch", async () => {
    const categoriesResult = await CategoriesRegion({
      groupId: GROUP_ID,
      currentUserId: USER_ID,
      categoriesPromise: Promise.resolve(CATEGORIES_FIXTURE),
    });
    const summaryResult = await SummaryRegion({
      groupId: GROUP_ID,
      currentUserId: USER_ID,
      summaryPromise: Promise.resolve(SUMMARY_FIXTURE),
      children: categoriesResult,
    });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <QueryClientProvider client={createQueryClient()}>
        {summaryResult}
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Roomies")).toBeInTheDocument();
    expect(await screen.findByText("Remaining Balance")).toBeInTheDocument();
    expect(await screen.findByText("Recent Expenses")).toBeInTheDocument();
    expect(await screen.findByText("Budget Categories")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Decision 3 — savingsGoals is an invisible, non-blocking warm-up region:
  // it dehydrates its query key but renders no visible DOM.
  it("dehydrates savingsGoals and renders nothing visible", async () => {
    const result = await SavingsWarmRegion({
      groupId: GROUP_ID,
      savingsPromise: Promise.resolve(SAVINGS_FIXTURE),
    });

    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        {result}
      </QueryClientProvider>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
