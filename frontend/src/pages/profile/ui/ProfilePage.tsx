import { Card, Button, IconButton, Input } from "../../../shared/ui";
import { ArrowLeft, User as UserIcon, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthContext";
import { useProfileForm } from "./useProfileForm";
import { usePasswordChangeForm } from "./usePasswordChangeForm";
import { PasswordField } from "./PasswordField";
import { PasswordVisibilityToggle } from "./PasswordVisibilityToggle";
import { FormStatus } from "./FormStatus";
import { FallbackNameHint } from "./FallbackNameHint";

const DISPLAY_NAME_MAX_LENGTH = 100;

export function ProfilePage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const profileForm = useProfileForm(user, session);
  const passwordForm = usePasswordChangeForm(user?.email);

  const toggleShowPasswords = () => {
    passwordForm.setShowPasswords((prev) => !prev);
  };

  const passwordToggle = (
    <PasswordVisibilityToggle
      show={passwordForm.showPasswords}
      onToggle={toggleShowPasswords}
    />
  );

  const goBack = () => {
    void navigate(-1);
  };

  const onProfileSubmit = (e: React.SyntheticEvent) => {
    void profileForm.submit(e);
  };

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    profileForm.setName(e.target.value);
    profileForm.clearStatus();
  };

  const onPasswordSubmit = (e: React.SyntheticEvent) => {
    void passwordForm.submit(e);
  };

  const onCurrentPasswordChange = (value: string) => {
    passwordForm.setCurrentPassword(value);
    passwordForm.clearStatus();
  };

  const onNewPasswordChange = (value: string) => {
    passwordForm.setNewPassword(value);
    passwordForm.clearStatus();
  };

  const onConfirmPasswordChange = (value: string) => {
    passwordForm.setConfirmPassword(value);
    passwordForm.clearStatus();
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <IconButton
          bordered
          hover="balance"
          onClick={goBack}
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
        <form onSubmit={onProfileSubmit} className="space-y-6">
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
                value={profileForm.name}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                onChange={onNameChange}
                className="pl-10"
              />
            </div>
            <FallbackNameHint show={profileForm.usedFallbackName} />
          </div>

          <FormStatus
            success={profileForm.success}
            successMessage="Profile updated successfully!"
            error={profileForm.error}
          />

          <Button
            type="submit"
            variant="outline"
            disabled={profileForm.submitDisabled}
            className="w-full gap-2"
          >
            <Save size={18} />
            <span>{profileForm.loading ? "Saving..." : "Update Profile"}</span>
          </Button>
        </form>
      </Card>

      <Card title="Security">
        <form onSubmit={onPasswordSubmit} className="space-y-6">
          <PasswordField
            id="current-password"
            label="Current Password"
            value={passwordForm.currentPassword}
            onChange={onCurrentPasswordChange}
            showPassword={passwordForm.showPasswords}
            autoComplete="current-password"
            toggle={passwordToggle}
          />

          <PasswordField
            id="new-password"
            label="New Password"
            hint={`At least ${String(passwordForm.minLength)} characters.`}
            value={passwordForm.newPassword}
            onChange={onNewPasswordChange}
            showPassword={passwordForm.showPasswords}
            autoComplete="new-password"
            toggle={passwordToggle}
          />

          <PasswordField
            id="confirm-password"
            label="Confirm New Password"
            value={passwordForm.confirmPassword}
            onChange={onConfirmPasswordChange}
            showPassword={passwordForm.showPasswords}
            autoComplete="new-password"
            toggle={passwordToggle}
          />

          <FormStatus
            success={passwordForm.success}
            successMessage="Password updated successfully!"
            error={passwordForm.error}
          />

          <Button
            type="submit"
            variant="balance"
            disabled={passwordForm.submitDisabled}
            className="w-full"
          >
            {passwordForm.loading ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
