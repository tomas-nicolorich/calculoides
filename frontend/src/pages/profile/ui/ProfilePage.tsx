import { Card, Button, IconButton, Input } from "../../../shared/ui";
import {
  ArrowLeft,
  User as UserIcon,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthContext";
import { supabase } from "../../../shared/api/supabase";

export function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  // Status states
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleUpdateProfile = async () => {
    setLoading(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name },
      });
      if (error) throw error;
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!password || password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }
    setLoading(true);
    setPasswordSuccess(false);
    setPasswordError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      if (error) throw error;
      setPasswordSuccess(true);
      setPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Profile
          </h1>
          <p className="text-slate-500">
            Manage your personal information and security
          </p>
        </div>
      </header>

      <Card title="Personal Information">
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Display Name
            </label>
            <div className="relative">
              <UserIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {profileSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 rounded-xl text-green-600 dark:text-green-400 text-sm">
              <CheckCircle size={16} />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {profileError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <Button
            variant="balance"
            onClick={() => {
              void handleUpdateProfile();
            }}
            disabled={loading}
            className="w-full gap-2"
          >
            <Save size={18} />
            <span>{loading ? "Saving..." : "Update Profile"}</span>
          </Button>
        </div>
      </Card>

      <Card title="Security">
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              New Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 rounded-xl text-green-600 dark:text-green-400 text-sm">
              <CheckCircle size={16} />
              <span>Password updated successfully!</span>
            </div>
          )}

          {passwordError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => {
              void handleChangePassword();
            }}
            disabled={loading || !password}
            className="w-full"
          >
            {loading ? "Changing..." : "Change Password"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
