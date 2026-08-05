"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/reset-password` },
    );

    // Surface only hard failures; treat 400/404 as silent success so we
    // don't reveal whether an account exists for this email address.
    if (resetError && resetError.status !== 400 && resetError.status !== 404) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="w-full max-w-md mx-auto bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reset Password
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Check your inbox
          </p>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            If an account exists for{" "}
            <strong className="text-slate-900 dark:text-white">
              {email || "that address"}
            </strong>
            , a password reset link is on its way. The link expires in 30
            minutes.
          </p>
        </div>
        <Link
          href="/login"
          className="block w-full text-center rounded-md bg-brand-balance text-white h-10 leading-10 font-semibold"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Reset Password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          We&apos;ll email you a reset link
        </p>
      </div>

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
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
            className="w-full rounded-md px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-brand-expense text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-balance text-white font-semibold h-10 mt-2 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You&apos;ll get an email with a secure link to set a new password.
            Remembered it?{" "}
            <Link
              href="/login"
              className="text-brand-balance hover:underline font-medium"
            >
              Sign in instead.
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
