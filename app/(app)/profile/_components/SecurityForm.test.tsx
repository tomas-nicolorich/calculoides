// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SecurityForm } from "./SecurityForm";

const { signInWithPasswordMock, updateUserMock } = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("../../../../lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      updateUser: updateUserMock,
    },
  }),
}));

function fillPasswords({
  current = "old-secret",
  next = "new-secret",
  confirm = "new-secret",
}: { current?: string; next?: string; confirm?: string } = {}) {
  fireEvent.change(screen.getByLabelText("Current Password"), {
    target: { value: current },
  });
  fireEvent.change(screen.getByLabelText("New Password"), {
    target: { value: next },
  });
  fireEvent.change(screen.getByLabelText("Confirm New Password"), {
    target: { value: confirm },
  });
}

describe("SecurityForm", () => {
  afterEach(() => {
    cleanup();
    signInWithPasswordMock.mockReset();
    updateUserMock.mockReset();
  });

  it("re-authenticates and updates the password on success, then clears the fields", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    updateUserMock.mockResolvedValue({ error: null });

    render(<SecurityForm email="jane@example.com" />);
    fillPasswords();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(
        screen.getByText("Password updated successfully!"),
      ).toBeInTheDocument();
    });
    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "old-secret",
    });
    expect(updateUserMock).toHaveBeenCalledWith({ password: "new-secret" });
    expect(screen.getByLabelText("Current Password")).toHaveValue("");
    expect(screen.getByLabelText("New Password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm New Password")).toHaveValue("");
  });

  it("rejects a new password shorter than the minimum length without calling Supabase", () => {
    render(<SecurityForm email="jane@example.com" />);
    fillPasswords({ next: "short", confirm: "short" });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "New password must be at least 6 characters long.",
    );
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched new/confirm passwords without calling Supabase", () => {
    render(<SecurityForm email="jane@example.com" />);
    fillPasswords({ next: "new-secret", confirm: "different" });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "New passwords don't match.",
    );
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("surfaces a re-authentication failure and never calls updateUser", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    render(<SecurityForm email="jane@example.com" />);
    fillPasswords();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Current password is incorrect.",
      );
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("toggles password visibility for all three fields with one control", () => {
    render(<SecurityForm email="jane@example.com" />);

    expect(screen.getByLabelText("Current Password")).toHaveAttribute(
      "type",
      "password",
    );

    // The same `toggle` element is reused across all three `PasswordField`s
    // (per `SecurityForm`'s doc comment), so it renders as three buttons —
    // clicking any one of them flips the shared `showPasswords` state.
    fireEvent.click(
      screen.getAllByRole("button", { name: "Show passwords" })[0],
    );

    expect(screen.getByLabelText("Current Password")).toHaveAttribute(
      "type",
      "text",
    );
    expect(screen.getByLabelText("New Password")).toHaveAttribute(
      "type",
      "text",
    );
    expect(screen.getByLabelText("Confirm New Password")).toHaveAttribute(
      "type",
      "text",
    );
  });
});
