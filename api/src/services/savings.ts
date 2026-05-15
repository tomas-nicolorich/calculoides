import { prisma } from '../utils/prisma';
import { calculateIncomeShares } from './calculation';

export interface MemberContribution {
  memberId: string;
  monthlyContribution: number;
}

/**
 * Calculates monthly contributions per member to reach a target amount by a target date.
 */
export function calculateSavingsContributions(
  targetAmount: number,
  targetDate: Date,
  members: { id: string; share: number }[]
): MemberContribution[] {
  if (members.length === 0) return [];

  const now = new Date();
  const monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
  
  const totalMonthlyNeed = monthsRemaining > 0 ? targetAmount / monthsRemaining : targetAmount;

  return members.map((m) => ({
    memberId: m.id,
    monthlyContribution: Number((totalMonthlyNeed * m.share).toFixed(2)),
  }));
}

/**
 * Calculates a new projected date based on total monthly contributions.
 */
export function calculateProjectedDate(
  targetAmount: number,
  startDate: Date,
  contributions: { memberId: string; amount: number }[]
): Date {
  const totalMonthly = contributions.reduce((acc, c) => acc + c.amount, 0);

  if (totalMonthly <= 0) {
    const farDate = new Date(startDate);
    farDate.setFullYear(startDate.getFullYear() + 100);
    return farDate;
  }

  const monthsRequired = Math.ceil(targetAmount / totalMonthly);
  const projectedDate = new Date(startDate);
  projectedDate.setMonth(projectedDate.getMonth() + monthsRequired);
  
  return projectedDate;
}

export class SavingsService {
  static async createGoal(groupId: string, name: string, targetAmount: number, targetDate: Date) {
    return await prisma.savingsGoal.create({
      data: {
        groupId,
        name,
        targetAmount,
        targetDate,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Retrieves all goals for a group with calculated projections and variances.
   * Mandated by BUG-020.
   */
  static async getGoalsForGroup(groupId: string) {
    // 1. Fetch group members and calculate shares
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { id: true, income: true },
    });

    const incomeShares = calculateIncomeShares(
      members.map((m) => ({ id: m.id, income: Number(m.income) }))
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
      const targetDate = new Date(goal.targetDate);
      const now = new Date();

      // Default proportional contributions
      const baseContributions = calculateSavingsContributions(targetAmount, targetDate, incomeShares);

      // Map to final contributions (applying overrides)
      const finalContributions = incomeShares.map((s) => {
        const override = goal.contributions.find((c) => c.memberId === s.id);
        const base = baseContributions.find((bc) => bc.memberId === s.id)?.monthlyContribution || 0;
        
        return {
          memberId: s.id,
          proportionalAmount: base,
          actualAmount: override ? Number(override.customAmount) : base,
          isOverridden: !!override,
        };
      });

      const projectedDate = calculateProjectedDate(
        targetAmount,
        now,
        finalContributions.map((fc) => ({ memberId: fc.memberId, amount: fc.actualAmount }))
      );

      // Variance in months
      const targetMonths = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
      const projectedMonths = (projectedDate.getFullYear() - now.getFullYear()) * 12 + (projectedDate.getMonth() - now.getMonth());
      const varianceMonths = projectedMonths - targetMonths;

      return {
        ...goal,
        projectedDate,
        varianceMonths,
        breakdown: finalContributions,
      };
    });
  }

  static async upsertContribution(goalId: string, memberId: string, amount: number) {
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
  }

  static async deleteGoal(goalId: string) {
    return await prisma.savingsGoal.delete({
      where: { id: goalId },
    });
  }
}
