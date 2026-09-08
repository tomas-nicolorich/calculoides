import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isGroupMember } from "../../../lib/server/authz";
import { BudgetService } from "../../../lib/server/services/budget";

/**
 * GET /api/categories — backs `useCategoriesList`'s refetch-on-focus (2.3).
 * resource-authorization: "Group-Scoped Budget Resources Require
 * Membership" (2.7-2.8) — mirrors `app/api/summary/route.ts`'s membership
 * check, porting the legacy `requireGroupAccess` helper used by
 * `api/_src/handlers/transactions.ts`'s `categories-list` action.
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

  const categories = await BudgetService.listCategoriesWithBalances(groupId);
  return NextResponse.json(categories);
}
