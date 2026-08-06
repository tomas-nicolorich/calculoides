import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { isGroupMember } from "../../../lib/server/authz";
import { ExpenseService } from "../../../lib/server/services/expense";

interface ExpenseListItem {
  id: string;
  categoryId: string;
  payerId: string;
  description: string;
  amount: { toString(): string } | number | string;
  date: Date;
  category: { name: string; icon: string | null };
  payer: { user: { name: string | null; email: string } };
}

/**
 * GET /api/expenses — backs `useExpensesList`'s refetch-on-focus/pagination
 * (4b.3). resource-authorization: "Group-Scoped Budget Resources Require
 * Membership" (4b.4-4b.5) — mirrors `app/api/categories/route.ts`'s
 * membership check, porting the legacy `requireGroupAccess` guard and
 * response mapping from `api/_src/handlers/transactions.ts`'s
 * `expenses-list` action.
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
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  const { expenses, total } = await ExpenseService.listExpenses(
    groupId,
    categoryId,
    memberId,
    limit,
    offset,
    from,
    to,
  );

  const mappedExpenses = (expenses as unknown as ExpenseListItem[]).map(
    (e) => ({
      id: e.id,
      categoryId: e.categoryId,
      payerId: e.payerId,
      description: e.description,
      amount: Number(e.amount.toString()),
      date: e.date,
      categoryName: e.category.name,
      categoryIcon: e.category.icon ?? "",
      payerName: e.payer.user.name ?? e.payer.user.email,
    }),
  );

  return NextResponse.json({
    expenses: mappedExpenses,
    pagination: { total, limit, offset },
  });
}
