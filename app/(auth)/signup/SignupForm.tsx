"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { upsert } from "../../../lib/actions/user";
import { Button } from "../../_ui";
import { AuthCard, FormField, FormError } from "../_components/AuthCard";

// Isolates the two-step signUp-then-provision-profile flow so the form's
// own submit handler only has to branch on its result, not on Supabase's
// auth error plus the session-presence check separately. Profile creation
// calls the `upsert` Server Action (3b.7) directly — it resolves the id
// from the session cookie, not a client-supplied token, so it only runs
// once `supabase.auth.signUp()` has actually established a session (email
// confirmation may defer that; profile creation stays best-effort here).
async function signUpAndProvisionProfile(
  email: string,
  password: string,
  name: string,
): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) return authError.message;

    if (data.session) {
      await upsert({ name });
    }
    return null;
  } catch {
    return "Something went wrong. Please try again.";
  }
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
          className="dark:bg-slate-800"
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={setEmail}
          className="dark:bg-slate-800"
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          className="dark:bg-slate-800"
        />
        <div className="space-y-2">
          <FormField
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={setConfirmPassword}
            className="dark:bg-slate-800"
          />
          <PasswordMismatchWarning show={passwordsDoNotMatch} />
        </div>

        <FormError message={error} />

        <Button
          type="submit"
          variant="income"
          className="w-full h-10 mt-6"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </Button>

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
