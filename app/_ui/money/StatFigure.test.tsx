// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StatFigure } from "./StatFigure";

/**
 * PR 5 (spec `ui-design-system` — "Money Visualisations Render Without a
 * Charting Library"): ported verbatim from `main`'s
 * `shared/ui/money/StatFigure.tsx`.
 */
describe("StatFigure", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the formatted currency value", () => {
    render(<StatFigure value="€8,420.00" />);
    expect(screen.getByText("€8,420.00")).toBeInTheDocument();
  });

  it("renders the optional label alongside the value", () => {
    render(<StatFigure label="Total Group Income" value="€8,420.00" />);
    expect(screen.getByText("Total Group Income")).toBeInTheDocument();
    expect(screen.getByText("€8,420.00")).toBeInTheDocument();
  });

  it("renders an optional sub note", () => {
    render(<StatFigure value="€500.00" sub="per month" />);
    expect(screen.getByText("per month")).toBeInTheDocument();
  });

  it("applies the tone's color token to the value", () => {
    render(<StatFigure value="€500.00" tone="income" />);
    expect(screen.getByText("€500.00")).toHaveClass("text-brand-income");
  });
});
