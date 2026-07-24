import { createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileIncomplete: boolean;
  /** Message describing why the initial session bootstrap failed, if it did. */
  sessionError: string | null;
  /** Re-runs the initial session fetch (e.g. after a network failure). */
  retrySessionLoad: () => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
