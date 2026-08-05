"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { AuthCard, FormField, FormError } from "../_components/AuthCard";

async function extractErrorMessage(response: Response): Promise<string | null> {
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

// Depends on the legacy `/api/users` dispatcher, only reachable from
// inside this Next.js app once the legacy adapter Route Handler lands
// (Phase 1b: `app/api/[...legacy]/route.ts`). Until then this fetch
// 404s against Next's own router — sign-up still succeeds via Supabase
// auth, but the profile-name upsert is deferred.
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
  if (response.ok) return null;
  return extractErrorMessage(response);
}

// Isolates the two-step signUp-then-provision-profile flow so the form's
// own submit handler only has to branch on its result, not on Supabase's
// auth error plus the token-presence check separately.
async function signUpAndProvisionProfile(
  email: string,
  password: string,
  name: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) return authError.message;

  const token = data.session?.access_token;
  if (token) {
    // Profile creation is best-effort in 1a — see `createUserProfile`.
    await createUserProfile(token, name);
  }
  return null;
}

function arePasswordsMismatched(password: string, confirmPassword: string) {
  return confirmPassword.length > 0 && confirmPassword !== password;
}

function PasswordMismatchWarning({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="text-brand-expense text-sm">Passwords do not match</p>;
}

function SignupSuccess({ email }: { email: string }) {
  return (
    <AuthCard
      title="Check your email"
      subtitle={`We've sent a confirmation link to ${email}.`}
    >
      <Link
        href="/login"
        className="block w-full text-center rounded-md border border-slate-200 dark:border-slate-800 h-10 leading-10 font-medium"
      >
        Back to Login
      </Link>
    </AuthCard>
  );
}

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsDoNotMatch = arePasswordsMismatched(password, confirmPassword);

  const handleSignUp = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (passwordsDoNotMatch) return;
    setLoading(true);
    setError(null);

    const signUpError = await signUpAndProvisionProfile(email, password, name);
    setError(signUpError);
    setSuccess(signUpError === null);
    setLoading(false);
  };

  if (success) {
    return <SignupSuccess email={email} />;
  }

  return (
    <AuthCard
      title="Create an Account"
      subtitle="Start managing your household budget"
    >
      <form
        onSubmit={(event) => {
          void handleSignUp(event);
        }}
        className="space-y-4"
      >
        <FormField
          id="name"
          label="Name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={setName}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={setEmail}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
        />
        <div className="space-y-2">
          <FormField
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          <PasswordMismatchWarning show={passwordsDoNotMatch} />
        </div>

        <FormError message={error} />

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
    </AuthCard>
  );
}
