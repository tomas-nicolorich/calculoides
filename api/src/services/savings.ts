import { prisma } from '../utils/prisma';

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
    farDate.setFullYear(9999);
    return farDate;
  }

  const monthsRequired = Math.ceil(targetAmount / totalMonthly);
  const projectedDate = new Date(startDate);
  projectedDate.setMonth(projectedDate.getMonth() + monthsRequired);
  
  return projectedDate;
}

export class SavingsService {
  static async createGoal(groupId: string, name: string, targetAmount: number, targetDate: Date) {
    return await prisma.savings_goals.create({
      data: {
        groupId,
        name,
        targetAmount,
        targetDate,
        updatedAt: new Date(),
      },
    });
  }

  static async getGoalsForGroup(groupId: string) {
    return await prisma.savings_goals.findMany({
      where: { groupId },
      include: {
        savings_goal_contributions: true,
      },
    });
  }

  static async upsertContribution(goalId: string, memberId: string, amount: number) {
    return await prisma.savings_goal_contributions.upsert({
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
    return await prisma.savings_goals.delete({
      where: { id: goalId },
    });
  }
}

