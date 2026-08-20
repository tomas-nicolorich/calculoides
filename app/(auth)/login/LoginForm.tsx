"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
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
        return;
      }

      router.push("/groups");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
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
        />
        <FormField
          id="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
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
    </AuthCard>
  );
}
