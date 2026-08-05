import { prisma } from "../../../api/_src/utils/prisma";
import {
  calculateIncomeShares,
  calculateCategoryBalances,
  calculateMemberBudgetedTotals,
} from "./calculation";

/**
 * Ported verbatim (computation only) from `api/_src/handlers/transactions.ts`'s
 * inline `summary` action (2.1). Deliberately duplicated rather than having
 * the legacy handler delegate here: `transactions.ts` is deleted wholesale in
 * phase 6b once expenses/transfers/savings all port away from it, so
 * refactoring it to call this service now would touch a file scheduled for
 * imminent deletion for no lasting benefit.
 *
 * Unlike the legacy handler, this function performs NO authorization check —
 * per resource-authorization ("Group-Scoped Budget Resources Require
 * Membership"), callers (Server Component, Route Handler) MUST verify
 * membership against the resource's own `groupId` before calling this.
 */
export const SummaryService = {
  async getGroupSummary(groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!group) return null;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const categories = await prisma.category.findMany({
      where: { groupId },
      include: {
        memberLinks: { select: { memberId: true } },
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
        date: { gte: startOfMonth },
        isArchived: false,
      },
    });

    const transfers = await prisma.transfer.findMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
        date: { gte: startOfMonth },
      },
      include: {
        fromMember: { select: { memberId: true } },
        toMember: { select: { memberId: true } },
      },
    });

    const memberIncomes = group.members.map((m) => ({
      id: m.id,
      income: Number(m.income),
    }));

    const shares = calculateIncomeShares(memberIncomes);

    const totalIncome = memberIncomes.reduce((acc, m) => acc + m.income, 0);
    const totalBudget = categories.reduce(
      (acc, c) => acc + Number(c.monthlyBudget),
      0,
    );
    const totalSpent = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

    const memberBudgetedTotals = calculateMemberBudgetedTotals(
      memberIncomes,
      categories.map((c) => ({
        id: c.id,
        monthlyBudget: Number(c.monthlyBudget),
        memberLinks: c.memberLinks,
      })),
      expenses.map((e) => ({
        payerId: e.payerId,
        categoryId: e.categoryId,
        amount: Number(e.amount),
      })),
      transfers.map((t) => ({
        categoryId: t.categoryId,
        fromMemberId: t.fromMemberId,
        toMemberId: t.toMemberId,
        amount: Number(t.amount),
      })),
    );
    const budgetedByMemberId = new Map(
      memberBudgetedTotals.map((b) => [b.memberId, b.budgeted]),
    );

    const membersSummary = group.members.map((m) => {
      const share = shares.find((s) => s.id === m.id);

      const memberExpensesTotal = expenses
        .filter((e) => e.payerId === m.id)
        .reduce((acc, e) => acc + Number(e.amount), 0);

      let totalRemainingQuota = 0;
      categories.forEach((cat) => {
        const isRestricted = cat.memberLinks.length > 0;
        if (
          isRestricted &&
          !cat.memberLinks.some((ml) => ml.memberId === m.id)
        ) {
          return;
        }

        const catExpenses = expenses.filter((e) => e.categoryId === cat.id);
        const catTransfers = transfers.filter((t) => t.categoryId === cat.id);

        const relevantMembers = isRestricted
          ? memberIncomes.filter((mi) =>
              cat.memberLinks.some((ml) => ml.memberId === mi.id),
            )
          : memberIncomes;

        const balances = calculateCategoryBalances(
          { monthlyBudget: Number(cat.monthlyBudget) },
          relevantMembers,
          catExpenses.map((e) => ({
            payerId: e.payerId,
            amount: Number(e.amount),
          })),
          catTransfers.map((t) => ({
            fromMemberId: t.fromMemberId,
            toMemberId: t.toMemberId,
            amount: Number(t.amount),
          })),
        );

        const memberBalance = balances.find((b) => b.memberId === m.id);
        if (memberBalance) {
          totalRemainingQuota += memberBalance.remainingQuota;
        }
      });

      return {
        id: m.id,
        userId: m.userId,
        name: m.user.name ?? m.user.email,
        income: Number(m.income),
        share: share?.percentage ?? 0,
        spent: memberExpensesTotal,
        remainingQuota: totalRemainingQuota,
        budgeted: budgetedByMemberId.get(m.id) ?? 0,
      };
    });

    const recentExpensesRaw = await prisma.expense.findMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
        isArchived: false,
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    const recentExpenses = recentExpensesRaw.map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      date: e.date,
      categoryName:
        categories.find((c) => c.id === e.categoryId)?.name ?? "Unknown",
      categoryId: e.categoryId,
      payerName:
        group.members.find((m) => m.id === e.payerId)?.user.name ?? "Unknown",
      payerId: e.payerId,
    }));

    const recentTransfersRaw = await prisma.transfer.findMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
      },
      include: {
        fromMember: { select: { memberId: true } },
        toMember: { select: { memberId: true } },
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    const recentTransfers = recentTransfersRaw.map((t) => ({
      id: t.id,
      categoryName:
        categories.find((c) => c.id === t.categoryId)?.name ?? "Unknown",
      fromMemberName:
        group.members.find((m) => m.id === t.fromMember.memberId)?.user.name ??
        "Unknown",
      fromMemberId: t.fromMember.memberId,
      toMemberName:
        group.members.find((m) => m.id === t.toMember.memberId)?.user.name ??
        "Unknown",
      toMemberId: t.toMember.memberId,
      amount: Number(t.amount),
      date: t.date,
    }));

    return {
      groupName: group.name,
      ownerId: group.ownerId,
      totalIncome,
      totalBudget,
      totalSpent,
      members: membersSummary,
      recentExpenses,
      recentTransfers,
    };
  },
};
