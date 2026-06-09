import { render, screen } from "@testing-library/react";
import { IncomeOverview } from "@/widgets/dashboard/ui/IncomeOverview";
import { describe, it, expect, vi } from "vitest";

// Mock Card component
vi.mock("@/shared/ui/Card", () => ({
  Card: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="card-container">
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

describe("IncomeOverview Widget", () => {
  const mockMembers = [
    { id: "m1", name: "Alice", income: 3000, share: 60 },
    { id: "m2", name: "Bob", income: 2000, share: 40 },
    { id: "m3", name: "Charlie", income: 1000, share: 20 },
  ];

  it("renders total group income correctly", () => {
    render(<IncomeOverview totalIncome={6000} members={mockMembers} />);

    // Total income should be formatted and displayed
    expect(screen.getByText(/Total Group Income/i)).toBeInTheDocument();
    expect(screen.getByText(/6,000\.00/i)).toBeInTheDocument();
  });

  it("renders all member names and percentages", () => {
    render(<IncomeOverview totalIncome={6000} members={mockMembers} />);

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
    render(<IncomeOverview totalIncome={6000} members={mockMembers} />);

    const primaryFigure = screen.getByText(/6,000\.00/i);
    expect(primaryFigure).toHaveClass("font-semibold");
  });

  it("shows empty state message when members is empty", () => {
    render(<IncomeOverview totalIncome={0} members={[]} />);

    expect(screen.getByText("No members yet")).toBeInTheDocument();
  });

  it("assigns unique rotating color classes to each member segment and matching color indicators", () => {
    render(<IncomeOverview totalIncome={6000} members={mockMembers} />);

    const segment0 = screen.getByTestId("bar-segment-0");
    const segment1 = screen.getByTestId("bar-segment-1");
    const segment2 = screen.getByTestId("bar-segment-2");

    const indicator0 = screen.getByTestId("color-indicator-0");
    const indicator1 = screen.getByTestId("color-indicator-1");
    const indicator2 = screen.getByTestId("color-indicator-2");

    // Each segment should have a corresponding color class
    expect(segment0).toHaveClass("bg-emerald-500");
    expect(segment1).toHaveClass("bg-blue-500");
    expect(segment2).toHaveClass("bg-violet-500");

    // Indicators should have the same color classes
    expect(indicator0).toHaveClass("bg-emerald-500");
    expect(indicator1).toHaveClass("bg-blue-500");
    expect(indicator2).toHaveClass("bg-violet-500");

    // Checks that the borders/separators are applied to prevent merging
    expect(segment0).toHaveClass("border-r");
    expect(segment1).toHaveClass("border-r");
    expect(segment2).toHaveClass("border-r");
  });
});
