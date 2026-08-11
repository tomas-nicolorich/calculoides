// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ProgressMeter } from "./ProgressMeter";

/**
 * PR 5 (spec `ui-design-system` — "Money Visualisations Render Without a
 * Charting Library", scenario "Category progress renders via
 * ProgressMeter"): ported verbatim from `main`'s
 * `shared/ui/money/ProgressMeter.tsx` — a `role="progressbar"` `<div>`
 * with a CSS `scaleX` fill, no charting dependency.
 */
describe("ProgressMeter", () => {
  afterEach(() => {
    cleanup();
  });

  it("exposes accessible value attributes", () => {
    render(<ProgressMeter value={30} max={120} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "30");
    expect(bar).toHaveAttribute("aria-valuemax", "120");
  });

  it("applies a distinct state for on-track, behind, and blocked", () => {
    const { rerender } = render(<ProgressMeter value={50} state="on-track" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-state",
      "on-track",
    );

    rerender(<ProgressMeter value={50} state="behind" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-state",
      "behind",
    );

    rerender(<ProgressMeter value={50} state="blocked" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-state",
      "blocked",
    );
  });

  it("renders a label and value label when provided", () => {
    render(
      <ProgressMeter value={50} max={100} label="Saved" valueLabel="50%" />,
    );
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("clamps the visual fill at 100% for an over-budget value", () => {
    render(<ProgressMeter value={150} max={100} />);
    const fill = screen.getByRole("progressbar")
      .firstElementChild as HTMLElement | null;
    expect(fill?.style.transform).toBe("scaleX(1)");
  });
});
