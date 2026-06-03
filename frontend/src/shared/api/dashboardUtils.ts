export function calculateTotalIncome(members: { income: number }[]) {
  return members.reduce((sum, m) => sum + m.income, 0);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
