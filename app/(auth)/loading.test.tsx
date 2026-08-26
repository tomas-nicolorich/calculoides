// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import AuthLoading from "./loading";

/**
 * task 2.9 (route-loading-states: "Every `(auth)` Route Segment Renders a
 * Centered Spinner Fallback"). A single shared `app/(auth)/loading.tsx`
 * covers all five auth routes (design.md Decision 1) — no
 * `app/(auth)/layout.tsx` needed. Uses `Spinner`, never `Skeleton`, because
 * the session check determines whether any page shell applies at all.
 */
describe("(auth)/loading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a centered, full-page Spinner container", () => {
    const { container } = render(<AuthLoading />);

    expect(container.firstElementChild).toHaveClass(
      "min-h-screen",
      "flex",
      "items-center",
      "justify-center",
    );
  });

  it("renders the Spinner primitive, not a Skeleton", () => {
    const { container } = render(<AuthLoading />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "Loading");
    expect(status).toHaveClass("h-12", "w-12");
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);
  });
});
