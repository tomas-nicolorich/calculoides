"use client";

import { PersonalInfoForm } from "./_components/PersonalInfoForm";
import { SecurityForm } from "./_components/SecurityForm";

/**
 * Client half of the flat `/profile` page. Ported from
 * `frontend/src/pages/profile/ui/ProfilePage.tsx` +
 * `useProfileForm.ts`/`usePasswordChangeForm.ts`, split into
 * `PersonalInfoForm` and `SecurityForm` — two sibling components rather
 * than a shared custom hook, since neither form's state is reused anywhere
 * else — same granularity as `MembersClient` calling its Server Action
 * directly with no `app/_data/*` wrapper.
 *
 * `ProfileClient` itself is just the page header plus composition of those
 * two independent forms; see `_components/PersonalInfoForm.tsx` and
 * `_components/SecurityForm.tsx` for the actual form logic.
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

      <PersonalInfoForm
        initialName={initialName}
        initialUsedFallbackName={initialUsedFallbackName}
      />
      <SecurityForm email={email} />
    </div>
  );
}
