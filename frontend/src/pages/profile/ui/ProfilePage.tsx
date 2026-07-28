import { Alert, Card, Button, IconButton, Input } from "../../../shared/ui";
import {
  ArrowLeft,
  User as UserIcon,
  Lock,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthContext";
import { supabase } from "../../../shared/api/supabase";

const DISPLAY_NAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 6;

export function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const usedFallbackName = !(
    (user?.user_metadata.name as string | undefined) ??
    (user?.user_metadata.full_name as string | undefined)
  );

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(
        (user.user_metadata.name as string | undefined) ??
          (user.user_metadata.full_name as string | undefined) ??
          user.email ??
          "",
      );
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileError("Display name can't be empty.");
      return;
    }

    setProfileLoading(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: trimmedName },
      });
      if (error) throw error;
      setName(trimmedName);
      setProfileSuccess(true);
    } catch {
      setProfileError("We couldn't save your changes. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(
        `New password must be at least ${String(PASSWORD_MIN_LENGTH)} characters long.`,
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setPasswordLoading(true);
    setPasswordSuccess(false);
    setPasswordError(null);
    try {
      if (!user?.email) throw new Error("Missing account email");

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        setPasswordError("Current password is incorrect.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

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

  const passwordToggle = (
    <IconButton
      type="button"
      size="sm"
      hover="neutral"
      aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
      aria-pressed={showPasswords}
      onClick={() => {
        setShowPasswords((prev) => !prev);
      }}
      className="absolute right-1 top-1/2 -translate-y-1/2"
    >
      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
    </IconButton>
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <IconButton
          bordered
          hover="balance"
          onClick={() => {
            void navigate(-1);
          }}
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={20} />
        </IconButton>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Profile
          </h1>
          <p className="text-slate-500">
            Manage your personal information and security
          </p>
        </div>
      </header>

      <Card title="Personal Information">
        <form
          onSubmit={(e) => {
            void handleUpdateProfile(e);
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
                onChange={(e) => {
                  setName(e.target.value);
                  setProfileSuccess(false);
                  setProfileError(null);
                }}
                className="pl-10"
              />
            </div>
            {usedFallbackName && (
              <p className="text-xs text-slate-500">
                We didn't find a display name on your account, so we're showing
                your email for now — feel free to set one.
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
            disabled={profileLoading || !name.trim()}
            className="w-full gap-2"
          >
            <Save size={18} />
            <span>{profileLoading ? "Saving..." : "Update Profile"}</span>
          </Button>
        </form>
      </Card>

      <Card title="Security">
        <form
          onSubmit={(e) => {
            void handleChangePassword(e);
          }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="current-password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Current Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                placeholder="••••••••"
                value={currentPassword}
                autoComplete="current-password"
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordSuccess(false);
                  setPasswordError(null);
                }}
                className="pl-10 pr-10"
              />
              {passwordToggle}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              New Password
            </label>
            <p className="text-xs text-slate-500">
              At least {PASSWORD_MIN_LENGTH} characters.
            </p>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                autoComplete="new-password"
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordSuccess(false);
                  setPasswordError(null);
                }}
                className="pl-10 pr-10"
              />
              {passwordToggle}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                id="confirm-password"
                type={showPasswords ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordSuccess(false);
                  setPasswordError(null);
                }}
                className="pl-10 pr-10"
              />
              {passwordToggle}
            </div>
          </div>

          {passwordSuccess && (
            <Alert tone="success">Password updated successfully!</Alert>
          )}
          {passwordError && <Alert>{passwordError}</Alert>}

          <Button
            type="submit"
            variant="balance"
            disabled={
              passwordLoading ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
            className="w-full"
          >
            {passwordLoading ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
