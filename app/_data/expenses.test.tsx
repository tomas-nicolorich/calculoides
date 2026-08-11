// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createQueryClient } from "../../lib/query-client";
import { queryKeys } from "../../lib/query-keys";
import { useExpensesList, useCreateExpense } from "./expenses";

vi.mock("../../lib/actions/expense", () => ({
  create: vi.fn().mockResolvedValue({ ok: true, data: { id: "expense-1" } }),
  deleteExpense: vi.fn(),
  deleteAll: vi.fn(),
}));

const GROUP_ID = "group-1";

/**
 * ADR-2: hoisted from `app/(app)/expenses/[groupId]/queries.ts`. Genuine RED
 * before this file existed — module not found.
 */
describe("app/_data/expenses", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("useExpensesList fetches /api/expenses for the given group", async () => {
    const fixture = { expenses: [], pagination: {} };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = createQueryClient();

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useExpensesList(GROUP_ID), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(fixture);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/expenses?groupId=group-1"),
    );
  });

  it("useCreateExpense invalidates the group's cache on success", async () => {
    const queryClient = createQueryClient();
    await queryClient.prefetchQuery({
      queryKey: queryKeys.summary(GROUP_ID),
      queryFn: () => Promise.resolve({ groupName: "Roomies" }),
    });

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useCreateExpense(GROUP_ID), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        categoryId: "cat-1",
        description: "Milk",
        amount: 5,
        date: "2026-08-11",
      });
    });

    expect(
      queryClient.getQueryState(queryKeys.summary(GROUP_ID))?.isInvalidated,
    ).toBe(true);
  });
});
