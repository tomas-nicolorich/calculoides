import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("always renders white initials, even on member-1 (emerald)", () => {
    render(<Avatar name="Alice" colorIndex={0} />);
    const avatar = screen.getByText("AL");
    expect(avatar).toHaveStyle({ color: "#ffffff" });
  });

  it("always renders white initials on member-4 (amber), the worst white-text offender", () => {
    render(<Avatar name="Dana" colorIndex={3} />);
    const avatar = screen.getByText("DA");
    expect(avatar).toHaveStyle({ color: "#ffffff" });
  });

  it("still picks a background from the CSS custom property, not the raw hex", () => {
    render(<Avatar name="Alice" colorIndex={0} />);
    const avatar = screen.getByText("AL");
    expect(avatar).toHaveStyle({ background: "var(--color-member-1)" });
  });

  it("darkens an explicit color override until white text is contrast-safe", () => {
    render(<Avatar name="Eve" color="#f59e0b" />);
    const avatar = screen.getByText("EV");
    expect(avatar).toHaveStyle({ color: "#ffffff", background: "#9e6506" });
  });
});
