import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button, type ButtonVariant } from "../../../src/shared/ui";

const variants: ButtonVariant[] = [
  "balance",
  "income",
  "expense",
  "transfer",
  "cta",
  "outline",
  "ghost",
];

describe("Button", () => {
  it.each(variants)("renders the %s variant with its label", (variant) => {
    render(<Button variant={variant}>Add Income</Button>);
    expect(
      screen.getByRole("button", { name: "Add Income" }),
    ).toBeInTheDocument();
  });

  it("defaults to the balance variant when none is given", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("fires the click handler when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Create Group</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Create Group" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire the click handler when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders leading and trailing icons alongside the label", () => {
    render(
      <Button
        leadingIcon={<span data-testid="lead" />}
        trailingIcon={<span data-testid="trail" />}
      >
        Transfer
      </Button>,
    );
    expect(screen.getByTestId("lead")).toBeInTheDocument();
    expect(screen.getByTestId("trail")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Transfer" }),
    ).toBeInTheDocument();
  });
});
