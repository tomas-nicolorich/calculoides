import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ReactNode } from "react";
import { Spinner } from "../../shared/ui";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, profileIncomplete } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute: Checking state...", {
    loading,
    userEmail: user?.email,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-slate-400 dark:text-slate-500 animate-pulse">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("ProtectedRoute: No user found, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profileIncomplete) {
    return <Navigate to="/complete-profile" replace />;
  }

  console.log("ProtectedRoute: Access granted");
  return <>{children}</>;
}
