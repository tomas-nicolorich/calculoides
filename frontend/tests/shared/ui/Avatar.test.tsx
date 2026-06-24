import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar, AvatarGroup } from "../../../src/shared/ui";

describe("Avatar", () => {
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
    // 5 members, max 3 -> 2 hidden
    expect(screen.getByText("+2")).toBeInTheDocument();
    // the 4th and 5th members' initials are not rendered
    expect(screen.queryByText("DA")).not.toBeInTheDocument();
    expect(screen.queryByText("EL")).not.toBeInTheDocument();
  });
});
