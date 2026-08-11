import { describe, it, expect } from "vitest";
import * as barrel from "./index";

/**
 * PR 5 barrel smoke test — every `app/_ui/money` primitive (StatFigure,
 * MemberBar, ProgressMeter) MUST be importable by name from
 * `app/_ui/money/index.ts`, matching `main`'s `shared/ui/money/index.ts`
 * layout (spec `ui-design-system` — "Primitives Live at `app/_ui/**`").
 */
describe("app/_ui/money barrel", () => {
  it("re-exports StatFigure", () => {
    expect(barrel.StatFigure).toBeTypeOf("function");
  });

  it("re-exports MemberBar", () => {
    expect(barrel.MemberBar).toBeTypeOf("function");
  });

  it("re-exports ProgressMeter", () => {
    expect(barrel.ProgressMeter).toBeTypeOf("function");
  });
});
