"use client";

import { useState, type SyntheticEvent } from "react";
import { User as UserIcon, Save } from "lucide-react";
import { Card, Button, Input, Alert } from "../../../_ui";
import { upsert } from "../../../../lib/actions/user";

const DISPLAY_NAME_MAX_LENGTH = 100;

/**
 * "Personal Information" card on `/profile`: owns the display-name form
 * only. Extracted out of `ProfileClient` as a sibling to `SecurityForm`
 * (not a shared custom hook) since neither form's state is reused anywhere
 * else — see `ProfileClient.tsx` for the full rationale.
 *
 * The name update goes through `lib/actions/user.ts`'s `upsert` Server
 * Action directly, same granularity as `MembersClient` calling its Server
 * Action with no `app/_data/*` wrapper.
 */
export function PersonalInfoForm({
  initialName,
  initialUsedFallbackName,
}: {
  initialName: string;
  initialUsedFallbackName: boolean;
}) {
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

  return (
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
  );
}
