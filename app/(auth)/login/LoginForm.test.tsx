// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LoginForm } from "./LoginForm";

const { signInWithPasswordMock, pushMock, refreshMock } = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword: signInWithPasswordMock },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

function fillCredentials() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "demo@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "hunter2" },
  });
}

describe("LoginForm", () => {
  afterEach(() => {
    cleanup();
    signInWithPasswordMock.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  // Regression: after a successful sign-in the button previously flipped
  // back to "Sign In" (via a blanket `finally { setLoading(false) }`)
  // before the /groups navigation actually painted, leaving a stretch with
  // no loading indicator at all during the redirect.
  it("keeps showing the signing-in state through a successful redirect instead of reverting to Sign In", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });

    render(<LoginForm />);
    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/groups");
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();
  });

  it("resets to Sign In and shows an error when sign-in fails", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    render(<LoginForm />);
    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Incorrect email or password. Double-check and try again.",
      );
    });
    expect(screen.getByRole("button", { name: "Sign In" })).not.toBeDisabled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
