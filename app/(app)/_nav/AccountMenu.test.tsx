// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AccountMenu } from "./AccountMenu";

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }));

vi.mock("../../../lib/actions/session", () => ({ signOut: signOutMock }));

const USER = { id: "user-1", name: "Ana", email: "a@b.com" };

describe("AccountMenu", () => {
  afterEach(() => {
    cleanup();
    signOutMock.mockReset();
  });

  // "Account Menu Exposes Identity and Sign-Out" — name/email from props.
  it("renders the signed-in user's name and email", () => {
    render(<AccountMenu user={USER} />);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
  });

  // "Signing out clears the session and redirects" — asserts the Server
  // Action is called; its internals are covered by PR 8's own tests.
  it("calls signOut() when Sign out is selected", () => {
    render(<AccountMenu user={USER} />);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
