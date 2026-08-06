import { describe, it, expect } from "vitest";
import { matchLegacyRoute } from "./routes-table";

// 6b.5: `ROUTE_TABLE` is now empty — every remaining entry routed to the
// single `transactions` handler, deleted once expenses/transfers/summary/
// categories/savings all ported to their own Server Actions/Route Handlers
// (4a/4b/2/5/6a/6b). `matchLegacyRoute` must therefore return `undefined`
// for every path, so `app/api/[...legacy]/route.ts` always 404s until phase
// 7.1 deletes the whole adapter apparatus.
describe("matchLegacyRoute", () => {
  it("returns undefined for a path that used to be a friendly-path entry", () => {
    expect(matchLegacyRoute(["expenses"])).toBeUndefined();
    expect(matchLegacyRoute(["transactions"])).toBeUndefined();
    expect(matchLegacyRoute(["transactions", "expense-42"])).toBeUndefined();
    expect(matchLegacyRoute(["savings"])).toBeUndefined();
    expect(matchLegacyRoute(["savings", "contribution"])).toBeUndefined();
    expect(matchLegacyRoute(["categories"])).toBeUndefined();
  });

  it("returns undefined for any other unmatched path", () => {
    expect(matchLegacyRoute(["not-a-real-path"])).toBeUndefined();
  });
});
