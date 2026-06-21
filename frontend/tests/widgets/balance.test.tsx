import { render, screen } from "@testing-library/react";
import { RemainingBalance } from "@/widgets/dashboard/ui/RemainingBalance";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/ui/Card");

describe("RemainingBalance Widget", () => {
  const mockMembers = [
    {
      id: "m1",
      name: "Alice",
      income: 3000,
      spent: 500,
      remainingQuota: 2500,
      budgeted: 1000,
    },
    {
      id: "m2",
      name: "Bob",
      income: 2000,
      spent: 300,
      remainingQuota: 1700,
      budgeted: 800,
    },
  ];

  it("primary figure has font-semibold class", () => {
    render(<RemainingBalance totalRemaining={4200} members={mockMembers} />);

    const primaryFigure = screen.getByText(/4,200\.00/i);
    expect(primaryFigure).toHaveClass("font-semibold");
  });

  it("shows empty state message when members is empty", () => {
    render(<RemainingBalance totalRemaining={0} members={[]} />);

    expect(screen.getByText("No members yet")).toBeInTheDocument();
  });
});
