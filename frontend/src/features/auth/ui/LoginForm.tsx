import { useState } from 'react';
import { supabase } from '../../../shared/api/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../../../shared/ui';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      void navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { void handleSignIn(e); }} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
              required
            />
          </div>
          {error && <p className="text-destructive text-sm font-medium">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          <div className="text-center text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Sign Up
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
