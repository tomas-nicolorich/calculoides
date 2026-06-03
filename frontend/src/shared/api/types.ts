export interface User {
  id: string;
  name: string | null;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: Member[];
  role: 'OWNER' | 'MEMBER';
}

export interface Member {
  id: string;
  userId: string;
  income: number;
  joinedAt: string;
  user?: User;
}

export interface CategoryBalance {
  memberId: string;
  totalQuota: number;
  spent: number;
  remainingQuota: number;
  share: number;
  percentage: number;
  user?: User;
}

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  monthlyBudget: number;
  totalSpent: number;
  balances: CategoryBalance[];
}

export interface ContributionBreakdown {
  memberId: string;
  proportionalAmount: number;
  actualAmount: number;
  isOverridden: boolean;
  user?: User;
}

export interface SavingsGoal {
  id: string;
  groupId: string;
  name: string;
  targetAmount: number;
  startingAmount: number;
  targetDate: string;
  projectedDate: string;
  varianceMonths: number;
  breakdown: ContributionBreakdown[];
}

export interface MemberSummary {
  id: string;
  name: string;
  income: number;
  share: number;
  spent: number;
  remainingQuota: number;
}

export interface RecentExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName: string;
  payerName: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  payer: {
    user: User;
  };
}

export interface Invitation {
  id: string;
  token: string;
  groupId: string;
  group: { name: string };
  inviter: { name: string | null; email: string };
  status: string;
}

export interface Summary {
  groupName: string;
  totalIncome: number;
  totalBudget: number;
  totalSpent: number;
  members: MemberSummary[];
  recentExpenses: RecentExpense[];
}
