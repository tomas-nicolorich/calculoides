import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../shared/api/supabase";

function resolveDisplayName(user: User): string {
  return (
    (user.user_metadata.name as string | undefined) ??
    (user.user_metadata.full_name as string | undefined) ??
    user.email ??
    ""
  );
}

export function useProfileForm(user: User | null) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedFallbackName = !(
    (user?.user_metadata.name as string | undefined) ??
    (user?.user_metadata.full_name as string | undefined)
  );

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(resolveDisplayName(user));
  }, [user]);

  const clearStatus = () => {
    setSuccess(false);
    setError(null);
  };

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Display name can't be empty.");
      return;
    }

    setLoading(true);
    clearStatus();
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name: trimmedName },
      });
      if (updateError) throw updateError;
      setName(trimmedName);
      setSuccess(true);
    } catch {
      setError("We couldn't save your changes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    name,
    setName,
    usedFallbackName,
    loading,
    success,
    error,
    clearStatus,
    submit,
    submitDisabled: loading || !name.trim(),
  };
}
