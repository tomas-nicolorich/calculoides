import { useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../../shared/api/supabase";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  // Supabase re-emits 'SIGNED_IN' (via _recoverAndRefresh) every time the
  // tab regains focus with a still-valid cached session, not just on real
  // login. Dedupe the /me profile check by user id instead of trusting the
  // event name, so recovering the same user doesn't refetch.
  const checkedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("AuthProvider: Initializing session...");

    // Safety timeout to ensure terminal state (BUG-007)
    const timeoutId = setTimeout(() => {
      setLoading((currentLoading) => {
        if (currentLoading) {
          console.warn(
            "AuthProvider: Session initialization timed out. Forcing loading state to false.",
          );
          return false;
        }
        return currentLoading;
      });
    }, 5000);

    // Get initial session
    void supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession }, error }) => {
        clearTimeout(timeoutId);
        if (error) {
          console.error("AuthProvider: Error getting session:", error);
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
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
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
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, profileIncomplete, signOut }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
