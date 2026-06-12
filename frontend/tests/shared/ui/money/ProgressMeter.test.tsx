import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressMeter } from "../../../../src/shared/ui/money";

describe("ProgressMeter", () => {
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
});
