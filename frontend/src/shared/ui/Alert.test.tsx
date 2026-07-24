import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("renders an accessible alert region with the message", () => {
    render(<Alert>Something went wrong.</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong.");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("renders the action button and fires onClick when provided", () => {
    const onRetry = vi.fn();
    render(
      <Alert action={{ label: "Try again", onClick: onRetry }}>
        We couldn't verify your session.
      </Alert>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render a button when no action is provided", () => {
    render(<Alert>Message only.</Alert>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
