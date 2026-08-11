// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Alert } from "./Alert";

/**
 * PR 4 (spec `ui-design-system` — "Primitives Live at `app/_ui/**`"):
 * ported verbatim from `main`'s `shared/ui/Alert.tsx`. `main`'s `AlertTone`
 * union is `error | success` (prop name `tone`, default `error`) — it does
 * NOT include an `info` tone/variant, so this suite never invents one
 * (task 4.12's "rename nothing" REFACTOR bar; see tasks.md deviation note).
 */
describe("Alert", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders as an assertive alert with the error tone's color token by default", () => {
    render(<Alert>Something went wrong</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText("Something went wrong")).toHaveClass(
      "text-red-600",
    );
  });

  it("renders as a polite alert with the success tone's color token", () => {
    render(<Alert tone="success">Saved</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Saved")).toHaveClass("text-emerald-600");
  });

  it("renders an optional action button that fires its onClick", () => {
    const onClick = vi.fn();
    render(
      <Alert action={{ label: "Try again", onClick }}>Failed to load</Alert>,
    );

    screen.getByRole("button", { name: "Try again" }).click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
