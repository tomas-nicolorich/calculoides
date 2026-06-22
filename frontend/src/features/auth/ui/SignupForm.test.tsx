/* eslint-disable @typescript-eslint/unbound-method */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SignupForm } from "./SignupForm";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("../../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}));

import { supabase } from "../../../shared/api/supabase";

let mockFetch: ReturnType<typeof vi.fn>;

function fillForm(options: {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}) {
  if (options.name !== undefined) {
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: options.name },
    });
  }
  if (options.email !== undefined) {
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: options.email },
    });
  }
  if (options.password !== undefined) {
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: options.password },
    });
  }
  if (options.confirmPassword !== undefined) {
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: options.confirmPassword },
    });
  }
}

describe("SignupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows inline error when passwords do not match", () => {
    render(
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>,
    );

    fillForm({ password: "password123", confirmPassword: "different" });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("makes no API calls when passwords do not match on submit", async () => {
    render(
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>,
    );

    fillForm({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
      confirmPassword: "different",
    });

    const form = screen
      .getByRole("button", { name: /sign up/i })
      .closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(vi.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  it("calls supabase.auth.signUp then POST /api/users in sequence on valid submit", async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { session: { access_token: "tok-1" } },
      error: null,
    } as never);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>,
    );

    fillForm({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    const form = screen
      .getByRole("button", { name: /sign up/i })
      .closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(vi.mocked(supabase.auth.signUp)).toHaveBeenCalledWith({
        email: "alice@example.com",
        password: "password123",
      });
      expect(mockFetch).toHaveBeenCalledWith("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer tok-1",
        },
        body: JSON.stringify({ name: "Alice" }),
      });
    });

    expect(
      vi.mocked(supabase.auth.signUp).mock.invocationCallOrder[0],
    ).toBeLessThan(mockFetch.mock.invocationCallOrder[0]);
  });

  it("shows success state after both calls resolve", async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { session: { access_token: "tok-1" } },
      error: null,
    } as never);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>,
    );

    fillForm({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    const form = screen
      .getByRole("button", { name: /sign up/i })
      .closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });
  });

  it("disables submit button while loading", async () => {
    let resolveSignUp!: (value: unknown) => void;
    const signUpPromise = new Promise((resolve) => {
      resolveSignUp = resolve;
    });
    vi.mocked(supabase.auth.signUp).mockReturnValueOnce(signUpPromise as never);

    render(
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>,
    );

    fillForm({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    const form = screen
      .getByRole("button", { name: /sign up/i })
      .closest("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /creating account/i }),
      ).toBeDisabled();
    });

    act(() => {
      resolveSignUp({
        data: { session: { access_token: "tok-1" } },
        error: null,
      });
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await waitFor(() => {
      expect(screen.queryByText("Creating account...")).not.toBeInTheDocument();
    });
  });
});
