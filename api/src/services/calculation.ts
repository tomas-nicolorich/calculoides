export interface MemberIncome {
  id: string;
  income: number;
}

export interface IncomeShare {
  id: string;
  share: number; // 0.00 to 1.00
  percentage: number; // 0.00 to 100.00
}

/**
 * Calculates proportional income shares with remainder absorption by the highest earner.
 */
export function calculateIncomeShares(members: MemberIncome[]): IncomeShare[] {
  if (members.length === 0) return [];

  const totalIncome = members.reduce((acc, m) => acc + m.income, 0);

  if (totalIncome === 0) {
    const equalShare = Number((1 / members.length).toFixed(4));
    const equalPercentage = Number((100 / members.length).toFixed(2));
    
    const shares = members.map((m) => ({
      id: m.id,
      share: Number(equalShare.toFixed(2)),
      percentage: equalPercentage,
    }));

    const currentTotal = shares.reduce((acc, s) => acc + s.percentage, 0);
    if (currentTotal !== 100) {
      const diff = Number((100 - currentTotal).toFixed(2));
      shares[0].percentage = Number((shares[0].percentage + diff).toFixed(2));
      shares[0].share = Number((shares[0].percentage / 100).toFixed(2));
    }
    return shares;
  }

  const shares: IncomeShare[] = members.map((m) => {
    const rawShare = m.income / totalIncome;
    return {
      id: m.id,
      share: Math.floor(rawShare * 100) / 100,
      percentage: Math.floor(rawShare * 10000) / 100,
    };
  });

  const currentTotalShare = shares.reduce((acc, s) => acc + s.share, 0);
  const currentTotalPercentage = shares.reduce((acc, s) => acc + s.percentage, 0);

  const shareRemainder = Number((1 - currentTotalShare).toFixed(2));
  const percentageRemainder = Number((100 - currentTotalPercentage).toFixed(2));

  if (shareRemainder > 0 || percentageRemainder > 0) {
    let highestEarnerIndex = 0;
    let maxIncome = -1;

    for (let i = 0; i < members.length; i++) {
      if (members[i].income > maxIncome) {
        maxIncome = members[i].income;
        highestEarnerIndex = i;
      }
    }

    shares[highestEarnerIndex].share = Number(
      (shares[highestEarnerIndex].share + shareRemainder).toFixed(2)
    );
    shares[highestEarnerIndex].percentage = Number(
      (shares[highestEarnerIndex].percentage + percentageRemainder).toFixed(2)
    );
  }

  return shares;
}

export interface CategoryBalance {
  memberId: string;
  totalQuota: number;
  spent: number;
  remainingQuota: number;
}

/**
 * Calculates member-specific balances for a category.
 * Integrates proportional shares, expenses, and transfers.
 */
export function calculateCategoryBalances(
  category: { monthlyBudget: number },
  members: { id: string; share: number }[],
  expenses: { payerId: string; amount: number }[],
  transfers: { fromMemberId: string; toMemberId: string; amount: number }[] = []
): CategoryBalance[] {
  return members.map((m) => {
    const baseQuota = category.monthlyBudget * m.share;

    const memberExpenses = expenses
      .filter((e) => e.payerId === m.id)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const outTransfers = transfers
      .filter((t) => t.fromMemberId === m.id)
      .reduce((acc, t) => acc + Number(t.amount), 0);
    const inTransfers = transfers
      .filter((t) => t.toMemberId === m.id)
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const adjustedQuota = baseQuota - outTransfers + inTransfers;

    return {
      memberId: m.id,
      totalQuota: Number(adjustedQuota.toFixed(2)),
      spent: Number(memberExpenses.toFixed(2)),
      remainingQuota: Number((adjustedQuota - memberExpenses).toFixed(2)),
    };
  });
}
