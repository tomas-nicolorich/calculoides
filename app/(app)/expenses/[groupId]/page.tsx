import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { isGroupMember } from "../../../../lib/server/authz";
import { ExpensesClient } from "./ExpensesClient";

/**
 * Server Component gate for the Expenses route (4b.6). No
 * `HydrationBoundary`/prefetch — design.md's Server Action vs Route Handler
 * table places `/api/expenses` in the "Route Handler GET" row
 * (filtered/paginated/refetch-on-focus), not "Server Component (no
 * endpoint)", so the expenses list itself is purely client-owned via
 * TanStack Query (`ExpensesClient`/`./queries.ts`), unlike Dashboard's
 * summary/categories (2.1-2.2). Same membership-gate precedent as
 * `app/(app)/dashboard/[groupId]/page.tsx`: `notFound()` hides both
 * "doesn't exist" and "not a member" behind one response.
 */
export default async function ExpensesPage({
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

  return <ExpensesClient groupId={groupId} currentUserId={user.id} />;
}
