// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemberBar } from "./MemberBar";

/**
 * PR 5 (spec `ui-design-system` — "Money Visualisations Render Without a
 * Charting Library", scenario "Member income split renders as a stacked
 * bar"): ported verbatim from `main`'s `shared/ui/money/MemberBar.tsx`. The
 * spec's negative assertion — no chart-library canvas/SVG component — is
 * checked explicitly: `MemberBar` renders CSS stacked-segment `<div>`s only.
 */
const members = [
  { id: "a", name: "Ana", share: 50, amount: "€1,000.00" },
  { id: "b", name: "Beto", share: 50, amount: "€1,000.00" },
];

describe("MemberBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders one segment per member", () => {
    render(<MemberBar members={members} />);
    expect(screen.getAllByTestId("memberbar-segment")).toHaveLength(2);
  });

  it("gives each segment a proportional width", () => {
    render(<MemberBar members={members} />);
    const segments = screen.getAllByTestId("memberbar-segment");
    expect(segments[0].style.width).toBe("50%");
    expect(segments[1].style.width).toBe("50%");
  });

  it("shows each member name, income, and percentage in the legend", () => {
    render(<MemberBar members={members} />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Beto")).toBeInTheDocument();
    expect(screen.getAllByText("€1,000.00")).toHaveLength(2);
    expect(screen.getAllByText("(50.0%)")).toHaveLength(2);
  });

  it("renders an empty state when there are no members", () => {
    render(<MemberBar members={[]} emptyMessage="No income data yet." />);
    expect(screen.getByText("No income data yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("memberbar-segment")).not.toBeInTheDocument();
  });

  it("renders the split as CSS segments, never a chart-library canvas/SVG element", () => {
    const { container } = render(<MemberBar members={members} />);
    expect(container.querySelector("canvas")).not.toBeInTheDocument();
    expect(
      container.querySelector('[class*="recharts"]'),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId("memberbar-segment")[0].tagName).toBe("DIV");
  });
});
