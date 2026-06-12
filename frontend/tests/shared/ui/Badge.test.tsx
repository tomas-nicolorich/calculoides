import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "../../../src/shared/ui";

const tones = [
  "income",
  "balance",
  "expense",
  "transfer",
  "category",
  "neutral",
] as const;

describe("Badge", () => {
  it.each(tones)("renders the %s tone with its label", (tone) => {
    render(<Badge tone={tone}>On Track</Badge>);
    expect(screen.getByText("On Track")).toBeInTheDocument();
  });

  it("defaults to the neutral tone", () => {
    render(<Badge>Custom</Badge>);
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("renders an uppercase label when requested", () => {
    render(<Badge uppercase>delayed</Badge>);
    expect(screen.getByText("delayed")).toBeInTheDocument();
  });
});
