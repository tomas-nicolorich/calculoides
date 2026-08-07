import { describe, it, expect } from "vitest";
import { ok, fail, fromThrown } from "./result";

// design.md Testing Strategy: "ActionResult shapes" — purely structural
// factories (no branching), so triangulation is skipped per strict-tdd's
// "purely structural" exemption; one assertion per shape is sufficient.
describe("ActionResult factories", () => {
  it("ok() wraps data in the success shape", () => {
    expect(ok({ id: "group-1" })).toEqual({
      ok: true,
      data: { id: "group-1" },
    });
  });

  it("fail() wraps an error message and status in the failure shape", () => {
    expect(fail("Access denied to this group", 403)).toEqual({
      ok: false,
      error: "Access denied to this group",
      status: 403,
    });
  });
});

describe("fromThrown", () => {
  it("maps a known Error message to its ActionResult status via toStatus", () => {
    expect(fromThrown(new Error("Access denied to this group"))).toEqual({
      ok: false,
      error: "Access denied to this group",
      status: 403,
    });
  });

  it("falls back to 500 for an unmapped Error message", () => {
    expect(fromThrown(new Error("boom"))).toEqual({
      ok: false,
      error: "boom",
      status: 500,
    });
  });

  it("coerces a non-Error thrown value to a string message", () => {
    expect(fromThrown("boom")).toEqual({
      ok: false,
      error: "boom",
      status: 500,
    });
  });
});
