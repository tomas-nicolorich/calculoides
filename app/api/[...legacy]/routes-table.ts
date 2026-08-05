/**
 * Friendly-path → {handler, action} table, replacing `vercel.json`'s API
 * `rewrites` (task 1b.9 deletes that file once this table is live).
 *
 * Every entry below is a direct, faithful port of one `vercel.json` rewrite
 * rule (`source` → `destination`'s `action`/dynamic-segment query params).
 * `groups` and `transactions` have no corresponding `vercel.json` rewrite —
 * on real Vercel those paths hit `api/groups.ts`/`api/transactions.ts`
 * directly via file-based routing with the client's original query string
 * untouched, so they're listed here as passthrough entries (no `action`
 * override) purely to route them to the right handler.
 */

export type LegacyHandlerName = "groups" | "members" | "users" | "transactions";

interface LegacyRoutePattern {
  /** Path segments; a segment starting with `:` captures a dynamic value. */
  parts: string[];
  handlerName: LegacyHandlerName;
  /** Query param set to this value, overriding any client-supplied `action`. */
  action?: string;
  /** Query key the captured dynamic segment's value is written under. */
  paramQueryKey?: string;
}

const ROUTE_TABLE: LegacyRoutePattern[] = [
  // Groups (api/groups.ts, no rewrite — direct file-based mount)
  { parts: ["groups"], handlerName: "groups" },
  { parts: ["archive"], handlerName: "groups", action: "archive" },
  { parts: ["undo-archive"], handlerName: "groups", action: "undo-archive" },
  {
    parts: ["groups", ":id", "transfer-ownership"],
    handlerName: "groups",
    action: "transfer",
    paramQueryKey: "groupId",
  },
  { parts: ["transfer-ownership"], handlerName: "groups", action: "transfer" },
  { parts: ["invitations"], handlerName: "groups", action: "invitations" },
  {
    parts: ["respond-invitation"],
    handlerName: "groups",
    action: "respond-invite",
  },

  // Transactions (api/transactions.ts, no rewrite — direct file-based mount)
  { parts: ["transactions"], handlerName: "transactions" },
  {
    parts: ["transactions", ":id"],
    handlerName: "transactions",
    action: "transaction",
    paramQueryKey: "id",
  },
  { parts: ["expenses"], handlerName: "transactions", action: "expenses" },
  { parts: ["transfers"], handlerName: "transactions", action: "transfers" },
  { parts: ["summary"], handlerName: "transactions", action: "summary" },
  { parts: ["savings"], handlerName: "transactions", action: "savings" },
  {
    parts: ["savings", "contribution"],
    handlerName: "transactions",
    action: "savings-contribution",
  },
  {
    parts: ["categories"],
    handlerName: "transactions",
    action: "categories-list",
  },

  // Members
  { parts: ["members"], handlerName: "members", action: "list" },
  {
    parts: ["members", ":id", "income"],
    handlerName: "members",
    action: "update-income",
    paramQueryKey: "id",
  },

  // Users
  { parts: ["users"], handlerName: "users", action: "upsert" },
  { parts: ["users", "me"], handlerName: "users", action: "me" },
];

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
