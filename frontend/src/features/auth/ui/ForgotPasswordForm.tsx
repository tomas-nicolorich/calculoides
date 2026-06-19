import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck, Info } from "lucide-react";
import { supabase } from "../../../shared/api/supabase";
import { Card } from "../../../shared/ui/Card";
import { Button, Input } from "../../../shared/ui";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      <Card className="w-full max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reset Password
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Check your inbox
          </p>
        </div>

        <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl mb-4">
          <MailCheck className="text-brand-balance shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            If an account exists for{" "}
            <strong className="text-slate-900 dark:text-white">
              {email || "that address"}
            </strong>
            , a password reset link is on its way. The link expires in 30
            minutes.
          </p>
        </div>

        <Link to="/login" style={{ textDecoration: "none", display: "block" }}>
          <Button variant="balance" className="w-full h-10 font-semibold">
            Back to Sign In
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Reset Password
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          We'll email you a reset link
        </p>
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
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
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            required
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-brand-balance"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium text-center">
              {error}
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-brand-balance hover:bg-brand-balance/90 text-white shadow-sm font-semibold h-10 mt-2 cursor-pointer"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>

        <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Info className="text-slate-400 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You'll get an email with a secure link to set a new password.
            Remembered it?{" "}
            <Link
              to="/login"
              className="text-brand-balance hover:underline font-medium"
            >
              Sign in instead.
            </Link>
          </p>
        </div>
      </form>
    </Card>
  );
}
