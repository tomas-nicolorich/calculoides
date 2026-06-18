import { useState } from "react";
import { supabase } from "../../../shared/api/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../../../shared/ui/Card";
import { Button, Input } from "../../../shared/ui";

async function createUserProfile(
  token: string,
  name: string,
): Promise<string | null> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    try {
      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };
      return body.error ?? body.message ?? "Failed to create user profile";
    } catch {
      return "Failed to create user profile";
    }
  }
  return null;
}

async function performSignUp(
  email: string,
  password: string,
  name: string,
): Promise<string | null> {
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) return authError.message;
  const token = data.session?.access_token;
  if (!token) return "Authentication error. Please try again.";
  return createUserProfile(token, name);
}

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const passwordsDoNotMatch =
    confirmPassword.length > 0 && confirmPassword !== password;

  const handleSignUp = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordsDoNotMatch) return;
    setLoading(true);
    setError(null);
    const errorMsg = await performSignUp(email, password, name);
    if (errorMsg) {
      setError(errorMsg);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Check your email
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            We've sent a confirmation link to {email}.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            void navigate("/login");
          }}
        >
          Back to Login
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Create an Account
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Start managing your household budget
        </p>
      </div>

      <form
        onSubmit={(e) => {
          void handleSignUp(e);
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-brand-balance"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-brand-balance"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-brand-balance"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
            }}
            required
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-brand-balance"
          />
          {passwordsDoNotMatch && (
            <p className="text-brand-expense text-sm">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium text-center">
              {error}
            </p>
          </div>
        )}

        <Button
          variant="income"
          type="submit"
          className="w-full mt-6"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </Button>

        <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-brand-balance hover:underline font-medium transition-colors duration-200"
          >
            Sign In
          </Link>
        </div>
      </form>
    </Card>
  );
}
