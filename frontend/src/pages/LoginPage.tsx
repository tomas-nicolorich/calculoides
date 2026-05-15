import { Navigate } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';
import { LoginForm } from '../features/auth/ui/LoginForm';

export function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <LoginForm />
    </div>
  );
}
