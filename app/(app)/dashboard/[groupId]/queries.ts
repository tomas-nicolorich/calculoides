import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../../frontend/src/shared/api/queryKeys";
import type {
  DashboardSummary,
  CategoryWithBalances,
} from "shared/src/types/redesign";

/**
 * Lean Next-app equivalents of `frontend/src/shared/api/dashboardHooks.ts`'s
 * `useDashboardSummary`/`useCategoriesList`, backing refetch-on-focus for
 * the same `queryKeys.summary`/`queryKeys.categories` tuples the Server
 * Component prefetches into (2.2, 2.6).
 *
 * Deviation from design.md's literal "client hooks stay unchanged": the
 * *existing* hooks call `apiClient.fetch`, which imports
 * `frontend/src/shared/api/supabase.ts` — that module reads
 * `import.meta.env.VITE_SUPABASE_URL`, a Vite-only construct Next's
 * webpack/Turbopack bundler does not evaluate the same way and that would
 * never be populated in the Next runtime's env. Reusing that hook verbatim
 * would silently break at build/runtime, not just diverge cosmetically.
 * `queryKeys` itself (pure, no env access) IS reused unchanged, which is
 * what the `client-data-cache` spec's key-identity requirement actually
 * depends on — same precedent as 1a.6/1a.7's "lean new implementation, not
 * full port" for SPA-specific plumbing. See apply-progress Phase 2.
 */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(body.error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export function useDashboardSummary(groupId: string) {
  return useQuery({
    queryKey: queryKeys.summary(groupId),
    queryFn: () =>
      fetchJson<DashboardSummary>(`/api/summary?groupId=${groupId}`),
  });
}

export function useCategoriesList(groupId: string) {
  return useQuery({
    queryKey: queryKeys.categories(groupId),
    queryFn: () =>
      fetchJson<CategoryWithBalances[]>(`/api/categories?groupId=${groupId}`),
  });
}
