import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemberBar } from "../../../../src/shared/ui/money";

const members = [
  { id: "a", name: "Ana", share: 50, amount: "€1,000.00" },
  { id: "b", name: "Beto", share: 50, amount: "€1,000.00" },
];

describe("MemberBar", () => {
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
});
