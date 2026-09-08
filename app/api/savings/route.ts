import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isGroupMember } from "../../../lib/server/authz";
import { SavingsService } from "../../../lib/server/services/savings";

/**
 * GET /api/savings — backs `useSavingsGoals`'s refetch-on-focus (6b.1).
 * resource-authorization: "Group-Scoped Budget Resources Require
 * Membership" (6b.2-6b.3) — mirrors `app/api/expenses/route.ts`'s membership
 * check, porting the legacy `requireGroupAccess` guard from
 * `api/_src/handlers/transactions.ts`'s `savings-goals-list` action.
 * `SavingsService.getGoalsForGroup` already returns the fully-computed
 * (projections/breakdown included) rows, so no extra response mapping is
 * needed — same non-duplication precedent as `app/api/transfers/route.ts`.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const groupId = request.nextUrl.searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isMember = await isGroupMember(user.id, groupId);
  if (!isMember) {
    return NextResponse.json(
      { error: "Access denied to this group" },
      { status: 403 },
    );
  }

  const goals = await SavingsService.getGoalsForGroup(groupId);
  return NextResponse.json(goals);
}
