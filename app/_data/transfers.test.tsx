// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createQueryClient } from "../../lib/query-client";
import { queryKeys } from "../../lib/query-keys";
import { useTransfersList, useCreateTransfer } from "./transfers";

vi.mock("../../lib/actions/transfer", () => ({
  createTransfer: vi.fn().mockResolvedValue({
    ok: true,
    data: { id: "transfer-1" },
  }),
  deleteTransfer: vi.fn(),
  deleteAll: vi.fn(),
}));

const GROUP_ID = "group-1";

/**
 * ADR-2: hoisted from `app/(app)/transfers/[groupId]/queries.ts`. Genuine
 * RED before this file existed — module not found.
 */
describe("app/_data/transfers", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("useTransfersList fetches /api/transfers for the given group", async () => {
    const fixture = { transfers: [], pagination: {} };
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

    const { result } = renderHook(() => useTransfersList(GROUP_ID), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(fixture);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/transfers?groupId=group-1"),
    );
  });

  it("useCreateTransfer invalidates the group's cache on success", async () => {
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

    const { result } = renderHook(() => useCreateTransfer(GROUP_ID), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        categoryId: "cat-1",
        fromMemberId: "member-1",
        toMemberId: "member-2",
        amount: 5,
      });
    });

    expect(
      queryClient.getQueryState(queryKeys.summary(GROUP_ID))?.isInvalidated,
    ).toBe(true);
  });
});
