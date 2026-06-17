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

  it("renders nothing when auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signOut: () => Promise.resolve(),
    });

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
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
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/Password/i), {
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

  it("renders brand mark, theme toggle, remember-me, forgot-password, and group subtitle", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
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
      screen.getByRole("checkbox", { name: /remember me/i }),
    ).toBeChecked();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByText(/group budget overview/i)).toBeInTheDocument();
    expect(screen.queryByText(/household/i)).not.toBeInTheDocument();
  });

  it("displays authentication error on failure", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
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
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });
  });
});
