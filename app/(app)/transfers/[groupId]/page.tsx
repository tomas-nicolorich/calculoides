import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { isGroupMember } from "../../../../lib/server/authz";
import { TransfersClient } from "./TransfersClient";

/**
 * Server Component gate for the Transfers route (5.8). No
 * `HydrationBoundary`/prefetch — design.md's Server Action vs Route Handler
 * table places `/api/transfers` in the "Route Handler GET" row
 * (filtered/paginated/refetch-on-focus), not "Server Component (no
 * endpoint)", so the transfers list itself is purely client-owned via
 * TanStack Query (`TransfersClient`/`./queries.ts`), same precedent as
 * `app/(app)/expenses/[groupId]/page.tsx` (4b.6). Same membership-gate
 * precedent as the Dashboard/Expenses Server Components: `notFound()` hides
 * both "doesn't exist" and "not a member" behind one response.
 */
export default async function TransfersPage({
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

  return <TransfersClient groupId={groupId} />;
}
