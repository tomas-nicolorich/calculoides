/* eslint-disable @typescript-eslint/unbound-method */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { User, Session } from "@supabase/supabase-js";
import { ResetPasswordForm } from "./ResetPasswordForm";

vi.mock("../../../app/providers/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

import { useAuth } from "../../../app/providers/AuthContext";
import { supabase } from "../../../shared/api/supabase";

const mockUser = { id: "u1" } as unknown as User;
const mockSession = {} as unknown as Session;

const defaultAuth = {
  user: mockUser,
  session: mockSession,
  loading: false,
  profileIncomplete: false,
  signOut: vi.fn(),
};

function mockAuth(overrides: { user?: User | null; loading?: boolean }) {
  vi.mocked(useAuth).mockReturnValue({ ...defaultAuth, ...overrides });
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/groups" element={<div>Groups page</div>} />
        <Route
          path="/forgot-password"
          element={<div>Forgot password page</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function submitPasswordForm(password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText("New Password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirm Password"), {
    target: { value: confirm },
  });
  const form = screen
    .getByRole("button", { name: /update password/i })
    .closest("form");
  if (!form) throw new Error("form not found");
  fireEvent.submit(form);
}

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while auth is loading", () => {
    mockAuth({ loading: true });
    const { container } = renderForm();
    expect(container.firstChild).toBeNull();
  });

  it("shows expired link screen when user is null", () => {
    mockAuth({ user: null });
    renderForm();
    expect(screen.getByText("Link Expired")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request new link/i }),
    ).toBeInTheDocument();
  });

  it("navigates to /forgot-password from the expired link screen", () => {
    mockAuth({ user: null });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /request new link/i }));
    expect(screen.getByText("Forgot password page")).toBeInTheDocument();
  });

  it("renders the new password form when user is present", () => {
    mockAuth({});
    renderForm();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    mockAuth({});
    renderForm();
    submitPasswordForm("password123", "different");

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });
    expect(vi.mocked(supabase.auth.updateUser)).not.toHaveBeenCalled();
  });

  it("shows error when password is shorter than 6 characters", async () => {
    mockAuth({});
    renderForm();
    submitPasswordForm("abc");

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 6 characters."),
      ).toBeInTheDocument();
    });
    expect(vi.mocked(supabase.auth.updateUser)).not.toHaveBeenCalled();
  });

  it("calls supabase.auth.updateUser with new password on valid submit", async () => {
    mockAuth({});
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    renderForm();
    submitPasswordForm("newpassword");

    await waitFor(() => {
      expect(vi.mocked(supabase.auth.updateUser)).toHaveBeenCalledWith({
        password: "newpassword",
      });
    });
  });

  it("navigates to /groups after successful password update", async () => {
    mockAuth({});
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    renderForm();
    submitPasswordForm("newpassword");

    await waitFor(() => {
      expect(screen.getByText("Groups page")).toBeInTheDocument();
    });
  });

  it("shows error message when updateUser fails", async () => {
    mockAuth({});
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Update failed" },
    } as never);

    renderForm();
    submitPasswordForm("newpassword");

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });
});
