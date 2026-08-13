// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { UserDisplay } from "./UserDisplay";

/**
 * Ported verbatim from `main`'s `shared/ui/UserDisplay.tsx` (PR 16, BUG-014:
 * strictly prioritize `User.name`). Genuine RED before this file existed —
 * module not found.
 */
describe("UserDisplay", () => {
  it("renders the user's name when present", () => {
    render(<UserDisplay user={{ name: "Alice Smith", email: "a@x.com" }} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("falls back to email when name is missing", () => {
    render(<UserDisplay user={{ email: "bob@x.com" }} />);
    expect(screen.getByText("bob@x.com")).toBeInTheDocument();
  });

  it("falls back to 'Unnamed User' when neither name nor email is present", () => {
    render(<UserDisplay user={{}} />);
    expect(screen.getByText("Unnamed User")).toBeInTheDocument();
  });

  it("renders 'Unknown User' when no user is provided", () => {
    render(<UserDisplay />);
    expect(screen.getByText("Unknown User")).toBeInTheDocument();
  });
});
