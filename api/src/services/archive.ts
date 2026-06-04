import { prisma } from "../utils/prisma";
import { GroupService } from "./group";
import {
  calculateIncomeShares,
  calculateCategoryBalances,
  resolveRelevantShares,
} from "./calculation";

const UNDO_WINDOW_SECONDS = 10;

export const ArchiveService = {
  async archiveMonth(groupId: string, userId: string, periodMonth: string) {
    const isOwner = await GroupService.isOwner(groupId, userId);
    if (!isOwner) throw new Error("Only the group owner can archive expenses");

    const existing = await prisma.settlement.findFirst({
      where: { groupId, periodMonth },
    });
    if (existing)
      throw new Error(`Period ${periodMonth} has already been archived`);

    const [year, month] = periodMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const members = await prisma.groupMember.findMany({ where: { groupId } });
    const incomeShares = calculateIncomeShares(
      members.map((m) => ({ id: m.id, income: Number(m.income) })),
    );

    const categories = await prisma.category.findMany({
      where: { groupId },
      include: {
        expenses: {
          where: { isArchived: false, date: { gte: startDate, lt: endDate } },
        },
        transfers: {
          where: {
            archivedPeriod: null,
            date: { gte: startDate, lt: endDate },
          },
        },
        memberLinks: { select: { memberId: true } },
      },
    });

    const memberTotals = new Map<string, { paid: number; quota: number }>(
      members.map((m) => [m.id, { paid: 0, quota: 0 }]),
    );

    for (const category of categories) {
      const relevantShares = resolveRelevantShares(
        members.map((m) => ({ id: m.id, income: Number(m.income) })),
        category.memberLinks,
        incomeShares,
      );

      const balances = calculateCategoryBalances(
        { monthlyBudget: Number(category.monthlyBudget) },
        relevantShares,
        category.expenses.map((e) => ({
          payerId: e.payerId,
          amount: Number(e.amount),
        })),
        category.transfers.map((t) => ({
          fromMemberId: t.fromMemberId,
          toMemberId: t.toMemberId,
          amount: Number(t.amount),
        })),
      );

      for (const balance of balances) {
        const current = memberTotals.get(balance.memberId) ?? {
          paid: 0,
          quota: 0,
        };
        memberTotals.set(balance.memberId, {
          paid: Number((current.paid + balance.spent).toFixed(2)),
          quota: Number((current.quota + balance.totalQuota).toFixed(2)),
        });
      }
    }

    const expenseIds = categories.flatMap((c) => c.expenses.map((e) => e.id));
    const transferIds = categories.flatMap((c) => c.transfers.map((t) => t.id));

    await prisma.$transaction(async (tx) => {
      await tx.settlement.createMany({
        data: Array.from(memberTotals.entries()).map(([memberId, totals]) => ({
          groupId,
          memberId,
          periodMonth,
          totalPaid: totals.paid,
          totalQuota: totals.quota,
          netAmount: Number((totals.paid - totals.quota).toFixed(2)),
        })),
      });

      if (expenseIds.length > 0) {
        await tx.expense.updateMany({
          where: { id: { in: expenseIds } },
          data: { isArchived: true, archivedPeriod: periodMonth },
        });
      }

      if (transferIds.length > 0) {
        await tx.transfer.updateMany({
          where: { id: { in: transferIds } },
          data: { archivedPeriod: periodMonth },
        });
      }
    });

    return {
      periodMonth,
      settlements: Array.from(memberTotals.entries()).map(
        ([memberId, totals]) => ({
          memberId,
          totalPaid: totals.paid,
          totalQuota: totals.quota,
          netAmount: Number((totals.paid - totals.quota).toFixed(2)),
        }),
      ),
    };
  },

  async undoArchive(groupId: string, userId: string, periodMonth: string) {
    const isOwner = await GroupService.isOwner(groupId, userId);
    if (!isOwner) throw new Error("Only the group owner can undo archiving");

    const settlements = await prisma.settlement.findMany({
      where: { groupId, periodMonth },
    });
    if (settlements.length === 0)
      throw new Error("No archive found for this period");

    const elapsed = (Date.now() - settlements[0].archivedAt.getTime()) / 1000;
    if (elapsed > UNDO_WINDOW_SECONDS)
      throw new Error("Undo window has expired");

    await prisma.$transaction(async (tx) => {
      await tx.settlement.deleteMany({ where: { groupId, periodMonth } });
      await tx.expense.updateMany({
        where: { archivedPeriod: periodMonth, category: { groupId } },
        data: { isArchived: false, archivedPeriod: null },
      });
      await tx.transfer.updateMany({
        where: { archivedPeriod: periodMonth, category: { groupId } },
        data: { archivedPeriod: null },
      });
    });
  },
};
