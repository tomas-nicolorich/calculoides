// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createQueryClient } from "../../lib/query-client";
import { useCategoriesList } from "./categories";

/**
 * ADR-2: hoisted from `app/(app)/dashboard/[groupId]/queries.ts`. Genuine
 * RED before this file existed — module not found.
 */
describe("useCategoriesList", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("fetches /api/categories for the given group and returns the parsed body", async () => {
    const fixture = [{ id: "cat-1", name: "Groceries" }];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(fixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={createQueryClient()}>
          {children}
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useCategoriesList("group-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(fixture);
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/categories?groupId=group-1");
  });
});
