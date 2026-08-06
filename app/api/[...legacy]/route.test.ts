import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

function requestFor(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

/**
 * 6b.5: `transactions` — the last legacy handler — was deleted once
 * expenses/transfers/summary/categories/savings all ported to their own
 * Server Actions/Route Handlers (4a/4b/2/5/6a/6b), so `ROUTE_TABLE`
 * (routes-table.ts) is now empty and `LEGACY_HANDLERS` (adapter.ts) has no
 * entries. Every `/api/*` path this catch-all sees is genuinely unmatched:
 * `matchLegacyRoute` always returns `undefined`, so `dispatchLegacyRequest`
 * always short-circuits to 404 before ever reaching auth or a handler — the
 * auth-pass-through/bearer-injection coverage this file previously carried
 * (1b.4-1b.6) tested that exact mechanism through the now-deleted
 * `categories-list` legacy action; it's superseded by
 * `app/api/categories/route.test.ts`'s own direct coverage (Phase 2), which
 * doesn't go through this adapter at all. Phase 7.1 deletes this whole
 * adapter apparatus outright ("nothing left calling them").
 */
describe("legacy adapter route", () => {
  it("returns 404 for any /api/* path — no legacy handler remains", async () => {
    const response = await GET(requestFor("/api/categories?groupId=group-1"), {
      params: Promise.resolve({ legacy: ["categories"] }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not Found" });
  });

  it("returns 404 even for a path that never existed", async () => {
    const response = await GET(requestFor("/api/not-a-real-path"), {
      params: Promise.resolve({ legacy: ["not-a-real-path"] }),
    });

    expect(response.status).toBe(404);
  });
});
