import { Navigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthContext";
import { LoginForm } from "../features/auth/ui/LoginForm";

export function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/groups" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-200">
      <LoginForm />
    </div>
  );
}
