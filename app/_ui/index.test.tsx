import { describe, it, expect } from "vitest";
import * as barrel from "./index";

/**
 * Barrel smoke test (task 4.11), extending PR 3's pattern for the five PR 4
 * atoms: every `app/_ui` atom ported in PR 4 MUST be importable by name from
 * `app/_ui/index.tsx` — the barrel is the acceptance surface for "no inline
 * reimplementation" (spec `ui-design-system` — "Primitives Live at
 * `app/_ui/**`"). PR 4 branched from PR 2, so it builds its own barrel from
 * scratch (PR 3's barrel isn't available here); PR 5/6 will merge both
 * barrels when they rebase onto PR 3 and PR 4.
 */
describe("app/_ui barrel", () => {
  it("re-exports Alert", () => {
    expect(barrel.Alert).toBeTypeOf("function");
  });

  it("re-exports Skeleton", () => {
    expect(barrel.Skeleton).toBeTypeOf("function");
  });

  it("re-exports IconButton", () => {
    expect(barrel.IconButton).toBeTypeOf("function");
  });

  it("re-exports ReloadButton", () => {
    expect(barrel.ReloadButton).toBeTypeOf("function");
  });

  it("re-exports Logo", () => {
    expect(barrel.Logo).toBeTypeOf("function");
  });
});
