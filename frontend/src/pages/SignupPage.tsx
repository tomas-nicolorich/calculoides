import { Navigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthContext";
import { SignupForm } from "../features/auth/ui/SignupForm";
import { AuthBrand } from "../features/auth";
import { ThemeIconToggle } from "../features/theme-toggle/ui/ThemeIconToggle";

export function SignupPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/groups" replace />;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeIconToggle />
      </div>
      <AuthBrand />
      <SignupForm />
    </div>
  );
}
