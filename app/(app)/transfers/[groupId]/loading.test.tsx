// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import TransfersLoading from "./loading";

/**
 * task 2.10 (route-loading-states: "Every `(app)` Route Segment Renders a
 * Page-Shaped Skeleton Fallback"). Shaped like `TransfersClient`'s populated
 * layout: `max-w-4xl` container, header + transfer rows.
 */
describe("transfers/[groupId]/loading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the max-w-4xl container", () => {
    const { container } = render(<TransfersLoading />);

    expect(container.firstElementChild).toHaveClass(
      "max-w-4xl",
      "mx-auto",
      "space-y-8",
    );
  });

  it("renders transfer-row skeleton nodes", () => {
    const { container } = render(<TransfersLoading />);

    expect(screen.getByTestId("transfers-loading-rows")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      2,
    );
  });
});
