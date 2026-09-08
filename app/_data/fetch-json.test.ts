// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchJson } from "./fetch-json";

/**
 * ADR-2: `fetchJson` deduped out of four route-local `queries.ts` copies
 * (dashboard, expenses, transfers, savings) into one `app/_data/**` helper.
 */
describe("fetchJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with the parsed JSON body on a 2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ groupName: "Roomies" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchJson<{ groupName: string }>("/api/summary"),
    ).resolves.toEqual({ groupName: "Roomies" });
  });

  it("rejects with the response body's error message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(fetchJson("/api/summary")).rejects.toThrow("Not found");
  });

  it("falls back to a generic error when the error body isn't JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not json", { status: 500 })),
    );

    await expect(fetchJson("/api/summary")).rejects.toThrow("Unknown error");
  });
});
