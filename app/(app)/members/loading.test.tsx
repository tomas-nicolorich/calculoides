// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import MembersLoading from "./loading";

/**
 * task 2.10 (route-loading-states: "Every `(app)` Route Segment Renders a
 * Page-Shaped Skeleton Fallback"). Shaped like `MembersClient`'s populated
 * layout: `max-w-4xl` container, header + member rows.
 */
describe("members/loading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the max-w-4xl container", () => {
    const { container } = render(<MembersLoading />);

    expect(container.firstElementChild).toHaveClass(
      "max-w-4xl",
      "mx-auto",
      "space-y-6",
    );
  });

  it("renders a header block and member-row skeleton nodes", () => {
    const { container } = render(<MembersLoading />);

    expect(screen.getByTestId("members-loading-rows")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      2,
    );
  });
});
