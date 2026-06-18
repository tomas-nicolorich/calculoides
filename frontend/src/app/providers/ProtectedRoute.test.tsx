import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import type { User, Session } from "@supabase/supabase-js";

// Mock AuthContext
vi.mock("./AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "./AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";

describe("ProtectedRoute", () => {
  it("renders children when profileIncomplete is false", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1" } as unknown as User,
      session: {} as unknown as Session,
      loading: false,
      profileIncomplete: false,
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>App content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText("App content")).toBeDefined();
  });

  it("redirects to /complete-profile when profileIncomplete is true", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1" } as unknown as User,
      session: {} as unknown as Session,
      loading: false,
      profileIncomplete: true,
      signOut: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={["/groups"]}>
        <Routes>
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div>App content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/complete-profile"
            element={<div>Complete profile</div>}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Complete profile")).toBeDefined();
    expect(screen.queryByText("App content")).toBeNull();
  });
});
