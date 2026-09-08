import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isGroupMember } from "../../../lib/server/authz";
import { SummaryService } from "../../../lib/server/services/summary";

/**
 * GET /api/summary — backs `useDashboardSummary`'s refetch-on-focus (2.3).
 * resource-authorization: "Group-Scoped Budget Resources Require
 * Membership" (2.7-2.8) — membership resolved from the caller's own
 * session against the requested `groupId`, mirroring the legacy
 * `requireGroupAccess` helper this ports from
 * (`api/_src/handlers/transactions.ts`'s `summary` action).
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

  const summary = await SummaryService.getGroupSummary(groupId);
  return NextResponse.json(summary);
}
