// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { IconButton } from "./IconButton";

/**
 * PR 4 (spec `ui-design-system`): ported verbatim from `main`'s
 * `shared/ui/IconButton.tsx`. NOTE (deviation, see tasks.md 4.12): `main`'s
 * `IconButtonProps` extends `ButtonHTMLAttributes`, so `aria-label` is not
 * TS-required — it is forwarded through `...props` like any other native
 * button attribute. This suite verifies the forwarding contract (an
 * icon-only button is unlabeled unless the caller supplies `aria-label`)
 * rather than inventing a runtime-enforced required prop `main` never had.
 */
describe("IconButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("forwards a passed aria-label to the underlying button", () => {
    render(
      <IconButton aria-label="Reload data">
        <span data-testid="icon" />
      </IconButton>,
    );

    expect(
      screen.getByRole("button", { name: "Reload data" }),
    ).toBeInTheDocument();
  });

  it("applies the md size class by default", () => {
    render(<IconButton aria-label="Action">icon</IconButton>);

    expect(screen.getByRole("button", { name: "Action" })).toHaveClass(
      "h-9",
      "w-9",
    );
  });

  it("applies the sm and lg size variant classes", () => {
    const { rerender } = render(
      <IconButton aria-label="Action" size="sm">
        icon
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Action" })).toHaveClass(
      "h-7",
      "w-7",
    );

    rerender(
      <IconButton aria-label="Action" size="lg">
        icon
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Action" })).toHaveClass(
      "h-10",
      "w-10",
    );
  });

  it("defaults to type=button so it never submits an ancestor form", () => {
    render(<IconButton aria-label="Action">icon</IconButton>);

    expect(screen.getByRole("button", { name: "Action" })).toHaveAttribute(
      "type",
      "button",
    );
  });
});
