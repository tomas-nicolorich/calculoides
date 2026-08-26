import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { UserService } from "../../../lib/server/services/user";
import { ProfileClient } from "./ProfileClient";

/**
 * Server Component gate for the flat `/profile` route (no `[groupId]`
 * segment — every signed-in user has exactly one profile). Ported from
 * `frontend/src/pages/profile/ui/ProfilePage.tsx` + `useProfileForm.ts`.
 * Same membership-less `notFound()`-on-no-session precedent as
 * `app/(app)/groups/page.tsx` / `app/(app)/members/page.tsx`.
 *
 * `UserService.getUser` is guaranteed non-null by the time this renders —
 * `app/(app)/layout.tsx` already redirects to `/complete-profile` when it's
 * null — but `name` itself is a nullable column, so the fallback-to-email
 * display name logic (prod's `usedFallbackName`) still applies here.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    notFound();
  }

  const profile = await UserService.getUser(authUser.id);
  const email = authUser.email ?? profile?.email ?? "";
  const trimmedName = profile?.name?.trim() ?? "";
  const usedFallbackName = trimmedName.length === 0;

  return (
    <ProfileClient
      initialName={usedFallbackName ? email : trimmedName}
      initialUsedFallbackName={usedFallbackName}
      email={email}
    />
  );
}
