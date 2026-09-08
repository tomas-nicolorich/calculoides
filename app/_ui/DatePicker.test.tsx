// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DatePicker } from "./DatePicker";

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
 * PR 7 (spec `ui-design-system` — "Primitives Live at `app/_ui/**`"): ported
 * from `main`'s `shared/ui/DatePicker.tsx`, the largest single `_ui`
 * primitive. DEVIATION (documented, tasks.md 7.1/7.6): `main` sources
 * `isDesktop` from its own `useMediaQuery("(min-width: 768px)")` hook, not
 * present in this repo — this port uses `useIsMobile()` (PR 2, same
 * substitution as `ResponsiveDialog`, tasks.md 6.5) and derives
 * `isDesktop = !useIsMobile()`. `main` has no configurable `min`/`max`
 * props (bounds are implicit via `granularity`) and no keyboard arrow-key
 * grid navigation — both ported verbatim (absent), not added.
 */
describe("DatePicker", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2024, 2, 15)); // Friday, 15 March 2024
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows the default placeholder when no value is set", () => {
    stubMatchMedia(false);
    render(<DatePicker value="" onChange={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveTextContent("Select date");
  });

  it("shows the formatted date for a controlled day value", () => {
    stubMatchMedia(false);
    render(<DatePicker value="2024-03-15" onChange={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveTextContent("15 Mar 2024");
  });

  it("opens a calendar popover on desktop when the trigger is clicked", () => {
    stubMatchMedia(false);
    render(<DatePicker value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("March 2024")).toBeInTheDocument();
  });

  it("opens a bottom sheet on mobile", () => {
    stubMatchMedia(true);
    render(<DatePicker value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("dialog")).toHaveClass(
      "inset-x-0",
      "bottom-0",
      "rounded-t-2xl",
    );
  });

  it("calls onChange with the YYYY-MM-DD value and closes when a day is picked", () => {
    stubMatchMedia(false);
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("gridcell", { name: /15 March 2024/i }));

    expect(onChange).toHaveBeenCalledWith("2024-03-15");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables future dates for the day granularity", () => {
    stubMatchMedia(false);
    render(<DatePicker value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button"));

    expect(
      screen.getByRole("gridcell", { name: /20 March 2024/i }),
    ).toBeDisabled();
  });

  it("navigates to the next month via the header button", () => {
    stubMatchMedia(false);
    render(<DatePicker value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByText("April 2024")).toBeInTheDocument();
  });

  it("uses YYYY-MM values and disables past months for the month granularity", () => {
    stubMatchMedia(false);
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} granularity="month" />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: /Jan 2024/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("gridcell", { name: /Apr 2024/i }));

    expect(onChange).toHaveBeenCalledWith("2024-04");
  });

  it("marks the calendar with role=grid and labels each date cell with a full date", () => {
    stubMatchMedia(false);
    render(<DatePicker value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: /15 March 2024/i }),
    ).toBeInTheDocument();
  });

  it("focuses the selected date cell when the calendar opens", async () => {
    stubMatchMedia(false);
    render(<DatePicker value="2024-03-10" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(
        screen.getByRole("gridcell", { name: /10 March 2024/i }),
      ).toHaveFocus();
    });
  });

  it("disables the trigger when disabled is set", () => {
    stubMatchMedia(false);
    render(<DatePicker value="" onChange={vi.fn()} disabled />);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
