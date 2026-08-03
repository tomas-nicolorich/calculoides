import { render as rtlRender, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { buildMemberColorIndex } from "./DashboardPage";
import { IncomeOverview } from "../../../widgets/dashboard/ui/IncomeOverview";
import { RemainingBalance } from "../../../widgets/dashboard/ui/RemainingBalance";
import { Avatar, AvatarGroup } from "../../../shared/ui/Avatar";
import { QueryWrapper } from "../../../test/queryTestUtils";

function render(ui: ReactElement) {
  return rtlRender(<QueryWrapper>{ui}</QueryWrapper>);
}

// Members in join order; the third name starts with a unique letter so its
// initial is addressable on its own across every panel.
const rawMembers = [
  { id: "m1", name: "Alice", income: 3000, share: 50 },
  { id: "m2", name: "Bob", income: 2000, share: 30 },
  { id: "m3", name: "Zoe", income: 1000, share: 20 },
];

function HeaderGroup({
  members,
  index,
  max,
}: {
  members: { id: string; name: string }[];
  index: Map<string, number>;
  max?: number;
}) {
  return (
    <AvatarGroup max={max} size="sm">
      {members.map((m) => (
        <Avatar
          key={m.id}
          size="sm"
          name={m.name}
          colorIndex={index.get(m.id) ?? 0}
        />
      ))}
    </AvatarGroup>
  );
}

describe("buildMemberColorIndex", () => {
  it("maps each member id to its join-order position", () => {
    const index = buildMemberColorIndex(rawMembers);
    expect(index.get("m1")).toBe(0);
    expect(index.get("m2")).toBe(1);
    expect(index.get("m3")).toBe(2);
  });
});

describe("stable member colour across panels", () => {
  it("renders the same colour + initial for a member in balance and header", () => {
    const index = buildMemberColorIndex(rawMembers);
    const withIndex = rawMembers.map((m) => ({
      ...m,
      spent: 0,
      remainingQuota: 0,
      budgeted: 0,
      colorIndex: index.get(m.id) ?? 0,
    }));

    // IncomeOverview now uses MemberBar (colour dots + full name, no avatar initials).
    // Verify that it at least renders Zoe's name in the legend.
    const income = render(
      <IncomeOverview
        totalIncome={6000}
        members={withIndex}
        groupId="group-1"
      />,
    );
    expect(within(income.container).getByText("Zoe")).toBeInTheDocument();

    const balance = render(
      <RemainingBalance totalRemaining={6000} members={withIndex} />,
    );
    const balanceZoe = within(balance.container).getByText("ZO");
    expect(balanceZoe).toHaveStyle({ background: "var(--color-member-3)" });

    const header = render(<HeaderGroup members={rawMembers} index={index} />);
    const headerZoe = within(header.container).getByText("ZO");
    expect(headerZoe).toHaveStyle({ background: "var(--color-member-3)" });
  });
});

describe("header AvatarGroup overflow", () => {
  it("caps at 4 avatars and shows a +N overflow chip", () => {
    const sixMembers = [
      { id: "a", name: "Ann" },
      { id: "b", name: "Bob" },
      { id: "c", name: "Cal" },
      { id: "d", name: "Dan" },
      { id: "e", name: "Eve" },
      { id: "f", name: "Fay" },
    ];
    const index = buildMemberColorIndex(sixMembers);
    render(<HeaderGroup members={sixMembers} index={index} max={4} />);

    // First four initials render, the rest collapse into +2.
    expect(screen.getByText("AN")).toBeInTheDocument();
    expect(screen.getByText("BO")).toBeInTheDocument();
    expect(screen.getByText("CA")).toBeInTheDocument();
    expect(screen.getByText("DA")).toBeInTheDocument();
    expect(screen.queryByText("EV")).not.toBeInTheDocument();
    expect(screen.queryByText("FA")).not.toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});
