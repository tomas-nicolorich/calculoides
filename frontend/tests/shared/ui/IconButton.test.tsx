import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { IconButton } from "../../../src/shared/ui";

describe("IconButton", () => {
  it("renders its icon children", () => {
    render(
      <IconButton aria-label="Delete">
        <svg data-testid="icon" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("can receive keyboard focus", () => {
    render(
      <IconButton aria-label="Edit">
        <svg />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Edit" });
    button.focus();
    expect(button).toHaveFocus();
  });

  it("fires its click handler", () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Add" onClick={onClick}>
        <svg />
      </IconButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
