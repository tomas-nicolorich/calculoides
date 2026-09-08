import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isGroupMember } from "../../../lib/server/authz";
import { TransferService } from "../../../lib/server/services/transfer";

/**
 * GET /api/transfers — backs `useTransfersList`'s refetch-on-focus/pagination
 * (5.5). resource-authorization: "Group-Scoped Budget Resources Require
 * Membership" (5.6-5.7) — mirrors `app/api/expenses/route.ts`'s membership
 * check, porting the legacy `requireGroupAccess` guard and response shape
 * from `api/_src/handlers/transactions.ts`'s `transfers-list` action.
 * `TransferService.listTransfers` already returns fully-mapped rows, unlike
 * `ExpenseService.listExpenses`, so no extra response mapping is needed here.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const groupId = params.get("groupId");
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

  const categoryId = params.get("categoryId") ?? undefined;
  const memberId = params.get("memberId") ?? undefined;
  const limit = parseInt(params.get("limit") ?? "20", 10);
  const offset = parseInt(params.get("offset") ?? "0", 10);

  const { transfers, total } = await TransferService.listTransfers(
    groupId,
    categoryId,
    memberId,
    limit,
    offset,
  );

  return NextResponse.json({
    transfers,
    pagination: { total, limit, offset },
  });
}
