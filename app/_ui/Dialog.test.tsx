// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DialogFooter } from "./Dialog";

/**
 * PR 6 (spec `ui-design-system`): ported from `main`'s `shared/ui/Dialog.tsx`.
 *
 * DEVIATION (documented, see tasks.md 6.13): `main`'s `Dialog.tsx` does NOT
 * wrap Base UI's Dialog primitive directly — it only exports `DialogFooter`,
 * a layout helper. The controlled `open` prop, focus trap, Escape-closes,
 * and backdrop-click-closes behavior described in tasks.md 6.2 actually
 * lives on `main`'s `ResponsiveDialog.tsx` (ported in this same PR, see
 * `ResponsiveDialog.test.tsx`) and `DatePicker.tsx` (PR 7), which both
 * consume `@base-ui/react/dialog` directly rather than through a shared
 * `Dialog` wrapper. This suite ports `DialogFooter` verbatim instead of
 * inventing a `Dialog` wrapper `main` never had.
 */
describe("DialogFooter", () => {
  afterEach(() => {
    cleanup();
  });

  it("reverses the column order by default so the primary action sits first on mobile", () => {
    render(
      <DialogFooter data-testid="footer">
        <button type="button">Cancel</button>
        <button type="button">Confirm</button>
      </DialogFooter>,
    );

    expect(screen.getByTestId("footer")).toHaveClass("flex-col-reverse");
  });

  it("keeps the natural column order for a destructive footer so Cancel stays first", () => {
    render(
      <DialogFooter destructive data-testid="footer">
        <button type="button">Cancel</button>
        <button type="button">Delete</button>
      </DialogFooter>,
    );

    const footer = screen.getByTestId("footer");
    expect(footer).toHaveClass("flex-col");
    expect(footer).not.toHaveClass("flex-col-reverse");
  });

  it("merges a passed className with the ported layout classes", () => {
    render(<DialogFooter data-testid="footer" className="mt-10" />);

    expect(screen.getByTestId("footer")).toHaveClass("mt-10", "flex", "gap-2");
  });
});
