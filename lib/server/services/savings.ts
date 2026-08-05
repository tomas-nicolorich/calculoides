import { prisma } from "../../../api/_src/utils/prisma";
import {
  calculateIncomeShares,
  calculateMemberBudgetedTotals,
} from "./calculation";
import {
  calculateProjectedMonths,
  addMonths,
  calculateMonthsRemaining,
} from "shared";

export interface MemberContribution {
  memberId: string;
  monthlyContribution: number;
}

/**
 * Calculates monthly contributions per member to reach a target amount by a target date.
 * Implements Remainder Absorption for financial accuracy (BUG-028).
 */
export function calculateSavingsContributions(
  targetAmount: number,
  currentAmount: number,
  targetDate: Date,
  members: { id: string; share: number; percentage?: number }[],
): MemberContribution[] {
  if (members.length === 0) return [];

  const remainingToSave = Math.max(0, targetAmount - currentAmount);
  if (remainingToSave === 0) {
    return members.map((m) => ({ memberId: m.id, monthlyContribution: 0 }));
  }

  const now = new Date();
  const monthsRemaining = calculateMonthsRemaining(now, targetDate);

  const totalMonthlyNeed = Number(
    (monthsRemaining > 0
      ? remainingToSave / monthsRemaining
      : remainingToSave
    ).toFixed(2),
  );

  let maxShare = -1;
  let highestShareIndex = 0;

  const contributions = members.map((m, index) => {
    if (m.share > maxShare) {
      maxShare = m.share;
      highestShareIndex = index;
    }

    // Derive proportional weight from the finer 1dp `percentage` value when
    // available, falling back to the coarser 2dp `share` otherwise. Keeps
    // the displayed percentage and computed dollar amount reconciled
    // (issue #160). Remainder absorption below still targets the
    // highest-`share` member, unchanged from prior behavior.
    const weight = m.percentage != null ? m.percentage / 100 : m.share;

    // Round down to 2 decimal places
    const baseAmount =
      Math.floor(Number((totalMonthlyNeed * weight).toFixed(10)) * 100) / 100;

    return {
      memberId: m.id,
      monthlyContribution: baseAmount,
    };
  });

  const currentTotal = contributions.reduce(
    (acc, c) => Number((acc + c.monthlyContribution).toFixed(2)),
    0,
  );
  const remainder = Number((totalMonthlyNeed - currentTotal).toFixed(2));

  if (remainder !== 0) {
    contributions[highestShareIndex].monthlyContribution = Number(
      (
        contributions[highestShareIndex].monthlyContribution + remainder
      ).toFixed(2),
    );
  }

  return contributions;
}

export const SavingsService = {
  async createGoal(
    groupId: string,
    name: string,
    targetAmount: number,
    targetDate: Date,
    currentAmount = 0,
    icon?: string | null,
  ) {
    return await prisma.savingsGoal.create({
      data: {
        groupId,
        name,
        icon,
        targetAmount,
        currentAmount,
        targetDate,
        updatedAt: new Date(),
      },
    });
  },

  async updateGoal(
    goalId: string,
    name: string,
    targetAmount: number,
    targetDate: Date,
    currentAmount: number,
    callerUserId: string,
    icon?: string | null,
  ) {
    const existing = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
      select: { groupId: true },
    });
    if (!existing) throw new Error("Savings goal not found");

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: existing.groupId, userId: callerUserId },
      select: { id: true },
    });
    if (!membership) throw new Error("Not a member of this group");

    return await prisma.savingsGoal.update({
      where: { id: goalId },
      data: {
        name,
        icon,
        targetAmount,
        currentAmount,
        targetDate,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Retrieves all goals for a group with calculated projections and variances.
   * Mandated by BUG-020 and BUG-023.
   */
  async getGoalsForGroup(groupId: string) {
    // 1. Fetch group members and calculate shares
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: {
        id: true,
        income: true,
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const memberIncomes = members.map((m) => ({
      id: m.id,
      income: Number(m.income),
    }));

    const incomeShares = calculateIncomeShares(memberIncomes);

    // 1b. Fetch this month's categories/expenses/transfers to derive each
    // member's live affordability ceiling (income - budgeted), identical to
    // the dashboard's RemainingBalance figure. Never persisted — recomputed
    // on every call from current data.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const categories = await prisma.category.findMany({
      where: { groupId },
      include: {
        memberLinks: { select: { memberId: true } },
      },
    });

    const categoryIds = categories.map((c) => c.id);

    const expenses = await prisma.expense.findMany({
      where: {
        categoryId: { in: categoryIds },
        date: { gte: startOfMonth },
        isArchived: false,
      },
    });

    const transfers = await prisma.transfer.findMany({
      where: {
        categoryId: { in: categoryIds },
        date: { gte: startOfMonth },
      },
    });

    const budgetedTotals = calculateMemberBudgetedTotals(
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

    const remainingBalanceById = new Map<string, number>(
      memberIncomes.map((m) => {
        const budgeted =
          budgetedTotals.find((b) => b.memberId === m.id)?.budgeted ?? 0;
        return [m.id, Number((m.income - budgeted).toFixed(2))];
      }),
    );

    // 2. Fetch all goals for the group
    const goals = await prisma.savingsGoal.findMany({
      where: { groupId },
      include: {
        contributions: true,
      },
    });

    // 3. Calculate projections for each goal
    return goals.map((goal) => {
      const targetAmount = Number(goal.targetAmount);
      const currentAmount = Number(goal.currentAmount);
      const targetDate = new Date(goal.targetDate);
      const now = new Date();

      // Default proportional contributions
      const baseContributions = calculateSavingsContributions(
        targetAmount,
        currentAmount,
        targetDate,
        incomeShares,
      );

      // Map to final contributions (applying overrides)
      const finalContributions = incomeShares.map((s) => {
        const override = goal.contributions.find((c) => c.memberId === s.id);
        const base =
          baseContributions.find((bc) => bc.memberId === s.id)
            ?.monthlyContribution ?? 0;
        const memberInfo = members.find((m) => m.id === s.id);

        return {
          memberId: s.id,
          user: memberInfo?.user,
          share: s.share,
          percentage: s.percentage,
          proportionalAmount: base,
          actualAmount: override ? Number(override.customAmount) : base,
          isOverridden: !!override,
          remainingBalance: remainingBalanceById.get(s.id) ?? 0,
        };
      });

      const totalActual = finalContributions.reduce(
        (acc, fc) => acc + fc.actualAmount,
        0,
      );
      const months = calculateProjectedMonths(
        targetAmount,
        currentAmount,
        totalActual,
      );
      const projectedDate = addMonths(now, months);

      // Variance in months. Both sides must use the same axis
      // (calculateMonthsRemaining's elapsed/deadline-month exclusion) or an
      // on-target goal (projectedDate === targetDate) reports a false 1-month delay.
      const targetMonths = calculateMonthsRemaining(now, targetDate);
      const projectedMonths = calculateMonthsRemaining(now, projectedDate);
      const varianceMonths = projectedMonths - targetMonths;

      return {
        ...goal,
        targetAmount,
        currentAmount,
        projectedDate,
        varianceMonths,
        isNever: months === Infinity,
        breakdown: finalContributions,
      };
    });
  },

  /**
   * Upserts a custom contribution amount for a goal.
   * Mandated by BUG-022 to include defensive validation for goalId and memberId.
   */
  async upsertContribution(
    goalId: string,
    memberId: string,
    amount: number,
    callerUserId: string,
  ) {
    // BUG-022: Defensive validation
    const [goal, member] = await Promise.all([
      prisma.savingsGoal.findUnique({ where: { id: goalId } }),
      prisma.groupMember.findUnique({ where: { id: memberId } }),
    ]);

    if (!goal) throw new Error("Savings goal not found");
    if (!member) throw new Error("Group member not found");

    // Ensure member belongs to the same group as the goal
    if (goal.groupId !== member.groupId) {
      throw new Error(
        "Member does not belong to the group associated with this savings goal",
      );
    }

    const callerMembership = await prisma.groupMember.findFirst({
      where: { groupId: goal.groupId, userId: callerUserId },
      select: { id: true },
    });
    if (!callerMembership) {
      throw new Error(
        "User does not belong to the group associated with this savings goal",
      );
    }

    return await prisma.savingsGoalContribution.upsert({
      where: {
        goalId_memberId: { goalId, memberId },
      },
      update: {
        customAmount: amount,
      },
      create: {
        goalId,
        memberId,
        customAmount: amount,
      },
    });
  },

  async deleteGoal(goalId: string, userId: string) {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });
    if (!goal) {
      throw new Error("Savings goal not found");
    }
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: goal.groupId } },
    });
    if (!membership) {
      throw new Error(
        "User does not belong to the group associated with this savings goal",
      );
    }
    return await prisma.savingsGoal.delete({
      where: { id: goalId },
    });
  },

  /**
   * Deletes a custom contribution override for a goal/member pair, so the
   * member's actualAmount reverts to the computed proportional base on the
   * next read. Idempotent: a no-op (no throw) when no override row exists.
   */
  async deleteContribution(
    goalId: string,
    memberId: string,
    callerUserId: string,
  ) {
    const [goal, member] = await Promise.all([
      prisma.savingsGoal.findUnique({ where: { id: goalId } }),
      prisma.groupMember.findUnique({ where: { id: memberId } }),
    ]);

    if (!goal) throw new Error("Savings goal not found");
    if (!member) throw new Error("Group member not found");

    if (goal.groupId !== member.groupId) {
      throw new Error(
        "Member does not belong to the group associated with this savings goal",
      );
    }

    const callerMembership = await prisma.groupMember.findFirst({
      where: { groupId: goal.groupId, userId: callerUserId },
      select: { id: true },
    });
    if (!callerMembership) {
      throw new Error(
        "User does not belong to the group associated with this savings goal",
      );
    }

    await prisma.savingsGoalContribution.deleteMany({
      where: { goalId, memberId },
    });
  },
};
