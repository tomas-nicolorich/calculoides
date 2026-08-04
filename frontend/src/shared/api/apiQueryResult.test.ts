import { describe, it, expect, vi } from "vitest";
import type { UseQueryResult } from "@tanstack/react-query";
import { toApiQueryResult } from "./apiQueryResult";

function makeQuery<T>(
  overrides: Partial<UseQueryResult<T>>,
): UseQueryResult<T> {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as UseQueryResult<T>;
}

describe("toApiQueryResult", () => {
  it("maps a loading query to loading:true and isInitialLoading:true", () => {
    const q = makeQuery<string | null>({ isLoading: true });

    const result = toApiQueryResult(q, null);

    expect(result.loading).toBe(true);
    expect(result.isInitialLoading).toBe(true);
  });

  it("maps a settled query to loading:false and isInitialLoading:false", () => {
    const q = makeQuery<string | null>({ isLoading: false });

    const result = toApiQueryResult(q, null);

    expect(result.loading).toBe(false);
    expect(result.isInitialLoading).toBe(false);
  });

  it("converts a query error to its message string", () => {
    const q = makeQuery<string | null>({ error: new Error("boom") });

    const result = toApiQueryResult(q, null);

    expect(result.error).toBe("boom");
  });

  it("returns a null error when the query has no error", () => {
    const q = makeQuery<string | null>({ error: null });

    const result = toApiQueryResult(q, null);

    expect(result.error).toBeNull();
  });

  it("falls back to the provided fallback when data is undefined", () => {
    const q = makeQuery<string[]>({ data: undefined });

    const result = toApiQueryResult(q, []);

    expect(result.data).toEqual([]);
  });

  it("passes through defined data unchanged", () => {
    const q = makeQuery<string[]>({ data: ["a", "b"] });

    const result = toApiQueryResult(q, []);

    expect(result.data).toEqual(["a", "b"]);
  });

  it("refresh() calls the underlying refetch exactly once", () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    const q = makeQuery<string | null>({ refetch });

    const result = toApiQueryResult(q, null);
    result.refresh();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("passes through isFetching and refetch as additive optional fields", () => {
    const refetch = vi.fn();
    const q = makeQuery<string | null>({ isFetching: true, refetch });

    const result = toApiQueryResult(q, null);

    expect(result.isFetching).toBe(true);
    expect(result.refetch).toBe(refetch);
  });
});
