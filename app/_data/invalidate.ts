import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";

/**
 * client-data-cache: "Mutations Invalidate Group-Scoped Queries by Key
 * Prefix". `queryKeys.group(groupId)` is the `["group", groupId]` prefix;
 * TanStack Query's default `invalidateQueries` only marks cache entries
 * whose key starts with that exact tuple as stale, so a mutation for one
 * group can never mark another group's cached queries stale
 * (client-data-cache: "Mutation for one group does not affect another").
 *
 * Deduped out of three route-local `queries.ts` copies (expenses,
 * transfers, savings) per ADR-2.
 */
export function invalidateGroupQueries(
  queryClient: QueryClient,
  groupId: string,
) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
}
