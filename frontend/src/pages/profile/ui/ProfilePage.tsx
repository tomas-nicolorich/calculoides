import { Card } from "../../../shared/ui/Card";
import { Input } from "../../../shared/ui";
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
        <button
          onClick={() => navigate(-1)}
          aria-label="Back to Dashboard"
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all hover:scale-105 active:scale-95 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <ArrowLeft size={24} className="text-brand-balance" />
        </button>
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

          <button
            onClick={() => {
              void handleUpdateProfile();
            }}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-balance text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            <Save size={18} />
            <span>{loading ? "Saving..." : "Update Profile"}</span>
          </button>
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

          <button
            onClick={() => {
              void handleChangePassword();
            }}
            disabled={loading || !password}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? "Changing..." : "Change Password"}</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
