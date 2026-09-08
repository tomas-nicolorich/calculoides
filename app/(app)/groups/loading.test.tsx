// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import GroupsLoading from "./loading";

/**
 * task 2.10 (route-loading-states: "Every `(app)` Route Segment Renders a
 * Page-Shaped Skeleton Fallback"). Shaped like `GroupsClient`'s populated
 * layout: `max-w-4xl` container, header block + group-card grid.
 */
describe("groups/loading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the max-w-4xl container", () => {
    const { container } = render(<GroupsLoading />);

    expect(container.firstElementChild).toHaveClass(
      "max-w-4xl",
      "mx-auto",
      "space-y-8",
    );
  });

  it("renders a header block and a group-card grid of skeleton nodes", () => {
    const { container } = render(<GroupsLoading />);

    expect(screen.getByTestId("groups-loading-grid")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      2,
    );
  });
});
