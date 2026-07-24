import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginPage } from "@/pages/LoginPage";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthContextType } from "@/app/providers/AuthContext";
import { User, Session, AuthResponse, AuthError } from "@supabase/supabase-js";

const mockUseAuth = vi.fn<() => AuthContextType>();
const mockSignInWithPassword =
  vi.fn<(credentials: Record<string, string>) => Promise<AuthResponse>>();

// Mock AuthContext
vi.mock("@/app/providers/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Supabase client
vi.mock("@/shared/api/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: (credentials: Record<string, string>) =>
        mockSignInWithPassword(credentials),
    },
  },
}));

describe("Login Page & Form Redesign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a verifying-session spinner when auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      profileIncomplete: false,
      sessionError: null,
      retrySessionLoad: vi.fn(),
      signOut: () => Promise.resolve(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/verifying session/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Sign In/i }),
    ).not.toBeInTheDocument();
  });

  it("redirects to dashboard if user is already logged in", () => {
    const mockUser = {
      id: "123",
      email: "test@example.com",
    } as unknown as User;

    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      profileIncomplete: false,
      sessionError: null,
      retrySessionLoad: vi.fn(),
      signOut: () => Promise.resolve(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    // If redirected, LoginPage won't render the form
    expect(
      screen.queryByRole("heading", { name: /Sign In/i }),
    ).not.toBeInTheDocument();
  });

  it("renders modern styled login card and inputs when logged out", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      profileIncomplete: false,
      sessionError: null,
      retrySessionLoad: vi.fn(),
      signOut: () => Promise.resolve(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    // Verify card structure
    expect(
      screen.getByRole("heading", { name: /Sign In/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign In/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
  });

  it("handles successful sign in", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      profileIncomplete: false,
      sessionError: null,
      retrySessionLoad: vi.fn(),
      signOut: () => Promise.resolve(),
    });

    const mockUser = {} as unknown as User;
    const mockSession = {} as unknown as Session;

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  });

  it("renders brand mark, theme toggle, forgot-password, and group subtitle", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      profileIncomplete: false,
      sessionError: null,
      retrySessionLoad: vi.fn(),
      signOut: () => Promise.resolve(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Calculoides")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /remember me/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByText(/group budget overview/i)).toBeInTheDocument();
    expect(screen.queryByText(/household/i)).not.toBeInTheDocument();
  });

  it("shows the session bootstrap error with a retry action", () => {
    const retrySessionLoad = vi.fn();
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      profileIncomplete: false,
      sessionError: "Network request failed",
      retrySessionLoad,
      signOut: () => Promise.resolve(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't verify your session. Please try signing in again.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your data is safe — nothing was changed.",
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retrySessionLoad).toHaveBeenCalledTimes(1);
  });

  it("displays authentication error on failure", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      profileIncomplete: false,
      sessionError: null,
      retrySessionLoad: vi.fn(),
      signOut: () => Promise.resolve(),
    });

    const mockError = {
      message: "Invalid login credentials",
    } as unknown as AuthError;

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: mockError,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Incorrect email or password. Double-check and try again.",
        ),
      ).toBeInTheDocument();
    });
  });
});
