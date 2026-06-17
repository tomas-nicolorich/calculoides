import { useState } from "react";
import { supabase } from "../../../shared/api/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../../../shared/ui/Card";
import { Button, Input } from "../../../shared/ui";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      void navigate("/groups");
    }
    setLoading(false);
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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="rounded"
              aria-label="Remember me"
            />
            Remember me
          </label>
          <a
            href="#"
            className="text-sm text-brand-balance hover:underline font-medium"
          >
            Forgot password?
          </a>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium text-center">
              {error}
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-brand-balance hover:bg-brand-balance/90 text-white shadow-sm font-semibold h-10 mt-6 cursor-pointer"
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
