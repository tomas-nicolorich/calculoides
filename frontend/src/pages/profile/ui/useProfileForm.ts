import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

async function fetchProfileName(accessToken: string): Promise<string | null> {
  const response = await fetch("/api/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { name?: string | null };
  return data.name ?? null;
}

async function saveProfileName(
  accessToken: string,
  name: string,
): Promise<void> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error("Failed to update profile");
  }
}

export function useProfileForm(user: User | null, session: Session | null) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallbackName, setUsedFallbackName] = useState(false);

  useEffect(() => {
    if (!user || !session) return;
    fetchProfileName(session.access_token)
      .then((fetchedName) => {
        setName(fetchedName ?? user.email ?? "");
        setUsedFallbackName(!fetchedName);
      })
      .catch(() => {
        setName(user.email ?? "");
        setUsedFallbackName(true);
      });
  }, [user, session]);

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
    if (!session) {
      setError("We couldn't save your changes. Please try again.");
      return;
    }

    setLoading(true);
    clearStatus();
    try {
      await saveProfileName(session.access_token, trimmedName);
      setName(trimmedName);
      setUsedFallbackName(false);
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
