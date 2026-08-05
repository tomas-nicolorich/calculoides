"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

async function createUserProfile(
  token: string,
  name: string,
): Promise<string | null> {
  // Depends on the legacy `/api/users` dispatcher, only reachable from
  // inside this Next.js app once the legacy adapter Route Handler lands
  // (Phase 1b: `app/api/[...legacy]/route.ts`). Until then this fetch
  // 404s against Next's own router — sign-up still succeeds via Supabase
  // auth, but the profile-name upsert is deferred.
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
      return body.error ?? body.message ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsDoNotMatch =
    confirmPassword.length > 0 && confirmPassword !== password;

  const handleSignUp = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (passwordsDoNotMatch) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const token = data.session?.access_token;
    if (token) {
      // Profile creation is best-effort in 1a — see `createUserProfile`.
      await createUserProfile(token, name);
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Check your email
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            We&apos;ve sent a confirmation link to {email}.
          </p>
        </div>
        <Link
          href="/login"
          className="block w-full text-center rounded-md border border-slate-200 dark:border-slate-800 h-10 leading-10 font-medium"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Create an Account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Start managing your household budget
        </p>
      </div>

      <form
        onSubmit={(event) => {
          void handleSignUp(event);
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
          <input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            required
            className="w-full rounded-md px-3 py-2 text-sm"
          />
        </div>
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
            className="w-full rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
            }}
            required
            className="w-full rounded-md px-3 py-2 text-sm"
          />
          {passwordsDoNotMatch && (
            <p className="text-brand-expense text-sm">Passwords do not match</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-brand-expense text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 mt-6 rounded-md bg-brand-income text-white font-medium disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-brand-balance hover:underline font-medium"
          >
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
