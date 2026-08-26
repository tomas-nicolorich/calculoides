// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Spinner } from "./Spinner";

/**
 * task 1.3 (ui-design-system: "Spinner Primitive Provides a Sanctioned
 * Full-Page/Shape-Unknown Loading Indicator"). Spinner is ported verbatim
 * from `main`'s `frontend/src/shared/ui/Spinner.tsx` — see design.md
 * Interfaces/Contracts for the exact `size` vocabulary.
 */
describe("Spinner", () => {
  afterEach(() => {
    cleanup();
  });

  it("carries the required accessibility attributes", () => {
    render(<Spinner />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Loading");
  });

  it("renders the md size classes by default", () => {
    render(<Spinner data-testid="spinner" />);

    expect(screen.getByTestId("spinner")).toHaveClass("h-8", "w-8");
  });

  it("renders the sm size classes when size='sm'", () => {
    render(<Spinner data-testid="spinner" size="sm" />);

    expect(screen.getByTestId("spinner")).toHaveClass("h-6", "w-6");
  });

  it("renders the lg size classes when size='lg'", () => {
    render(<Spinner data-testid="spinner" size="lg" />);

    expect(screen.getByTestId("spinner")).toHaveClass("h-12", "w-12");
  });

  it("merges a passed className with the ported classes", () => {
    render(<Spinner data-testid="spinner" className="mx-auto" />);

    expect(screen.getByTestId("spinner")).toHaveClass("mx-auto", "h-8", "w-8");
  });
});
