import { describe, it, expect } from "vitest";
import * as barrel from "./index";

/**
 * Barrel smoke test (tasks 3.9/3.10 + 4.11 merged): every `app/_ui` atom
 * ported so far — PR 3's Button/Card/Input/Badge and PR 4's Alert/Skeleton/
 * IconButton/ReloadButton/Logo — MUST be importable by name from
 * `app/_ui/index.tsx`. The barrel is the acceptance surface for "no inline
 * reimplementation" (spec `ui-design-system` — "Primitives Live at
 * `app/_ui/**`"). PR 3 and PR 4 each built their own barrel independently
 * (parallel forks from PR 2); this file is the merged union, required
 * before PR 5 can add its own exports on top.
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

  it("re-exports DialogFooter", () => {
    expect(barrel.DialogFooter).toBeTypeOf("function");
  });

  it("re-exports ResponsiveDialog", () => {
    expect(barrel.ResponsiveDialog).toBeTypeOf("function");
  });

  it("re-exports RowMenu", () => {
    expect(barrel.RowMenu).toBeTypeOf("function");
  });

  it("re-exports Select", () => {
    expect(barrel.Select).toBeTypeOf("function");
  });
});
