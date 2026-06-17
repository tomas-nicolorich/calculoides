import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { ThemeIconToggle } from "./ThemeIconToggle";

describe("ThemeIconToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("renders a button with aria-label 'Toggle theme' in light mode by default", () => {
    render(<ThemeIconToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it("after one click — localStorage updated and dark class added", async () => {
    const user = userEvent.setup();
    render(<ThemeIconToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(button);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("after second click — dark class removed and localStorage set to light", async () => {
    const user = userEvent.setup();
    render(<ThemeIconToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(button);
    await user.click(button);
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
