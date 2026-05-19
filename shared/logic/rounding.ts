export interface MemberWithIncome {
  id: string;
  income: number;
}

export interface RoundedShare {
  id: string;
  share: number;       // 0.00 to 1.00
  percentage: number;  // 0.00 to 100.00
}

/**
 * Calculates proportional shares and percentages with Remainder Absorption.
 * Round all shares down to 2 decimal places and assign the rounding difference 
 * to the member with the highest income.
 */
export function calculateRoundedShares(members: MemberWithIncome[]): RoundedShare[] {
  if (members.length === 0) return [];

  const totalIncome = members.reduce((sum, m) => sum + m.income, 0);

  if (totalIncome === 0) {
    // Equal split if total income is 0
    const count = members.length;
    const baseShare = Math.floor(Number(((1 / count) * 100).toFixed(10))) / 100;
    const basePercentage = Math.floor(Number(((100 / count) * 100).toFixed(10))) / 100;

    const shares: RoundedShare[] = members.map(m => ({
      id: m.id,
      share: baseShare,
      percentage: basePercentage
    }));

    // Absorption by the first member (as highest income is tied at 0)
    const currentTotalShare = Number((baseShare * count).toFixed(2));
    const currentTotalPercentage = Number((basePercentage * count).toFixed(2));
    
    const shareRemainder = Number((1 - currentTotalShare).toFixed(2));
    const percentageRemainder = Number((100 - currentTotalPercentage).toFixed(2));

    shares[0].share = Number((shares[0].share + shareRemainder).toFixed(2));
    shares[0].percentage = Number((shares[0].percentage + percentageRemainder).toFixed(2));

    return shares;
  }

  let highestIncomeMemberIndex = 0;
  let maxIncome = -1;

  const shares: RoundedShare[] = members.map((m, index) => {
    // Audit: Consistent highest earner selection (picks the first one if tied)
    if (m.income > maxIncome) {
      maxIncome = m.income;
      highestIncomeMemberIndex = index;
    }

    const rawShare = m.income / totalIncome;
    // Round down to 2 decimal places
    const roundedShare = Math.floor(Number((rawShare * 100).toFixed(10))) / 100;
    const roundedPercentage = Math.floor(Number((rawShare * 10000).toFixed(10))) / 100;

    return {
      id: m.id,
      share: roundedShare,
      percentage: roundedPercentage
    };
  });

  const currentTotalShare = shares.reduce((sum, s) => Number((sum + s.share).toFixed(2)), 0);
  const currentTotalPercentage = shares.reduce((sum, s) => Number((sum + s.percentage).toFixed(2)), 0);

  const shareRemainder = Number((1 - currentTotalShare).toFixed(2));
  const percentageRemainder = Number((100 - currentTotalPercentage).toFixed(2));

  if (shareRemainder !== 0 || percentageRemainder !== 0) {
    shares[highestIncomeMemberIndex].share = Number((shares[highestIncomeMemberIndex].share + shareRemainder).toFixed(2));
    shares[highestIncomeMemberIndex].percentage = Number((shares[highestIncomeMemberIndex].percentage + percentageRemainder).toFixed(2));
  }

  return shares;
}
