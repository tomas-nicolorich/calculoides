import { describe, it, expect } from "vitest";
import { ok, fail } from "./result";

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
