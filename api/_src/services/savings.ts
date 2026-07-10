import { prisma } from "../utils/prisma";
import { calculateIncomeShares } from "./calculation";
import { calculateProjectedMonths, addMonths } from "shared";

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
  members: { id: string; share: number }[],
): MemberContribution[] {
  if (members.length === 0) return [];

  const remainingToSave = Math.max(0, targetAmount - currentAmount);
  if (remainingToSave === 0) {
    return members.map((m) => ({ memberId: m.id, monthlyContribution: 0 }));
  }

  const now = new Date();
  const monthsRemaining =
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
    (targetDate.getMonth() - now.getMonth());

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

    // Round down to 2 decimal places
    const baseAmount =
      Math.floor(Number((totalMonthlyNeed * m.share).toFixed(10)) * 100) / 100;

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
    icon?: string | null,
  ) {
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

    const incomeShares = calculateIncomeShares(
      members.map((m) => ({ id: m.id, income: Number(m.income) })),
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
          proportionalAmount: base,
          actualAmount: override ? Number(override.customAmount) : base,
          isOverridden: !!override,
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

      // Variance in months
      const targetMonths =
        (targetDate.getFullYear() - now.getFullYear()) * 12 +
        (targetDate.getMonth() - now.getMonth());
      const projectedMonths =
        (projectedDate.getFullYear() - now.getFullYear()) * 12 +
        (projectedDate.getMonth() - now.getMonth());
      const varianceMonths = projectedMonths - targetMonths;

      return {
        ...goal,
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
  async upsertContribution(goalId: string, memberId: string, amount: number) {
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

  async deleteGoal(goalId: string) {
    return await prisma.savingsGoal.delete({
      where: { id: goalId },
    });
  },
};
