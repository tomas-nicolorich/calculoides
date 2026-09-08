// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Button } from "./Button";

/**
 * PR 3 (spec `ui-design-system` — "Button and Badge Use the Semantic Money
 * Variant Vocabulary"): ported verbatim from `main`'s `shared/ui/Button.tsx`.
 * `main`'s `ButtonVariant` union is `balance | income | expense | transfer |
 * cta | outline | ghost` — it does not include `category` (that value is
 * Card/Badge-only on `main`), so this suite covers the four money variants
 * that exist on Button plus its non-money variants, never inventing a
 * `category` Button variant (task 3.11's "rename nothing" REFACTOR bar).
 */
describe("Button", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses the income variant's brand color token for an income-related action", () => {
    render(<Button variant="income">Save income</Button>);

    expect(screen.getByRole("button", { name: "Save income" })).toHaveClass(
      "bg-brand-income",
    );
  });

  it("uses the balance variant's brand color token by default", () => {
    render(<Button>Confirm</Button>);

    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass(
      "bg-brand-balance",
    );
  });

  it("uses the expense variant's color token", () => {
    render(<Button variant="expense">Delete expense</Button>);

    expect(screen.getByRole("button", { name: "Delete expense" })).toHaveClass(
      "bg-[#dc2626]",
    );
  });

  it("uses the transfer variant's brand color token", () => {
    render(<Button variant="transfer">Move funds</Button>);

    expect(screen.getByRole("button", { name: "Move funds" })).toHaveClass(
      "bg-brand-transfer",
    );
  });

  it("supports the cta, outline, and ghost non-money variants unrenamed", () => {
    const { rerender } = render(<Button variant="cta">Get started</Button>);
    expect(screen.getByRole("button", { name: "Get started" })).toHaveClass(
      "shadow-[var(--glow-balance)]",
    );

    rerender(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
      "border-slate-200",
    );

    rerender(<Button variant="ghost">Dismiss</Button>);
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveClass(
      "bg-transparent",
    );
  });

  it("renders disabled with the ported disabled affordance class", () => {
    render(<Button disabled>Saving</Button>);

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");
  });

  it("renders leading and trailing icons around the label", () => {
    render(
      <Button
        leadingIcon={<span data-testid="leading" />}
        trailingIcon={<span data-testid="trailing" />}
      >
        Label
      </Button>,
    );

    expect(screen.getByTestId("leading")).toBeInTheDocument();
    expect(screen.getByTestId("trailing")).toBeInTheDocument();
  });
});
