import { Navigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthContext";
import { LoginForm } from "../features/auth/ui/LoginForm";
import { AuthBrand } from "../features/auth";
import { ThemeIconToggle } from "../features/theme-toggle/ui/ThemeIconToggle";
import { Alert, Spinner } from "../shared/ui";

export function LoginPage() {
  const { user, loading, sessionError, retrySessionLoad } = useAuth();

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
  if (user) return <Navigate to="/groups" replace />;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeIconToggle />
      </div>
      <AuthBrand />
      {sessionError && (
        <Alert
          className="w-full max-w-md"
          action={{ label: "Try again", onClick: retrySessionLoad }}
        >
          <p>We couldn't verify your session. Please try signing in again.</p>
          <p className="opacity-80 text-xs mt-1">
            Your data is safe — nothing was changed.
          </p>
        </Alert>
      )}
      <LoginForm />
    </div>
  );
}
