export function calculateTotalIncome(members: { income: number }[]) {
  return members.reduce((sum, m) => sum + m.income, 0);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function categoryMemberShare(
  allMembers: { id: string; income: number }[],
  balanceMemberIds: string[],
): { memberId: string; share: number }[] {
  const isSubset = balanceMemberIds.length < allMembers.length;
  const participating = isSubset
    ? allMembers.filter((m) => balanceMemberIds.includes(m.id))
    : allMembers;

  const totalIncome = participating.reduce((sum, m) => sum + m.income, 0);
  if (totalIncome === 0) {
    return balanceMemberIds.map((id) => ({ memberId: id, share: 0 }));
  }

  return participating.map((m) => ({
    memberId: m.id,
    share: Math.round((m.income / totalIncome) * 1000) / 10,
  }));
}
