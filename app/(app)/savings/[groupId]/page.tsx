import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { isGroupMember } from "../../../../lib/server/authz";
import { SavingsClient } from "./SavingsClient";

/**
 * Server Component gate for the Savings route (6b.4). No
 * `HydrationBoundary`/prefetch, same "lean, client-owned list" precedent as
 * `app/(app)/expenses/[groupId]/page.tsx` (4b.6) and
 * `app/(app)/transfers/[groupId]/page.tsx` (5.8): `/api/savings` is a Route
 * Handler GET (refetch-on-focus), so the goals list itself is purely
 * client-owned via TanStack Query (`SavingsClient`/`./queries.ts`). Same
 * membership-gate precedent as the Dashboard/Expenses/Transfers Server
 * Components: `notFound()` hides both "doesn't exist" and "not a member"
 * behind one response.
 */
export default async function SavingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const isMember = await isGroupMember(user.id, groupId);
  if (!isMember) {
    notFound();
  }

  return <SavingsClient groupId={groupId} />;
}
