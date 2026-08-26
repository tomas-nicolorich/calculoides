"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { Button } from "../../_ui";
import {
  AuthCard,
  FormField,
  FormError,
  PasswordVisibilityToggle,
} from "../_components/AuthCard";

function toLoginErrorMessage(message: string): string {
  return message === "Invalid login credentials"
    ? "Incorrect email or password. Double-check and try again."
    : "Something went wrong. Please try again.";
}

/**
 * Lean port of `frontend/src/features/auth/ui/LoginForm.tsx` for the
 * cookie-session (`@supabase/ssr`) flow. Uses the `app/_ui` atom library
 * (`Button`, plus `Card`/`Input`/`IconButton` via `AuthCard`) for the same
 * styling `main`'s `shared/ui` atoms provide, but not `react-router-dom` —
 * that's wired for the Vite app and this uses Next's own routing instead.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignIn = async (event: SyntheticEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(toLoginErrorMessage(signInError.message));
        setLoading(false);
        return;
      }

      // Leave `loading` true: the component unmounts once /groups
      // navigates in, and resetting it here (as a blanket `finally` used
      // to) flipped the button back to "Sign In" while the RSC payload for
      // /groups was still in flight, leaving that stretch with no
      // indicator at all.
      router.push("/groups");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Sign In" subtitle="Access your group budget overview">
      <form
        onSubmit={(event) => {
          void handleSignIn(event);
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
          autoComplete="email"
          autoFocus
          className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-brand-balance"
        />
        <FormField
          id="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-brand-balance"
          endAdornment={
            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => {
                setShowPassword((prev) => !prev);
              }}
            />
          }
        />

        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-brand-balance hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <FormError message={error} />

        <Button
          type="submit"
          variant="cta"
          className="w-full h-10 mt-6"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>

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
    </AuthCard>
  );
}
