// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Card } from "./Card";

describe("Card", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children inside the ported card container classes", () => {
    render(<Card>Body content</Card>);

    const container = screen.getByText("Body content");
    expect(container).toHaveClass("rounded-2xl", "bg-card", "shadow-sm");
  });

  it("renders an optional title above the body", () => {
    render(<Card title="Groceries">Body content</Card>);

    expect(
      screen.getByRole("heading", { name: "Groceries" }),
    ).toBeInTheDocument();
  });

  it("applies a left accent edge by default when accent is set", () => {
    render(<Card accent="income">Body</Card>);

    const container = screen.getByText("Body");
    expect(container.style.borderLeftColor).toBe("var(--color-brand-income)");
  });

  it("applies a top accent edge when accentSide is top", () => {
    render(
      <Card accent="transfer" accentSide="top">
        Body
      </Card>,
    );

    const container = screen.getByText("Body");
    expect(container.style.borderTopColor).toBe("var(--color-brand-transfer)");
  });

  it("adds the hover-lift class only when hover is true", () => {
    render(<Card hover>Body</Card>);

    const container = screen.getByText("Body");
    expect(container).toHaveClass("hover:shadow-md");
  });
});
