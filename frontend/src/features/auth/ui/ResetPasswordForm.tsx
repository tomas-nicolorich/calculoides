import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthContext";
import { supabase } from "../../../shared/api/supabase";
import { Card } from "../../../shared/ui/Card";
import { Button, Input } from "../../../shared/ui";

export function ResetPasswordForm() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Link Expired
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            This reset link is invalid or has expired
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
          Reset links expire after 30 minutes. Request a new one below.
        </p>
        <Link
          to="/forgot-password"
          style={{ textDecoration: "none", display: "block" }}
        >
          <Button variant="balance" className="w-full h-10 font-semibold">
            Request New Link
          </Button>
        </Link>
      </Card>
    );
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

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

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    void navigate("/groups");
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Set New Password
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Choose a strong password for your account
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
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            New Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            required
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:ring-brand-balance"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirm"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Confirm Password
          </label>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
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
          disabled={submitting}
        >
          {submitting ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </Card>
  );
}
