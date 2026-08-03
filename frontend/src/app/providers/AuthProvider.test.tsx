import { ReactNode } from "react";
import { render, waitFor, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./AuthContext";
import { supabase } from "../../shared/api/supabase";
import { QueryWrapper, createTestQueryClient } from "../../test/queryTestUtils";

/**
 * `AuthProvider` calls `useQueryClient()` unconditionally (A6/A7), which
 * throws without a `QueryClientProvider` ancestor — every render in this
 * file needs one. Returns the client so D5 cache-clear tests can seed/read
 * it directly.
 */
function renderAuthProvider(
  children: ReactNode,
  client: QueryClient = createTestQueryClient(),
) {
  const result = render(
    <QueryWrapper client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryWrapper>,
  );
  return { client, ...result };
}

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

    /* eslint-disable @typescript-eslint/no-deprecated, @typescript-eslint/unbound-method -- mocking the deprecated overload the app still uses */
    const onAuthStateChangeMock = supabase.auth.onAuthStateChange as ReturnType<
      typeof vi.fn
    >;
    /* eslint-enable @typescript-eslint/no-deprecated, @typescript-eslint/unbound-method */
    onAuthStateChangeMock.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        authChangeCallback = cb;
        // Real supabase-js fires INITIAL_SESSION synchronously/soon after
        // subscribing, on top of the getSession().then() resolution.
        void Promise.resolve().then(() => {
          authChangeCallback("INITIAL_SESSION", mockSession);
        });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
  });

  it("fetches /me only once on initial mount, not once per getSession + onAuthStateChange(INITIAL_SESSION)", async () => {
    renderAuthProvider(<div>child</div>);

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
    renderAuthProvider(<div>child</div>);

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
    renderAuthProvider(<div>child</div>);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    authChangeCallback("SIGNED_IN", mockSession);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does refetch /me on SIGNED_IN for a different user (real sign-in after sign-out)", async () => {
    renderAuthProvider(<div>child</div>);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    authChangeCallback("SIGNED_IN", { ...mockSession, user: { id: "user-2" } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

function SessionErrorProbe() {
  const { sessionError } = useAuth();
  return <div data-testid="session-error-probe">{sessionError ?? ""}</div>;
}

describe("AuthProvider session-load safety timeout (BUG-007)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    /* eslint-disable @typescript-eslint/no-deprecated -- mocking the deprecated overload the app still uses */
    (
      supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>
    ).mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
    /* eslint-enable @typescript-eslint/no-deprecated */
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets sessionError (not just loading=false) when the 5s safety timeout fires before getSession() resolves", async () => {
    // Simulate a hung network call: getSession() never resolves during this test.
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {
        // intentionally never settles
      }),
    );

    renderAuthProvider(<SessionErrorProbe />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByTestId("session-error-probe").textContent).not.toBe("");
  });
});

describe("AuthProvider cache clear on sign-out (D5)", () => {
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

    /* eslint-disable @typescript-eslint/no-deprecated, @typescript-eslint/unbound-method -- mocking the deprecated overload the app still uses */
    const onAuthStateChangeMock = supabase.auth.onAuthStateChange as ReturnType<
      typeof vi.fn
    >;
    /* eslint-enable @typescript-eslint/no-deprecated, @typescript-eslint/unbound-method */
    onAuthStateChangeMock.mockImplementation(
      (cb: (event: string, session: unknown) => void) => {
        authChangeCallback = cb;
        void Promise.resolve().then(() => {
          authChangeCallback("INITIAL_SESSION", mockSession);
        });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
  });

  it("clears the query cache when the session transitions to signed-out (shared-device scenario)", async () => {
    const { client } = renderAuthProvider(<div>child</div>);

    // Wait for the initial SIGNED_IN-equivalent event to establish the
    // cache-owner baseline before seeding — otherwise the seed would race
    // the baseline-establishing (non-clearing) first observation.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      client.setQueryData(["group", "g1", "summary"], { total: 42 });
    });
    expect(client.getQueryData(["group", "g1", "summary"])).toEqual({
      total: 42,
    });

    authChangeCallback("SIGNED_OUT", null);

    await waitFor(() => {
      expect(client.getQueryData(["group", "g1", "summary"])).toBeUndefined();
    });
  });

  it("does not clear the cache on a token refresh for the same user", async () => {
    const { client } = renderAuthProvider(<div>child</div>);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      client.setQueryData(["group", "g1", "summary"], { total: 42 });
    });

    authChangeCallback("TOKEN_REFRESHED", mockSession);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(client.getQueryData(["group", "g1", "summary"])).toEqual({
      total: 42,
    });
  });

  it("does not clear the cache when SIGNED_IN re-emits for the same user (tab refocus)", async () => {
    const { client } = renderAuthProvider(<div>child</div>);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      client.setQueryData(["group", "g1", "summary"], { total: 42 });
    });

    authChangeCallback("SIGNED_IN", mockSession);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(client.getQueryData(["group", "g1", "summary"])).toEqual({
      total: 42,
    });
  });
});
