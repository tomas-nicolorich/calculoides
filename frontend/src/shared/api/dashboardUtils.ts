export function calculateTotalIncome(members: { income: number }[]) {
  return members.reduce((sum, m) => sum + m.income, 0);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
