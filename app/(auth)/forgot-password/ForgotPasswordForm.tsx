"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { AuthCard, FormField, FormError } from "../_components/AuthCard";

function ResetLinkSent({ email }: { email: string }) {
  return (
    <AuthCard title="Reset Password" subtitle="Check your inbox">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl mb-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          If an account exists for{" "}
          <strong className="text-slate-900 dark:text-white">
            {email || "that address"}
          </strong>
          , a password reset link is on its way. The link expires in 30 minutes.
        </p>
      </div>
      <Link
        href="/login"
        className="block w-full text-center rounded-md bg-brand-balance text-white h-10 leading-10 font-semibold"
      >
        Back to Sign In
      </Link>
    </AuthCard>
  );
}

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
    return <ResetLinkSent email={email} />;
  }

  return (
    <AuthCard title="Reset Password" subtitle="We'll email you a reset link">
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-4"
      >
        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={setEmail}
        />

        <FormError message={error} />

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
    </AuthCard>
  );
}
