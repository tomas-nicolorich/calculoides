// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { createQueryClient } from "../../../../../lib/query-client";
import { queryKeys } from "../../../../../lib/query-keys";
import { BudgetCategories } from "./BudgetCategories";

const GROUP_ID = "33333333-3333-4333-8333-333333333333";

const MEMBERS_FIXTURE = [
  {
    id: "m1",
    userId: "u1",
    name: "Alice Smith",
    income: 3000,
    share: 60,
    spent: 700,
    remainingQuota: 800,
    budgeted: 1500,
  },
  {
    id: "m2",
    userId: "u2",
    name: "Bob Jones",
    income: 2000,
    share: 40,
    spent: 500,
    remainingQuota: 500,
    budgeted: 1000,
  },
];

const SUMMARY_FIXTURE = {
  groupName: "Roomies",
  ownerId: "user-1",
  totalIncome: 5000,
  totalBudget: 2500,
  totalSpent: 1200,
  members: MEMBERS_FIXTURE,
  recentExpenses: [],
  recentTransfers: [],
};

interface CategoryFixtureBalance {
  memberId: string;
  quota: number;
  spent: number;
  percentage: number;
  remainingQuota: number;
  excluded?: boolean;
}

interface CategoryFixture {
  id: string;
  name: string;
  monthlyBudget: number;
  icon?: string;
  isEmpty?: boolean;
  balances: CategoryFixtureBalance[];
}

const RENT_CATEGORY: CategoryFixture = {
  id: "c1",
  name: "Rent",
  monthlyBudget: 1000,
  balances: [
    {
      memberId: "m1",
      quota: 600,
      spent: 240,
      percentage: 60,
      remainingQuota: 360,
    },
    {
      memberId: "m2",
      quota: 400,
      spent: 450,
      percentage: 40,
      remainingQuota: -50,
    },
  ],
};

/** Mirrors `BudgetTransfers.test.tsx`'s hydration helper — hydrates both
 * `queryKeys.summary` (member name/avatar resolution) and
 * `queryKeys.categories` (this widget's own query) so mounting never issues
 * its own client fetch. */
async function renderHydrated(
  categories: CategoryFixture[] | null,
  summary: typeof SUMMARY_FIXTURE | null = SUMMARY_FIXTURE,
) {
  const serverClient = new QueryClient();
  if (summary !== null) {
    await serverClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve(summary),
    });
  }
  if (categories !== null) {
    await serverClient.prefetchQuery({
      queryKey: queryKeys.categories(GROUP_ID),
      queryFn: () => Promise.resolve(categories),
    });
  }
  const dehydratedState = dehydrate(serverClient);
  const browserClient = createQueryClient();
  render(
    <QueryClientProvider client={browserClient}>
      <HydrationBoundary state={dehydratedState}>
        <BudgetCategories groupId={GROUP_ID} />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
  return browserClient;
}

type FetchMock = ReturnType<typeof vi.fn<(input: string) => Promise<Response>>>;

describe("BudgetCategories", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn<(input: string) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // dashboard-view: "Loading state precedes hydration" — this widget shows
  // its own loading state independent of the other five widgets.
  it("shows a loading state before the categories query resolves", () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <BudgetCategories groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(
      screen.getByTestId("budget-categories-loading"),
    ).toBeInTheDocument();
  });

  it("shows an error state when the categories query fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    render(
      <QueryClientProvider
        client={createQueryClient({ queries: { retry: false } })}
      >
        <BudgetCategories groupId={GROUP_ID} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/failed to load budget categories/i),
    ).toBeInTheDocument();
  });

  // dashboard-view: "Zero categories renders an empty state, not an error".
  it("shows an empty state (not an error) when there are no categories", async () => {
    await renderHydrated([]);

    expect(await screen.findByText("No categories yet")).toBeInTheDocument();
  });

  it("renders each category's name and budgeted amount from the hydrated cache without a client fetch", async () => {
    await renderHydrated([RENT_CATEGORY]);

    expect(await screen.findByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("€1,000.00")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ui-design-system: "Category progress renders via ProgressMeter" — first
  // real consumer of the header-row urgency meter.
  it("shows a header ProgressMeter with a '<n>% spent' label from total spend / budget", async () => {
    await renderHydrated([RENT_CATEGORY]);

    // totalSpent = 240 + 450 = 690, budget = 1000 -> 69% spent (on-track, <80%)
    expect(await screen.findByText("69% spent")).toBeInTheDocument();
    const bars = screen.getAllByRole("progressbar");
    expect(bars[0]).toHaveAttribute("data-state", "on-track");
  });

  // dashboard-view: "Expanding a category row shows per-member balances".
  it("collapses category rows by default, with no member balances visible", async () => {
    await renderHydrated([RENT_CATEGORY]);
    await screen.findByText("Rent");

    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /rent/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("expanding a category row shows per-member balance rows beneath it", async () => {
    await renderHydrated([RENT_CATEGORY]);
    await screen.findByText("Rent");

    fireEvent.click(screen.getByRole("button", { name: /rent/i }));

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rent/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("collapsing an expanded row hides the per-member balance rows again", async () => {
    await renderHydrated([RENT_CATEGORY]);
    await screen.findByText("Rent");

    const toggle = screen.getByRole("button", { name: /rent/i });
    fireEvent.click(toggle);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
  });

  it("shows 'x left' for a member under quota and 'x over' for a member over quota", async () => {
    await renderHydrated([RENT_CATEGORY]);
    fireEvent.click(await screen.findByRole("button", { name: /rent/i }));

    // Alice: remainingQuota 360 -> "left"
    expect(screen.getByText(/€360\.00 left/)).toBeInTheDocument();
    // Bob: remainingQuota -50 -> "over"
    expect(screen.getByText(/€50\.00 over/)).toBeInTheDocument();
  });

  it("falls back to the balance's memberId when member names have not hydrated yet", async () => {
    await renderHydrated([RENT_CATEGORY], null);
    fireEvent.click(await screen.findByRole("button", { name: /rent/i }));

    expect(screen.getByText(/^m1/)).toBeInTheDocument();
  });

  it("renders a greyed, struck-through row for an excluded (zero-income) member", async () => {
    const category: CategoryFixture = {
      ...RENT_CATEGORY,
      isEmpty: false,
      balances: [
        {
          memberId: "m1",
          quota: 1000,
          spent: 0,
          percentage: 100,
          remainingQuota: 1000,
          excluded: false,
        },
        {
          memberId: "m2",
          quota: 0,
          spent: 0,
          percentage: 0,
          remainingQuota: 0,
          excluded: true,
        },
      ],
    };
    await renderHydrated([category]);
    fireEvent.click(await screen.findByRole("button", { name: /rent/i }));

    const bob = screen.getByText("Bob Jones");
    expect(bob.className).toContain("line-through");
    expect(screen.getByText("No income — not included")).toBeInTheDocument();
  });

  it("shows an empty-allocation message when every member is excluded", async () => {
    const category: CategoryFixture = {
      ...RENT_CATEGORY,
      isEmpty: true,
      balances: [
        {
          memberId: "m1",
          quota: 0,
          spent: 0,
          percentage: 0,
          remainingQuota: 0,
          excluded: true,
        },
        {
          memberId: "m2",
          quota: 0,
          spent: 0,
          percentage: 0,
          remainingQuota: 0,
          excluded: true,
        },
      ],
    };
    await renderHydrated([category]);
    fireEvent.click(await screen.findByRole("button", { name: /rent/i }));

    expect(
      screen.getByText("No members with income in this category"),
    ).toBeInTheDocument();
  });
});
