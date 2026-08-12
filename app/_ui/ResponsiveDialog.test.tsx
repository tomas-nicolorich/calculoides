// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ResponsiveDialog } from "./ResponsiveDialog";

const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

/** Minimal `matchMedia` stub carrying only what `useIsMobile` depends on. */
function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query === MOBILE_BREAKPOINT_QUERY ? matches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * PR 6 (spec `ui-design-system` — "`ResponsiveDialog` Is the One Sanctioned
 * `useIsMobile()` Consumer"): ported from `main`'s `shared/ui/ResponsiveDialog.tsx`.
 *
 * DEVIATION (documented, see tasks.md 6.13): `main` derives desktop/mobile
 * from its own `useMediaQuery("(min-width: 768px)")` hook (`frontend/src/shared/lib/hooks/useMediaQuery.ts`,
 * not ported into this repo). This port uses `lib/hooks/use-is-mobile.ts`
 * (PR 2, ADR-3's sanctioned consumer) instead — `useIsMobile()` has inverted
 * boolean semantics (`true` below the 767px breakpoint), so `isDesktop` is
 * derived as `!useIsMobile()` to preserve `main`'s exact positioning
 * behavior and prop contract.
 */
describe("ResponsiveDialog", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders a centered modal on desktop", () => {
    stubMatchMedia(false);

    render(
      <ResponsiveDialog
        open
        onOpenChange={vi.fn()}
        title="Delete expense"
        description="This cannot be undone."
      >
        <p>Body</p>
      </ResponsiveDialog>,
    );

    expect(screen.getByRole("dialog")).toHaveClass(
      "left-1/2",
      "top-1/2",
      "-translate-x-1/2",
      "-translate-y-1/2",
    );
  });

  it("renders a bottom sheet on mobile", () => {
    stubMatchMedia(true);

    render(
      <ResponsiveDialog open onOpenChange={vi.fn()} title="Delete expense">
        <p>Body</p>
      </ResponsiveDialog>,
    );

    expect(screen.getByRole("dialog")).toHaveClass(
      "left-0",
      "right-0",
      "bottom-0",
      "rounded-t-2xl",
    );
  });

  it("renders the title and, when provided, the description", () => {
    stubMatchMedia(false);

    render(
      <ResponsiveDialog
        open
        onOpenChange={vi.fn()}
        title="Delete expense"
        description="This cannot be undone."
      >
        <p>Body</p>
      </ResponsiveDialog>,
    );

    expect(
      screen.getByRole("heading", { name: "Delete expense" }),
    ).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    stubMatchMedia(false);

    render(
      <ResponsiveDialog open={false} onOpenChange={vi.fn()} title="Hidden">
        <p>Body</p>
      </ResponsiveDialog>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Escape is pressed", () => {
    stubMatchMedia(false);
    const onOpenChange = vi.fn();

    render(
      <ResponsiveDialog open onOpenChange={onOpenChange} title="Delete expense">
        <p>Body</p>
      </ResponsiveDialog>,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });

    expect(onOpenChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ reason: "escape-key" }),
    );
  });
});
