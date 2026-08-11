// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Input } from "./index";

/**
 * `main`'s `Input` is defined inline in `shared/ui/index.tsx` (no dedicated
 * error-state prop — errors are surfaced by the consumer via `className`).
 * This suite targets the barrel's exported `Input` per task 3.5.
 */
describe("Input", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders as a controlled input and forwards value changes via onChange", () => {
    const onChange = vi.fn();

    render(<Input value="" onChange={onChange} placeholder="Amount" />);

    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "5" },
    });

    expect(onChange).toHaveBeenCalled();
  });

  it("renders a prefix affordance and pads the input for it", () => {
    render(<Input prefix="$" placeholder="Amount" />);

    expect(screen.getByText("$")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Amount")).toHaveClass("pl-6");
  });

  it("merges a caller-provided className with the ported base classes", () => {
    render(<Input placeholder="Amount" className="border-red-500" />);

    expect(screen.getByPlaceholderText("Amount")).toHaveClass(
      "border-red-500",
      "rounded-xl",
    );
  });
});
