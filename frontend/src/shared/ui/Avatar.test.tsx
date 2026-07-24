import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders initials with dark text on a low-contrast member colour (emerald, member-1)", () => {
    render(<Avatar name="Alice" colorIndex={0} />);
    const avatar = screen.getByText("AL");
    expect(avatar).toHaveStyle({ color: "#0f172a" });
  });

  it("renders initials with dark text on amber (member-4), the worst white-text offender", () => {
    render(<Avatar name="Dana" colorIndex={3} />);
    const avatar = screen.getByText("DA");
    expect(avatar).toHaveStyle({ color: "#0f172a" });
  });

  it("still picks a background from the CSS custom property, not the raw hex", () => {
    render(<Avatar name="Alice" colorIndex={0} />);
    const avatar = screen.getByText("AL");
    expect(avatar).toHaveStyle({ background: "var(--color-member-1)" });
  });

  it("an explicit color override still gets a contrast-safe text colour", () => {
    render(<Avatar name="Eve" color="#f59e0b" />);
    const avatar = screen.getByText("EV");
    expect(avatar).toHaveStyle({ color: "#0f172a" });
  });
});
