/* eslint-disable @typescript-eslint/unbound-method */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

vi.mock("../../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

import { supabase } from "../../../shared/api/supabase";

function renderForm() {
  return render(
    <MemoryRouter>
      <ForgotPasswordForm />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the email form initially", () => {
    renderForm();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).toBeInTheDocument();
  });

  it("shows confirmation screen after successful submission", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: null,
    });

    renderForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });

    const form = screen
      .getByRole("button", { name: /send reset link/i })
      .closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Check your inbox")).toBeInTheDocument();
    });
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("shows confirmation screen for 400 error (no account enumeration)", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: { status: 400, message: "User not found" },
    } as never);

    renderForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "nobody@example.com" },
    });

    const form = screen
      .getByRole("button", { name: /send reset link/i })
      .closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Check your inbox")).toBeInTheDocument();
    });
  });

  it("shows confirmation screen for 404 error (no account enumeration)", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: { status: 404, message: "Not found" },
    } as never);

    renderForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "nobody@example.com" },
    });

    const form = screen
      .getByRole("button", { name: /send reset link/i })
      .closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Check your inbox")).toBeInTheDocument();
    });
  });

  it("shows error message for hard API failures", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: { status: 500, message: "Internal server error" },
    } as never);

    renderForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });

    const form = screen
      .getByRole("button", { name: /send reset link/i })
      .closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
    });
  });

  it("disables submit button while request is in flight", async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(supabase.auth.resetPasswordForEmail).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }) as never,
    );

    renderForm();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });

    const form = screen
      .getByRole("button", { name: /send reset link/i })
      .closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    });

    resolve({ data: {}, error: null });
  });
});
