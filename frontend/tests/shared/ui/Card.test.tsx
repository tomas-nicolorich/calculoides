import { render, screen } from "@testing-library/react";
import { Card } from "../../../src/shared/ui/Card";
import { describe, it, expect } from "vitest";

describe("Card Component", () => {
  it("renders children correctly", () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<Card title="Card Title">Content</Card>);
    expect(screen.getByText("Card Title")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders a left accent edge by default when accent is set", () => {
    const { container } = render(<Card accent="income">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.style.borderLeftWidth).toBe("3px");
    expect(card.style.borderTopWidth).toBe("");
  });

  it('renders a top accent edge when accentSide is "top"', () => {
    const { container } = render(
      <Card accent="balance" accentSide="top">
        Content
      </Card>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.style.borderTopWidth).toBe("3px");
    expect(card.style.borderLeftWidth).toBe("");
  });

  it("applies no accent edge when accent is absent", () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.style.borderLeftWidth).toBe("");
    expect(card.style.borderTopWidth).toBe("");
  });

  it("renders its content when hover is enabled", () => {
    render(<Card hover>Hoverable</Card>);
    expect(screen.getByText("Hoverable")).toBeInTheDocument();
  });
});
