import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar, AvatarGroup } from "../../../src/shared/ui";

describe("Avatar", () => {
  it("renders the first character of the display name as the initial", () => {
    render(<Avatar name="Tomas" />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("uppercases a lowercase initial", () => {
    render(<Avatar name="alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("ignores leading whitespace when deriving the initial", () => {
    render(<Avatar name="  bruno" />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("exposes the name as the element title", () => {
    render(<Avatar name="Carla" />);
    expect(screen.getByText("C")).toHaveAttribute("title", "Carla");
  });
});

describe("AvatarGroup", () => {
  it("shows all avatars and no overflow chip when under max", () => {
    render(
      <AvatarGroup max={3}>
        <Avatar name="Ana" />
        <Avatar name="Beto" />
      </AvatarGroup>,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
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
    // 5 members, max 3 -> 2 hidden
    expect(screen.getByText("+2")).toBeInTheDocument();
    // the 4th and 5th members' initials are not rendered
    expect(screen.queryByText("D")).not.toBeInTheDocument();
    expect(screen.queryByText("E")).not.toBeInTheDocument();
  });
});
