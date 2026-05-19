import {
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../../shared/api/supabase";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Initializing session...");

    // Safety timeout to ensure terminal state (BUG-007)
    const timeoutId = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn('AuthProvider: Session initialization timed out. Forcing loading state to false.');
          return false;
        }
        return currentLoading;
      });
    }, 5000);

    // Get initial session
    void supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
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
        setLoading(false);
      })
      .catch((e: unknown) => {
        console.error("AuthProvider: Uncaught initialization error:", e);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
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
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
