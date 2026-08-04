import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { IncomeOverview } from "@/widgets/dashboard/ui/IncomeOverview";
import { QueryWrapper } from "@/test/queryTestUtils";
import { describe, it, expect, vi } from "vitest";

function render(ui: ReactElement) {
  return rtlRender(<QueryWrapper>{ui}</QueryWrapper>);
}

vi.mock("@/shared/ui/Card");

describe("IncomeOverview Widget", () => {
  const mockMembers = [
    { id: "m1", name: "Alice", income: 3000, share: 60 },
    { id: "m2", name: "Bob", income: 2000, share: 40 },
    { id: "m3", name: "Charlie", income: 1000, share: 20 },
  ];

  it("renders total group income correctly", () => {
    render(
      <IncomeOverview
        totalIncome={6000}
        members={mockMembers}
        groupId="group-1"
      />,
    );

    expect(screen.getByText(/Total Group Income/i)).toBeInTheDocument();
    expect(screen.getByText(/6,000\.00/i)).toBeInTheDocument();
  });

  it("renders all member names and percentages", () => {
    render(
      <IncomeOverview
        totalIncome={6000}
        members={mockMembers}
        groupId="group-1"
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("(60.0%)")).toBeInTheDocument();
    expect(screen.getByText(/3,000\.00/i)).toBeInTheDocument();

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("(40.0%)")).toBeInTheDocument();
    expect(screen.getByText(/2,000\.00/i)).toBeInTheDocument();

    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("(20.0%)")).toBeInTheDocument();
    expect(screen.getByText(/1,000\.00/i)).toBeInTheDocument();
  });

  it("primary figure has font-semibold class", () => {
    render(
      <IncomeOverview
        totalIncome={6000}
        members={mockMembers}
        groupId="group-1"
      />,
    );

    const primaryFigure = screen.getByText(/6,000\.00/i);
    expect(primaryFigure).toHaveClass("font-semibold");
  });

  it("shows empty state message when members is empty", () => {
    render(<IncomeOverview totalIncome={0} members={[]} groupId="group-1" />);

    expect(screen.getByText("No members yet")).toBeInTheDocument();
  });

  it("renders one bar segment per member", () => {
    render(
      <IncomeOverview
        totalIncome={6000}
        members={mockMembers}
        groupId="group-1"
      />,
    );

    expect(screen.getAllByTestId("memberbar-segment")).toHaveLength(3);
  });
});
