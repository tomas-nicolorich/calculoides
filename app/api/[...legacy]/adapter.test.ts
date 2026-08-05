import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { LegacyResponse, buildLegacyRequest } from "./adapter";

// 1b.2: res.status().json() chaining and .end() for 204 responses work
// through the shim. `LegacyResponse` is the `ApiResponse`-shaped object the
// adapter hands to the unchanged legacy handlers (`withErrorHandling` only
// polyfills `.status`/`.json` when they're missing — this shim provides them
// directly, so handler code like `res.status(200).json(data)` and
// `res.status(204).end()` behaves identically to the Express/Node original).
describe("LegacyResponse", () => {
  it("chains status().json() into a NextResponse with the right status and body", async () => {
    const res = new LegacyResponse();

    res.status(201).json({ id: "group-1" });

    const response = await res.result;
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "group-1" });
  });

  it("supports status(204).end() with no body, matching a delete/remove response", async () => {
    const res = new LegacyResponse();

    res.status(204).end();

    const response = await res.result;
    expect(response.status).toBe(204);
    expect(res.headersSent).toBe(true);
  });

  it("marks headersSent only after end()/json() settles the response", () => {
    const res = new LegacyResponse();

    expect(res.headersSent).toBe(false);
    res.status(200).json({ ok: true });
    expect(res.headersSent).toBe(true);
  });
});

// 1b.3: req.query populated correctly for both dynamic segments (:id) and
// query-string actions — this is the integration half of routes-table.test's
// pure `matchLegacyRoute` coverage: a real `NextRequest`'s query string must
// end up on the shimmed `req.query`, merged with the matched route's own
// destination params.
describe("buildLegacyRequest", () => {
  it("populates req.query from the request's own query string", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/transactions?action=transfer-create",
    );

    const { req } = await buildLegacyRequest(request, {});

    expect(req.query).toEqual({ action: "transfer-create" });
  });

  it("merges a dynamic-segment-derived query param over the caller's own query string", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/transactions/expense-1?type=transfer",
    );

    const { req } = await buildLegacyRequest(request, {
      action: "transaction",
      id: "expense-1",
    });

    expect(req.query).toEqual({
      type: "transfer",
      action: "transaction",
      id: "expense-1",
    });
  });

  it("lets the destination action override a client-supplied action on key collision", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/archive?action=list",
    );

    const { req } = await buildLegacyRequest(request, { action: "archive" });

    expect(req.query.action).toBe("archive");
  });
});
