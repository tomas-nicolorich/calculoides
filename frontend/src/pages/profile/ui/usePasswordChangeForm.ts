import { useState } from "react";
import { supabase } from "../../../shared/api/supabase";

const PASSWORD_MIN_LENGTH = 6;

function validate(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): string | null {
  if (!currentPassword) return "Enter your current password.";
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return `New password must be at least ${String(PASSWORD_MIN_LENGTH)} characters long.`;
  }
  if (newPassword !== confirmPassword) return "New passwords don't match.";
  return null;
}

// Returns false without throwing on a wrong current password, so the caller
// can bail out with this specific message instead of falling through to a
// generic catch-all error.
async function reauthenticate(
  email: string | undefined,
  currentPassword: string,
  setError: (message: string) => void,
): Promise<boolean> {
  if (!email) throw new Error("Missing account email");
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (error) {
    setError("Current password is incorrect.");
    return false;
  }
  return true;
}

async function attemptPasswordChange(
  email: string | undefined,
  currentPassword: string,
  newPassword: string,
  setError: (message: string) => void,
): Promise<boolean> {
  if (!(await reauthenticate(email, currentPassword, setError))) return false;
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return true;
}

export function usePasswordChangeForm(email: string | undefined) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearStatus = () => {
    setSuccess(false);
    setError(null);
  };

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const validationError = validate(
      currentPassword,
      newPassword,
      confirmPassword,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    clearStatus();
    try {
      const changed = await attemptPasswordChange(
        email,
        currentPassword,
        newPassword,
        setError,
      );
      if (!changed) return;
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("We couldn't update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showPasswords,
    setShowPasswords,
    loading,
    success,
    error,
    clearStatus,
    submit,
    minLength: PASSWORD_MIN_LENGTH,
    submitDisabled:
      loading || !currentPassword || !newPassword || !confirmPassword,
  };
}
