"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Supabase's password-recovery link signs the browser into a short-lived
 * recovery session client-side (it never touches this app's own cookie
 * session flow). This form checks for that session directly via the
 * browser client instead of the shared `useAuth()` context, which is not
 * ported in this phase.
 */
export function ResetPasswordForm() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(session !== null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(session !== null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (hasSession === null) return null;

  if (!hasSession) {
    return (
      <div className="w-full max-w-md mx-auto bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Link Expired
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            This reset link is invalid or has expired
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
          Reset links expire after 30 minutes. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full text-center rounded-md bg-brand-balance text-white h-10 leading-10 font-semibold"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/groups");
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Set New Password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Choose a strong password for your account
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
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            New Password
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
            htmlFor="confirm"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Confirm Password
          </label>
          <input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
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
          disabled={submitting}
          className="w-full rounded-md bg-brand-balance text-white font-semibold h-10 mt-2 disabled:opacity-60"
        >
          {submitting ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
