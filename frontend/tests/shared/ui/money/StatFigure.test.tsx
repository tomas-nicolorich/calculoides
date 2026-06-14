import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatFigure } from "../../../../src/shared/ui/money";

describe("StatFigure", () => {
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
});
