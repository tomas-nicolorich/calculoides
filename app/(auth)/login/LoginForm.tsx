"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Lean port of `frontend/src/features/auth/ui/LoginForm.tsx` for the
 * cookie-session (`@supabase/ssr`) flow. Deliberately does not pull in the
 * `shared/ui` atom library or `react-router-dom` — those are wired for the
 * Vite app and porting the full atom tree here would blow past this
 * phase's ~600-700 line review budget for a component that gets replaced
 * again once `components/**` migrates (design.md File Changes). Visual
 * base styling for the inputs comes from `app/globals.css`'s `@layer base`
 * rules (ported verbatim from `frontend/src/app/index.css`).
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignIn = async (event: SyntheticEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Incorrect email or password. Double-check and try again."
          : "Something went wrong. Please try again.",
      );
      setLoading(false);
      return;
    }

    router.push("/groups");
    router.refresh();
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Sign In
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Access your group budget overview
        </p>
      </div>

      <form
        onSubmit={(event) => {
          void handleSignIn(event);
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
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            required
            autoComplete="email"
            autoFocus
            className="w-full rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            required
            autoComplete="current-password"
            className="w-full rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-brand-balance hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="text-sm text-brand-expense">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 mt-6 rounded-md bg-brand-balance text-white font-medium disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-brand-balance hover:underline font-medium"
          >
            Sign Up
          </Link>
        </div>
      </form>
    </div>
  );
}
