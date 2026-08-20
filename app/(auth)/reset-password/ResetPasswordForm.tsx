"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { Button } from "../../_ui";
import { AuthCard, FormField, FormError } from "../_components/AuthCard";

function useRecoverySession(): boolean | null {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

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

  return hasSession;
}

function LinkExpired() {
  return (
    <AuthCard
      title="Link Expired"
      subtitle="This reset link is invalid or has expired"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
        Reset links expire after 30 minutes. Request a new one below.
      </p>
      <Link
        href="/forgot-password"
        className="block w-full text-center rounded-md bg-brand-balance text-white h-10 leading-10 font-semibold"
      >
        Request New Link
      </Link>
    </AuthCard>
  );
}

function validatePasswordUpdate(
  password: string,
  confirm: string,
): string | null {
  if (password !== confirm) return "Passwords do not match.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

/**
 * Supabase's password-recovery link signs the browser into a short-lived
 * recovery session client-side (it never touches this app's own cookie
 * session flow). This form checks for that session directly via the
 * browser client instead of the shared `useAuth()` context, which is not
 * ported in this phase.
 */
export function ResetPasswordForm() {
  const hasSession = useRecoverySession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (hasSession === null) return null;
  if (!hasSession) return <LinkExpired />;

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();

    const validationError = validatePasswordUpdate(password, confirm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push("/groups");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Set New Password"
      subtitle="Choose a strong password for your account"
    >
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-4"
      >
        <FormField
          id="password"
          label="New Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          className="dark:bg-slate-800"
        />
        <FormField
          id="confirm"
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={setConfirm}
          className="dark:bg-slate-800"
        />

        <FormError message={error} />

        <Button
          type="submit"
          className="w-full h-10 mt-2"
          disabled={submitting}
        >
          {submitting ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </AuthCard>
  );
}
