"use client";

import { useState, type SyntheticEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card, Button, IconButton, Alert } from "../../../_ui";
import { createClient } from "../../../../lib/supabase/client";
import { PasswordField } from "./PasswordField";

const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MIN_LENGTH_LABEL = String(PASSWORD_MIN_LENGTH);

/**
 * "Security" card on `/profile`: owns the password-change form only.
 * Extracted out of `ProfileClient` as a sibling to `PersonalInfoForm` (not
 * a shared custom hook) since neither form's state is reused anywhere else
 * — see `ProfileClient.tsx` for the full rationale.
 *
 * The password change re-authenticates and updates via the browser
 * Supabase client, exactly like
 * `app/(auth)/reset-password/ResetPasswordForm.tsx`'s `updateUser` call —
 * this must run client-side because `supabase.auth` session mutation has
 * no server-side equivalent in this app's session model.
 */
export function SecurityForm({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const clearPasswordStatus = () => {
    setPasswordSuccess(false);
    setPasswordError(null);
  };

  const handleCurrentPasswordChange = (value: string) => {
    setCurrentPassword(value);
    clearPasswordStatus();
  };
  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    clearPasswordStatus();
  };
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    clearPasswordStatus();
  };

  const toggleShowPasswords = () => {
    setShowPasswords((prev) => !prev);
  };

  const handlePasswordSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();

    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(
        `New password must be at least ${PASSWORD_MIN_LENGTH_LABEL} characters long.`,
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const supabase = createClient();
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) {
        setPasswordError("Current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        throw updateError;
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("We couldn't update your password. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const passwordSubmitDisabled =
    passwordLoading || !currentPassword || !newPassword || !confirmPassword;

  const passwordToggle = (
    <IconButton
      type="button"
      size="sm"
      hover="neutral"
      aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
      aria-pressed={showPasswords}
      onClick={toggleShowPasswords}
      className="absolute right-1 top-1/2 -translate-y-1/2"
    >
      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
    </IconButton>
  );

  return (
    <Card title="Security">
      <form
        onSubmit={(event) => {
          void handlePasswordSubmit(event);
        }}
        className="space-y-6"
      >
        <PasswordField
          id="current-password"
          label="Current Password"
          value={currentPassword}
          onChange={handleCurrentPasswordChange}
          showPassword={showPasswords}
          autoComplete="current-password"
          toggle={passwordToggle}
        />
        <PasswordField
          id="new-password"
          label="New Password"
          hint={`At least ${PASSWORD_MIN_LENGTH_LABEL} characters.`}
          value={newPassword}
          onChange={handleNewPasswordChange}
          showPassword={showPasswords}
          autoComplete="new-password"
          toggle={passwordToggle}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          showPassword={showPasswords}
          autoComplete="new-password"
          toggle={passwordToggle}
        />

        {passwordSuccess && (
          <Alert tone="success">Password updated successfully!</Alert>
        )}
        {passwordError && <Alert>{passwordError}</Alert>}

        <Button
          type="submit"
          variant="balance"
          disabled={passwordSubmitDisabled}
          className="w-full"
        >
          {passwordLoading ? "Changing..." : "Change Password"}
        </Button>
      </form>
    </Card>
  );
}
