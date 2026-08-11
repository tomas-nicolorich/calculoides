import { describe, it, expect } from "vitest";
import * as barrel from "./index";

/**
 * Barrel smoke test (task 3.9/3.10): every `app/_ui` atom ported in PR 3
 * MUST be importable by name from `app/_ui/index.tsx` — the barrel is the
 * acceptance surface for "no inline reimplementation" (spec `ui-design-system`
 * — "Primitives Live at `app/_ui/**`").
 */
describe("app/_ui barrel", () => {
  it("re-exports Button", () => {
    expect(barrel.Button).toBeTypeOf("function");
  });

  it("re-exports Card", () => {
    expect(barrel.Card).toBeTypeOf("function");
  });

  it("re-exports Input", () => {
    expect(barrel.Input).toBeTypeOf("function");
  });

  it("re-exports Badge", () => {
    expect(barrel.Badge).toBeTypeOf("function");
  });
});
