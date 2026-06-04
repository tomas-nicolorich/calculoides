export interface User {
  id: string;
  name: string | null;
  email: string;
}

export interface Member {
  id: string;
  userId: string;
  income: number;
  joinedAt: string;
  user?: User;
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

export interface Summary {
  groupName: string;
  totalIncome: number;
  totalBudget: number;
  totalSpent: number;
  members: MemberSummary[];
  recentExpenses: RecentExpense[];
}
