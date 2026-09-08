import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { TransferService } from "../../../../lib/server/services/transfer";
import { toStatus } from "../../../../lib/server/errors";

/**
 * GET /api/transfers/by-category — backs the per-category transfer list
 * (5.5). Unlike `/api/transfers`, the caller supplies `categoryId`, not
 * `groupId` — `TransferService.getTransfersForCategory` resolves the
 * authorization group from the category's own record and checks caller
 * membership internally (throws "Category not found" / "Not a member of
 * this group"), same non-duplication precedent `expense.ts`'s
 * `update`/`deleteExpense` established for surfacing a service-owned check
 * via `toStatus` rather than duplicating it at the route layer
 * (resource-authorization: "Group-Scoped Budget Resources Require
 * Membership", 5.6-5.7). Ports `api/_src/handlers/transactions.ts`'s
 * `transfers-by-category` action.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const categoryId = request.nextUrl.searchParams.get("categoryId");
  if (!categoryId) {
    return NextResponse.json({ error: "Missing categoryId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const transfers = await TransferService.getTransfersForCategory(
      categoryId,
      user.id,
    );
    return NextResponse.json(transfers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: toStatus(message) });
  }
}
