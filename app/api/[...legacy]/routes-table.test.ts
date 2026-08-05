import { describe, it, expect } from "vitest";
import { matchLegacyRoute } from "./routes-table";

// 1b.3: req.query populated correctly for both dynamic segments (:id) and
// query-string actions. `matchLegacyRoute` is the pure function the adapter
// calls to build the query overlay before constructing the shimmed
// `ApiRequest` — testing it directly avoids a full `NextRequest` fixture.
describe("matchLegacyRoute", () => {
  it("maps a static friendly path to its handler and action", () => {
    const match = matchLegacyRoute(["expenses"]);

    expect(match).toEqual({
      handlerName: "transactions",
      query: { action: "expenses" },
    });
  });

  it("captures a dynamic segment into the mapped query key", () => {
    const match = matchLegacyRoute(["transactions", "expense-42"]);

    expect(match).toEqual({
      handlerName: "transactions",
      query: { action: "transaction", id: "expense-42" },
    });
  });

  it("returns no action override for a passthrough base path", () => {
    const match = matchLegacyRoute(["transactions"]);

    expect(match).toEqual({ handlerName: "transactions", query: {} });
  });

  it("returns undefined when no route matches", () => {
    const match = matchLegacyRoute(["not-a-real-path"]);

    expect(match).toBeUndefined();
  });
});
