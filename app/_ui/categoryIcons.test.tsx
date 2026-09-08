// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CATEGORY_ICON_GROUPS, CategoryIconTile } from "./categoryIcons";

/**
 * PR 15 (task 15.0, spec `ui-design-system`): ported verbatim from `main`'s
 * `shared/lib/categoryIcons.tsx`. Not exhaustive over all ~200 icon keys —
 * asserts the grouped-lookup shape and `CategoryIconTile`'s known/unknown
 * fallback contract, the behavior `IconPicker` (15.0's other half) depends
 * on.
 */
describe("categoryIcons", () => {
  afterEach(() => {
    cleanup();
  });

  it("groups icons under labelled sections, including the known 'rent' key in General", () => {
    const general = CATEGORY_ICON_GROUPS.find((g) => g.label === "General");

    expect(general).toBeDefined();
    expect(general?.icons.rent).toBeDefined();
  });

  it("has more than one group and more than one icon per group", () => {
    expect(CATEGORY_ICON_GROUPS.length).toBeGreaterThan(1);
    for (const group of CATEGORY_ICON_GROUPS) {
      expect(Object.keys(group.icons).length).toBeGreaterThan(0);
    }
  });

  describe("CategoryIconTile", () => {
    it("renders a known icon key with a matching accessible label", () => {
      render(<CategoryIconTile icon="rent" />);

      expect(screen.getByRole("img", { name: "rent" })).toBeInTheDocument();
    });

    it("falls back to the 'other' label for an unknown or undefined icon key", () => {
      render(<CategoryIconTile icon="not-a-real-icon-key" />);

      expect(screen.getByRole("img", { name: "other" })).toBeInTheDocument();

      cleanup();
      render(<CategoryIconTile />);
      expect(screen.getByRole("img", { name: "other" })).toBeInTheDocument();
    });

    it("applies the size variant's tile class", () => {
      render(<CategoryIconTile icon="rent" size="lg" data-testid="tile" />);

      expect(screen.getByTestId("tile").className).toContain("h-12");
    });

    it("forwards a custom className alongside the size class", () => {
      render(
        <CategoryIconTile icon="rent" className="extra-class" data-testid="tile" />,
      );

      expect(screen.getByTestId("tile").className).toContain("extra-class");
    });
  });
});
