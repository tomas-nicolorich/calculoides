// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Avatar, AvatarGroup } from "./Avatar";

/**
 * PR 5 (spec `ui-design-system` — "Primitives Live at `app/_ui/**`"):
 * ported verbatim from `main`'s `shared/ui/Avatar.tsx`. `main` keeps both
 * `Avatar` and `AvatarGroup` in the single `Avatar.tsx` file (no separate
 * `AvatarGroup.tsx`) — matched here, same "match main's actual file layout"
 * precedent PR 3 set for `Input`.
 */
describe("Avatar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders two-letter initials from a single-word name", () => {
    render(<Avatar name="Tomas" />);
    expect(screen.getByText("TO")).toBeInTheDocument();
  });

  it("uppercases initials from a lowercase name", () => {
    render(<Avatar name="alice" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("ignores leading whitespace when deriving initials", () => {
    render(<Avatar name="  bruno" />);
    expect(screen.getByText("BR")).toBeInTheDocument();
  });

  it("exposes the name as the element title", () => {
    render(<Avatar name="Carla" />);
    expect(screen.getByText("CA")).toHaveAttribute("title", "Carla");
  });
});

describe("AvatarGroup", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows all avatars and no overflow chip when under max", () => {
    render(
      <AvatarGroup max={3}>
        <Avatar name="Ana" />
        <Avatar name="Beto" />
      </AvatarGroup>,
    );
    expect(screen.getByText("AN")).toBeInTheDocument();
    expect(screen.getByText("BE")).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("renders a +N overflow chip with the correct remainder", () => {
    render(
      <AvatarGroup max={3}>
        <Avatar name="Ana" />
        <Avatar name="Beto" />
        <Avatar name="Carla" />
        <Avatar name="Dario" />
        <Avatar name="Elsa" />
      </AvatarGroup>,
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.queryByText("DA")).not.toBeInTheDocument();
    expect(screen.queryByText("EL")).not.toBeInTheDocument();
  });
});
