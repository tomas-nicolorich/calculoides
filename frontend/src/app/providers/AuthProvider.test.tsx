import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { supabase } from "../../shared/api/supabase";

vi.mock("../../shared/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const mockSession = {
  access_token: "token-abc",
  user: { id: "user-1" },
};

describe("AuthProvider /me fetch dedup", () => {
  let authChangeCallback: (event: string, session: unknown) => void;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- mocking the deprecated overload the app still uses
    (
      supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>
    ).mockImplementation((cb: (event: string, session: unknown) => void) => {
      authChangeCallback = cb;
      // Real supabase-js fires INITIAL_SESSION synchronously/soon after
      // subscribing, on top of the getSession().then() resolution.
      void Promise.resolve().then(() => {
        authChangeCallback("INITIAL_SESSION", mockSession);
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  it("fetches /me only once on initial mount, not once per getSession + onAuthStateChange(INITIAL_SESSION)", async () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    // give the INITIAL_SESSION microtask a chance to also fire
    await waitFor(() => {
      expect(authChangeCallback).toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not refetch /me on TOKEN_REFRESHED (tab refocus), only on real sign-in", async () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    authChangeCallback("TOKEN_REFRESHED", mockSession);

    // Give any (buggy) refetch a chance to happen before asserting.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not refetch /me when _recoverAndRefresh re-emits SIGNED_IN for the same user on tab refocus", async () => {
    // supabase-js's GoTrueClient#_recoverAndRefresh fires on every
    // visibilitychange and calls _notifyAllSubscribers('SIGNED_IN', session)
    // even when it's just recovering an already-valid cached session for the
    // same user — not just on a real login. Event name alone can't
    // distinguish these cases.
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    authChangeCallback("SIGNED_IN", mockSession);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does refetch /me on SIGNED_IN for a different user (real sign-in after sign-out)", async () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    authChangeCallback("SIGNED_IN", { ...mockSession, user: { id: "user-2" } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
