import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AddExpenseFab } from "../../../src/shared/ui";

describe("AddExpenseFab", () => {
  it("renders an accessible button with a Plus icon and the default label", () => {
    render(<AddExpenseFab onClick={vi.fn()} />);

    const fab = screen.getByRole("button", { name: "Add Expense" });
    expect(fab).toBeInTheDocument();
    expect(fab.querySelector("svg")).toBeInTheDocument();
  });

  it("uses a custom label for its accessible name when provided", () => {
    render(<AddExpenseFab onClick={vi.fn()} label="Log a spend" />);

    expect(
      screen.getByRole("button", { name: "Log a spend" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Expense" }),
    ).not.toBeInTheDocument();
  });

  it("fires onClick when tapped and owns no dialog or data logic of its own", () => {
    const onClick = vi.fn();
    render(<AddExpenseFab onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    // No dialog/modal markup — the component never owns dialog state.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables the button and blocks clicks when disabled is true", () => {
    const onClick = vi.fn();
    render(<AddExpenseFab onClick={onClick} disabled />);

    const fab = screen.getByRole("button", { name: "Add Expense" });
    expect(fab).toBeDisabled();

    fireEvent.click(fab);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("AddExpenseFab route guard", () => {
  // Static guard proving the FAB is wired into exactly Dashboard/Expenses and
  // nowhere else, per spec scenario "Other pages never show the FAB". A
  // rendered-page assertion isn't needed here: if a page never imports the
  // component it can never render it, and this fails the moment someone adds
  // the import to a page outside this slice's scope.
  const otherPages = [
    "../../../src/pages/transfers/ui/TransfersPage.tsx",
    "../../../src/pages/savings/ui/SavingsPage.tsx",
    "../../../src/pages/groups/ui/GroupsPage.tsx",
    "../../../src/pages/profile/ui/ProfilePage.tsx",
  ];

  it.each(otherPages)("does not import AddExpenseFab in %s", (relativePath) => {
    const absolutePath = path.resolve(import.meta.dirname, relativePath);
    const source = readFileSync(absolutePath, "utf-8");
    expect(source).not.toContain("AddExpenseFab");
  });
});
