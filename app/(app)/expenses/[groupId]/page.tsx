import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createClient } from "../../../../lib/supabase/server";
import { isGroupMember } from "../../../../lib/server/authz";
import { ExpenseService } from "../../../../lib/server/services/expense";
import { createQueryClient } from "../../../../lib/query-client";
import { queryKeys } from "../../../../lib/query-keys";
import { ExpensesClient } from "./ExpensesClient";

/** Mirrors `ExpensesClient`'s default (no-filter) call to `useExpensesList`
 * (`categoryId`/`memberId`/`from`/`to` all `undefined`, `limit: PAGE_SIZE`,
 * `offset: 0`) — must stay in sync with `ExpensesClient.PAGE_SIZE` (25) so
 * this prefetch's query key is an exact hit, not a near-miss, for the
 * client hook's first render. */
const PAGE_SIZE = 25;

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
 * Server Component for the Expenses route (double-skeleton fix). Prefetches
 * the exact same TanStack Query key/shape `useExpensesList`'s default
 * (no-filter) call reads, then hands it to the client via
 * `HydrationBoundary` — same pattern `app/(app)/dashboard/[groupId]/_regions.tsx`
 * already uses. `await`ing the prefetch (not streaming it into a `<Suspense>`
 * region) keeps `loading.tsx` as the only skeleton shown: the RSC shell
 * doesn't resolve until the data is warm, so `ExpensesClient`'s own
 * `isLoading` branch is already false by the time it mounts. The response
 * mapping below must mirror `app/api/expenses/route.ts`'s GET handler
 * exactly — `useExpensesList` will read whichever hits the cache first, and
 * a shape mismatch would surface as a subtly wrong first paint instead of a
 * loud error. Same membership-gate precedent as
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

  const queryClient = createQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.expenses(groupId, { limit: PAGE_SIZE, offset: 0 }),
    queryFn: async () => {
      const { expenses, total } = await ExpenseService.listExpenses(
        groupId,
        undefined,
        undefined,
        PAGE_SIZE,
        0,
      );

      const mappedExpenses = (expenses as unknown as ExpenseListItem[]).map(
        (e) => ({
          id: e.id,
          categoryId: e.categoryId,
          payerId: e.payerId,
          description: e.description,
          amount: Number(e.amount.toString()),
          date: e.date.toISOString(),
          categoryName: e.category.name,
          categoryIcon: e.category.icon ?? "",
          payerName: e.payer.user.name ?? e.payer.user.email,
        }),
      );

      return {
        expenses: mappedExpenses,
        pagination: { total, limit: PAGE_SIZE, offset: 0 },
      };
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExpensesClient groupId={groupId} currentUserId={user.id} />
    </HydrationBoundary>
  );
}
