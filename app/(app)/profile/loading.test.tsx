// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ProfileLoading from "./loading";

/**
 * task 2.10 (route-loading-states: "Every `(app)` Route Segment Renders a
 * Page-Shaped Skeleton Fallback"). Shaped like `ProfileClient`'s populated
 * layout: `max-w-2xl` container, header + two Card blocks (Personal
 * Information + Security).
 */
describe("profile/loading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the max-w-2xl container", () => {
    const { container } = render(<ProfileLoading />);

    expect(container.firstElementChild).toHaveClass(
      "max-w-2xl",
      "mx-auto",
      "space-y-8",
    );
  });

  it("renders exactly two skeleton Card blocks", () => {
    render(<ProfileLoading />);

    expect(screen.getAllByTestId("profile-loading-card")).toHaveLength(2);
  });
});
