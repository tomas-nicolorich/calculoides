import { useState } from "react";
import { supabase } from "../../../shared/api/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input, Card } from "../../../shared/ui";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <Card title="Check your email" className="w-full max-w-md mx-auto">
        <div className="text-center space-y-4">
          <p>We've sent a confirmation link to {email}.</p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              void navigate("/login");
            }}
          >
            Back to Login
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Create an Account" className="w-full max-w-md mx-auto">
      <form
        onSubmit={(e) => {
          void handleSignUp(e);
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
          />
        </div>
        {error && (
          <p className="text-brand-expense text-sm font-medium">{error}</p>
        )}
        <Button
          variant="balance"
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </Button>
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-balance hover:underline">
            Sign In
          </Link>
        </div>
      </form>
    </Card>
  );
}
