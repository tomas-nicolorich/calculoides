import { Navigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthContext";
import { SignupForm } from "../features/auth";

export function SignupPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/groups" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <SignupForm />
    </div>
  );
}
