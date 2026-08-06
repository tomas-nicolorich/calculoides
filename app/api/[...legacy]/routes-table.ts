/**
 * Friendly-path → {handler, action} table, replacing `vercel.json`'s API
 * `rewrites` (task 1b.9 deletes that file once this table is live).
 *
 * Every entry below was a direct, faithful port of one `vercel.json` rewrite
 * rule (`source` → `destination`'s `action`/dynamic-segment query params).
 *
 * `groups`/`members`/`users` entries were removed in 3b.9. Every remaining
 * entry (transactions/expenses/transfers/summary/savings/categories) routed
 * to the single `transactions` handler, which 6b.5 deletes now that
 * expenses/transfers/summary/categories/savings have all ported to their
 * own Server Actions and `app/api/{expenses,transfers,summary,savings}` /
 * `app/api/categories` Route Handlers (4a/4b/2/5/6a/6b) — so `ROUTE_TABLE`
 * is intentionally empty: every `/api/*` path this catch-all sees from here
 * on is genuinely unmatched (404), until phase 7.1 deletes this whole
 * adapter apparatus outright ("nothing left calling them").
 */

export type LegacyHandlerName = never;

interface LegacyRoutePattern {
  /** Path segments; a segment starting with `:` captures a dynamic value. */
  parts: string[];
  handlerName: LegacyHandlerName;
  /** Query param set to this value, overriding any client-supplied `action`. */
  action?: string;
  /** Query key the captured dynamic segment's value is written under. */
  paramQueryKey?: string;
}

const ROUTE_TABLE: LegacyRoutePattern[] = [];

export interface LegacyRouteMatch {
  handlerName: LegacyHandlerName;
  /** Query params the destination sets, to be merged OVER the caller's own
   * query string (mirrors `vercel.json` rewrite / the Express shim's
   * `applyRewrites` precedence: destination params win on key collision,
   * everything else from the original request passes through). */
  query: Record<string, string>;
}

/**
 * Matches a `/api/*` catch-all's captured segments against `ROUTE_TABLE`.
 * Pure function — no I/O — so `req.query` construction is unit-testable
 * without a real `NextRequest`.
 */
export function matchLegacyRoute(
  segments: string[],
): LegacyRouteMatch | undefined {
  for (const entry of ROUTE_TABLE) {
    if (entry.parts.length !== segments.length) continue;

    const captured: Record<string, string> = {};
    const matches = entry.parts.every((part, index) => {
      if (part.startsWith(":")) {
        captured[part.slice(1)] = segments[index];
        return true;
      }
      return part === segments[index];
    });
    if (!matches) continue;

    const query: Record<string, string> = {};
    if (entry.action) query.action = entry.action;
    if (entry.paramQueryKey) {
      const dynamicPart = entry.parts.find((part) => part.startsWith(":"));
      if (dynamicPart) {
        query[entry.paramQueryKey] = captured[dynamicPart.slice(1)];
      }
    }
    return { handlerName: entry.handlerName, query };
  }
  return undefined;
}
