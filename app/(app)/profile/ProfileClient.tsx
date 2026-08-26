"use client";

import { useState, type SyntheticEvent } from "react";
import { User as UserIcon, Save, Eye, EyeOff } from "lucide-react";
import { Card, Button, Input, IconButton, Alert } from "../../_ui";
import { createClient } from "../../../lib/supabase/client";
import { upsert } from "../../../lib/actions/user";
import { PasswordField } from "./_components/PasswordField";

const DISPLAY_NAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MIN_LENGTH_LABEL = String(PASSWORD_MIN_LENGTH);

/**
 * Client half of the flat `/profile` page. Ported from
 * `frontend/src/pages/profile/ui/ProfilePage.tsx` +
 * `useProfileForm.ts`/`usePasswordChangeForm.ts`, split into this one
 * client component (rather than two custom hooks) since neither form's
 * state is reused anywhere else — same granularity as `MembersClient`
 * calling its Server Action directly with no `app/_data/*` wrapper.
 *
 * The name update goes through `lib/actions/user.ts`'s `upsert` Server
 * Action directly. The password change re-authenticates and updates via
 * the browser Supabase client, exactly like
 * `app/(auth)/reset-password/ResetPasswordForm.tsx`'s `updateUser` call —
 * this must run client-side because `supabase.auth` session mutation has
 * no server-side equivalent in this app's session model.
 */
export function ProfileClient({
  initialName,
  initialUsedFallbackName,
  email,
}: {
  initialName: string;
  initialUsedFallbackName: boolean;
  email: string;
}) {
  // --- Personal Information form ---
  const [name, setName] = useState(initialName);
  const [usedFallbackName, setUsedFallbackName] = useState(
    initialUsedFallbackName,
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const clearProfileStatus = () => {
    setProfileSuccess(false);
    setProfileError(null);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    clearProfileStatus();
  };

  const handleProfileSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileError("Display name can't be empty.");
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const result = await upsert({ name: trimmedName });
      if (!result.ok) {
        setProfileError("We couldn't save your changes. Please try again.");
        return;
      }
      setName(trimmedName);
      setUsedFallbackName(false);
      setProfileSuccess(true);
    } catch {
      setProfileError("We couldn't save your changes. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const profileSubmitDisabled = profileLoading || !name.trim();

  // --- Security (password change) form ---
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
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Profile
        </h1>
        <p className="text-slate-500">
          Manage your personal information and security
        </p>
      </header>

      <Card title="Personal Information">
        <form
          onSubmit={(event) => {
            void handleProfileSubmit(event);
          }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="display-name"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Display Name
            </label>
            <div className="relative">
              <UserIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                id="display-name"
                type="text"
                value={name}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                onChange={handleNameChange}
                className="pl-10"
              />
            </div>
            {usedFallbackName && (
              <p className="text-xs text-slate-500">
                We didn&apos;t find a display name on your account, so
                we&apos;re showing your email for now — feel free to set one.
              </p>
            )}
          </div>

          {profileSuccess && (
            <Alert tone="success">Profile updated successfully!</Alert>
          )}
          {profileError && <Alert>{profileError}</Alert>}

          <Button
            type="submit"
            variant="outline"
            disabled={profileSubmitDisabled}
            className="w-full gap-2"
          >
            <Save size={18} />
            <span>{profileLoading ? "Saving..." : "Update Profile"}</span>
          </Button>
        </form>
      </Card>

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
    </div>
  );
}
