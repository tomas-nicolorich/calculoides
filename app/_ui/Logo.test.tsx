// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Logo } from "./Logo";

/**
 * PR 4 (spec `ui-design-system`). DEVIATION (see tasks.md 4.12): the spec
 * wording says "size variant if `main`'s API has one" — `main`'s actual
 * `shared/ui/Logo.tsx` (`LogoProps { className?: string }`) has no size
 * prop at all, only `className` passthrough on the root `<svg>`. This suite
 * never invents a `size` variant `main` doesn't have.
 */
describe("Logo", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the ported brand mark svg", () => {
    render(<Logo />);

    expect(screen.getByTestId("brand-mark")).toBeInTheDocument();
  });

  it("passes className through to the root svg", () => {
    render(<Logo className="h-8 w-8" />);

    expect(screen.getByTestId("brand-mark")).toHaveClass("h-8", "w-8");
  });

  it("hides the decorative mark from assistive tech", () => {
    render(<Logo />);

    expect(screen.getByTestId("brand-mark")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
