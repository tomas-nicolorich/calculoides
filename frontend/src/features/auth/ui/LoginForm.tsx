import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../../shared/api/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../../../shared/ui/Card";
import { Alert, Button, Input, IconButton } from "../../../shared/ui";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          setError("Incorrect email or password. Double-check and try again.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      } else {
        void navigate("/groups");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Sign In
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Access your group budget overview
        </p>
      </div>

      <form
        onSubmit={(e) => {
          void handleSignIn(e);
        }}
        className="space-y-4"
      >
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
            autoComplete="email"
            autoFocus
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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
              autoComplete="current-password"
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-brand-balance pr-10"
            />
            <IconButton
              type="button"
              size="sm"
              hover="neutral"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => {
                setShowPassword((prev) => !prev);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </IconButton>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-brand-balance hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>

        {error && <Alert>{error}</Alert>}

        <Button
          type="submit"
          variant="cta"
          className="w-full h-10 mt-6"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-brand-balance hover:underline font-medium transition-colors duration-200"
          >
            Sign Up
          </Link>
        </div>
      </form>
    </Card>
  );
}
