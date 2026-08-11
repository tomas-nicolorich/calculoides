// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useIsMobile } from "./use-is-mobile";

const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

/** Minimal `matchMedia` stub carrying only what the hook depends on. */
function stubMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  let changeListener: ((event: { matches: boolean }) => void) | null = null;

  const mql = {
    get matches() {
      return matches;
    },
    media: MOBILE_BREAKPOINT_QUERY,
    addEventListener: vi.fn(
      (type: string, listener: (event: { matches: boolean }) => void) => {
        if (type === "change") changeListener = listener;
      },
    ),
    removeEventListener: vi.fn(),
  };

  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql));

  return {
    fireChange: (next: boolean) => {
      matches = next;
      act(() => {
        changeListener?.({ matches: next });
      });
    },
  };
}

/**
 * PR 2 foundations (ADR-3): `useIsMobile` is scoped to `ResponsiveDialog`
 * only, never the shell (which branches with CSS `hidden md:flex`/`md:hidden`
 * instead). Mounted-state coverage lives here since design.md's "narrower
 * scope" decision still requires an SSR-safe default.
 */
describe("useIsMobile", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("returns true once mounted below the breakpoint", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("returns false once mounted above the breakpoint", () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("updates when matchMedia fires a change event", () => {
    const { fireChange } = stubMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    fireChange(true);

    expect(result.current).toBe(true);
  });
});
