import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  useDashboardSummary,
  useCategoriesList,
  useExpensesList,
  useTransfersList,
} from "./dashboardHooks";
import { createTestQueryClient, QueryWrapper } from "../../test/queryTestUtils";
import type {
  DashboardSummary,
  CategoryWithBalances,
  ExpensesList,
  TransfersList,
} from "../../../../shared/src/types/redesign";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch:
    vi.fn<(endpoint: string, options?: RequestInit) => Promise<unknown>>(),
}));

vi.mock("./client", () => ({
  apiClient: { fetch: mockFetch },
}));

/** A client with a real (non-zero) staleTime, for cache-hit-on-remount cases. */
function createCacheableTestClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}

function renderWithClient<TProps, TResult>(
  callback: (props: TProps) => TResult,
  initialProps: TProps,
  client: QueryClient = createTestQueryClient(),
) {
  const utils = renderHook(callback, {
    initialProps,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryWrapper, { client, children }),
  });
  return { ...utils, client };
}

const summaryFixture = { groupName: "g" } as unknown as DashboardSummary;
const categoriesFixture = [{ id: "c1" }] as unknown as CategoryWithBalances[];

beforeEach(() => {
  mockFetch.mockReset();
});

describe("useDashboardSummary", () => {
  it("stays disabled (not loading, no fetch) when groupId is null", () => {
    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useDashboardSummary(groupId),
      { groupId: null },
    );

    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches /summary?groupId= on first load and returns the data", async () => {
    mockFetch.mockResolvedValue(summaryFixture);

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useDashboardSummary(groupId),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(summaryFixture);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/summary?groupId=g1");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("surfaces a fetch failure as a string error", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useDashboardSummary(groupId),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.error).toBe("network down");
    });
  });

  it("serves cache on remount within the staleness window (no second fetch)", async () => {
    mockFetch.mockResolvedValue(summaryFixture);
    const client = createCacheableTestClient();

    const first = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useDashboardSummary(groupId),
      { groupId: "g1" },
      client,
    );
    await waitFor(() => {
      expect(first.result.current.data).toEqual(summaryFixture);
    });
    first.unmount();

    const second = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useDashboardSummary(groupId),
      { groupId: "g1" },
      client,
    );

    expect(second.result.current.data).toEqual(summaryFixture);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("refresh() triggers a second fetch", async () => {
    mockFetch.mockResolvedValue(summaryFixture);

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useDashboardSummary(groupId),
      { groupId: "g1" },
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    result.current.refresh();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe("useCategoriesList", () => {
  it("stays disabled (not loading, no fetch) when groupId is null", () => {
    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useCategoriesList(groupId),
      { groupId: null },
    );

    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches /categories?groupId= on first load and returns the data", async () => {
    mockFetch.mockResolvedValue(categoriesFixture);

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useCategoriesList(groupId),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(categoriesFixture);
    });
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/categories?groupId=g1");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("surfaces a fetch failure as a string error", async () => {
    mockFetch.mockRejectedValue(new Error("boom"));

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useCategoriesList(groupId),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.error).toBe("boom");
    });
  });

  it("serves cache on remount within the staleness window (no second fetch)", async () => {
    mockFetch.mockResolvedValue(categoriesFixture);
    const client = createCacheableTestClient();

    const first = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useCategoriesList(groupId),
      { groupId: "g1" },
      client,
    );
    await waitFor(() => {
      expect(first.result.current.data).toEqual(categoriesFixture);
    });
    first.unmount();

    const second = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useCategoriesList(groupId),
      { groupId: "g1" },
      client,
    );

    expect(second.result.current.data).toEqual(categoriesFixture);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("refresh() triggers a second fetch", async () => {
    mockFetch.mockResolvedValue(categoriesFixture);

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useCategoriesList(groupId),
      { groupId: "g1" },
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    result.current.refresh();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

function makeExpensesPage(id: string, total: number): ExpensesList {
  return {
    expenses: [{ id, description: id, amount: 1 }],
    pagination: { total },
  } as unknown as ExpensesList;
}

describe("useExpensesList", () => {
  it("stays disabled (not loading, no fetch) when groupId is null", () => {
    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useExpensesList(groupId),
      { groupId: null },
    );

    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches /expenses?... on first load and returns the data", async () => {
    const page = makeExpensesPage("e1", 1);
    mockFetch.mockResolvedValue(page);

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) =>
        useExpensesList(groupId, "cat1", "mem1", 20, 0),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(page);
    });
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/expenses?");
    expect(url).toContain("groupId=g1");
    expect(url).toContain("categoryId=cat1");
    expect(url).toContain("memberId=mem1");
  });

  it("surfaces a fetch failure as a string error", async () => {
    mockFetch.mockRejectedValue(new Error("expenses failed"));

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useExpensesList(groupId),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.error).toBe("expenses failed");
    });
  });

  it("serves cache on remount within the staleness window (no second fetch)", async () => {
    const page = makeExpensesPage("e1", 1);
    mockFetch.mockResolvedValue(page);
    const client = createCacheableTestClient();

    const first = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useExpensesList(groupId),
      { groupId: "g1" },
      client,
    );
    await waitFor(() => {
      expect(first.result.current.data).toEqual(page);
    });
    first.unmount();

    const second = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useExpensesList(groupId),
      { groupId: "g1" },
      client,
    );

    expect(second.result.current.data).toEqual(page);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("refresh() triggers a second fetch", async () => {
    mockFetch.mockResolvedValue(makeExpensesPage("e1", 1));

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useExpensesList(groupId),
      { groupId: "g1" },
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    result.current.refresh();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps page 1 rows visible (placeholderData) while page 2 loads", async () => {
    const page1 = makeExpensesPage("page1-row", 50);
    const page2 = makeExpensesPage("page2-row", 50);
    mockFetch.mockResolvedValueOnce(page1);

    const client = createTestQueryClient();
    const { result, rerender } = renderWithClient(
      ({ groupId, offset }: { groupId: string | null; offset: number }) =>
        useExpensesList(groupId, undefined, undefined, 20, offset),
      { groupId: "g1", offset: 0 },
      client,
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(page1);
    });

    let resolvePage2!: (value: ExpensesList) => void;
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePage2 = resolve;
        }),
    );

    rerender({ groupId: "g1", offset: 20 });

    // Page 2 is still in-flight, but the page-1 rows must not disappear.
    expect(result.current.data).toEqual(page1);
    expect(result.current.isFetching).toBe(true);

    resolvePage2(page2);

    await waitFor(() => {
      expect(result.current.data).toEqual(page2);
    });
  });
});

function makeTransfersPage(id: string, total: number): TransfersList {
  return {
    transfers: [{ id, categoryName: id, amount: 1 }],
    pagination: { total },
  } as unknown as TransfersList;
}

describe("useTransfersList", () => {
  it("stays disabled (not loading, no fetch) when groupId is null", () => {
    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useTransfersList(groupId),
      { groupId: null },
    );

    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches /transfers?... on first load and returns the data", async () => {
    const page = makeTransfersPage("t1", 1);
    mockFetch.mockResolvedValue(page);

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) =>
        useTransfersList(groupId, "cat1", "mem1", 20, 0),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(page);
    });
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/transfers?");
    expect(url).toContain("groupId=g1");
    expect(url).toContain("categoryId=cat1");
    expect(url).toContain("memberId=mem1");
  });

  it("surfaces a fetch failure as a string error", async () => {
    mockFetch.mockRejectedValue(new Error("transfers failed"));

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useTransfersList(groupId),
      { groupId: "g1" },
    );

    await waitFor(() => {
      expect(result.current.error).toBe("transfers failed");
    });
  });

  it("serves cache on remount within the staleness window (no second fetch)", async () => {
    const page = makeTransfersPage("t1", 1);
    mockFetch.mockResolvedValue(page);
    const client = createCacheableTestClient();

    const first = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useTransfersList(groupId),
      { groupId: "g1" },
      client,
    );
    await waitFor(() => {
      expect(first.result.current.data).toEqual(page);
    });
    first.unmount();

    const second = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useTransfersList(groupId),
      { groupId: "g1" },
      client,
    );

    expect(second.result.current.data).toEqual(page);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("refresh() triggers a second fetch", async () => {
    mockFetch.mockResolvedValue(makeTransfersPage("t1", 1));

    const { result } = renderWithClient(
      ({ groupId }: { groupId: string | null }) => useTransfersList(groupId),
      { groupId: "g1" },
    );
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    result.current.refresh();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps page 1 rows visible (placeholderData) while page 2 loads", async () => {
    const page1 = makeTransfersPage("page1-row", 50);
    const page2 = makeTransfersPage("page2-row", 50);
    mockFetch.mockResolvedValueOnce(page1);

    const client = createTestQueryClient();
    const { result, rerender } = renderWithClient(
      ({ groupId, offset }: { groupId: string | null; offset: number }) =>
        useTransfersList(groupId, undefined, undefined, 20, offset),
      { groupId: "g1", offset: 0 },
      client,
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(page1);
    });

    let resolvePage2!: (value: TransfersList) => void;
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePage2 = resolve;
        }),
    );

    rerender({ groupId: "g1", offset: 20 });

    expect(result.current.data).toEqual(page1);
    expect(result.current.isFetching).toBe(true);

    resolvePage2(page2);

    await waitFor(() => {
      expect(result.current.data).toEqual(page2);
    });
  });
});
