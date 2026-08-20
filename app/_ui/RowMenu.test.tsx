// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RowMenu } from "./RowMenu";

/**
 * PR 6 (spec `ui-design-system`): ported from `main`'s
 * `shared/ui/RowMenu.tsx` — a Base UI `Popover`-backed row-actions menu.
 * Both `onEdit` and `onDelete` are optional; each item only renders when
 * its handler is provided (`onDelete` was widened past `main`'s
 * always-required contract to support permission-gated callers, e.g.
 * `BudgetCategories`' owner-only delete).
 */
describe("RowMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens the menu and shows Edit and Delete when onEdit is provided", () => {
    render(<RowMenu onEdit={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Row options" }));

    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Delete" }),
    ).toBeInTheDocument();
  });

  it("omits the Edit item when onEdit is not provided", () => {
    render(<RowMenu onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Row options" }));

    expect(
      screen.queryByRole("menuitem", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Delete" }),
    ).toBeInTheDocument();
  });

  it("calls onEdit and closes the menu when Edit is selected", () => {
    const onEdit = vi.fn();
    render(<RowMenu onEdit={onEdit} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Row options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("menuitem", { name: "Edit" }),
    ).not.toBeInTheDocument();
  });

  it("calls onDelete when Delete is selected", () => {
    const onDelete = vi.fn();
    render(<RowMenu onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Row options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("omits the Delete item when onDelete is not provided", () => {
    render(<RowMenu onEdit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Row options" }));

    expect(
      screen.queryByRole("menuitem", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});
