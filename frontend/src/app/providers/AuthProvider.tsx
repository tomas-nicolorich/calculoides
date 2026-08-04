import { useCallback, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/api/supabase";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  // A6: read the client from context (not the module `queryClient`
  // singleton) so a test wrapping this provider in its own client observes
  // clears on *that* client.
  const queryClient = useQueryClient();
  // Supabase re-emits 'SIGNED_IN' (via _recoverAndRefresh) every time the
  // tab regains focus with a still-valid cached session, not just on real
  // login. Dedupe the /me profile check by user id instead of trusting the
  // event name, so recovering the same user doesn't refetch.
  const checkedUserIdRef = useRef<string | null>(null);
  // A7: mirrors checkedUserIdRef's dedupe pattern but for a different
  // purpose — clearing the cache on an owner change (privacy, D5), not
  // deduping the /me fetch. Kept separate so gating one control never
  // silently gates the other. `undefined` means "no auth event observed
  // yet"; it is distinct from `null` (observed and signed-out) so the
  // very first event (mount) only establishes the baseline and never
  // clears an already-empty cache.
  const cacheOwnerIdRef = useRef<string | null | undefined>(undefined);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetches the initial session. Extracted so both the mount effect and a
  // user-triggered "Try again" (see AuthContextType.retrySessionLoad) can
  // re-run the exact same bootstrap logic after a network failure. Callers
  // are responsible for resetting `loading`/`sessionError` before invoking
  // this on a retry — on mount the initial state values already do that.
  // Kept as an explicit .then()/.catch() chain (rather than async/await) so
  // the state updates run inside promise callbacks, not synchronously in the
  // effect body — async/await here trips react-hooks/set-state-in-effect.
  const loadInitialSession = useCallback(() => {
    console.log("AuthProvider: Initializing session...");

    // Safety timeout to ensure terminal state (BUG-007)
    timeoutIdRef.current = setTimeout(() => {
      setLoading((currentLoading) => {
        if (currentLoading) {
          console.warn(
            "AuthProvider: Session initialization timed out. Forcing loading state to false.",
          );
          setSessionError("Session verification timed out. Please try again.");
          return false;
        }
        return currentLoading;
      });
    }, 5000);

    return supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession }, error }) => {
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }
        if (error) {
          console.error("AuthProvider: Error getting session:", error);
          setSessionError(error.message);
        } else {
          console.log(
            "AuthProvider: Session retrieved successfully:",
            initialSession ? "User logged in" : "No active session",
          );
        }
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (
          initialSession?.access_token &&
          initialSession.user.id &&
          checkedUserIdRef.current !== initialSession.user.id
        ) {
          checkedUserIdRef.current = initialSession.user.id;
          try {
            const res = await fetch("/api/users/me", {
              headers: {
                Authorization: `Bearer ${initialSession.access_token}`,
              },
            });
            setProfileIncomplete(res.status === 404);
          } catch (fetchErr) {
            console.error(
              "AuthProvider: Failed to check profile status:",
              fetchErr,
            );
            setProfileIncomplete(false);
          }
        }
        setLoading(false);
      })
      .catch((e: unknown) => {
        console.error("AuthProvider: Uncaught initialization error:", e);
        setSessionError(
          e instanceof Error ? e.message : "Failed to load your session.",
        );
        setLoading(false);
      })
      .finally(() => {
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }
      });
  }, []);

  useEffect(() => {
    void loadInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // D5/A7: clear the entire cache when the signed-in owner changes —
      // session becomes null (sign-out) or a different user's session
      // arrives — but never on the first observation since mount, and
      // never when the owner id is unchanged (token refresh, or Supabase
      // re-emitting SIGNED_IN for the same user on tab refocus).
      const newOwnerId = newSession?.user.id ?? null;
      if (cacheOwnerIdRef.current === undefined) {
        cacheOwnerIdRef.current = newOwnerId;
      } else if (cacheOwnerIdRef.current !== newOwnerId) {
        queryClient.clear();
        cacheOwnerIdRef.current = newOwnerId;
      }

      if (!newSession?.access_token || !newSession.user.id) {
        checkedUserIdRef.current = null;
        setProfileIncomplete(false);
      } else if (checkedUserIdRef.current !== newSession.user.id) {
        // Supabase fires 'SIGNED_IN' both for real logins and for
        // _recoverAndRefresh() recovering an already-valid session on tab
        // refocus, so the event name alone can't distinguish them — gate on
        // user id instead.
        checkedUserIdRef.current = newSession.user.id;
        fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${newSession.access_token}` },
        })
          .then((res) => {
            setProfileIncomplete(res.status === 404);
          })
          .catch((fetchErr: unknown) => {
            console.error(
              "AuthProvider: Failed to check profile status on auth change:",
              fetchErr,
            );
            setProfileIncomplete(false);
          });
      }
      setLoading(false);
    });

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      subscription.unsubscribe();
    };
  }, [loadInitialSession, queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const retrySessionLoad = useCallback(() => {
    setLoading(true);
    setSessionError(null);
    void loadInitialSession();
  }, [loadInitialSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profileIncomplete,
        sessionError,
        retrySessionLoad,
        signOut,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
