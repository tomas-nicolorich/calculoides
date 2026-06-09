export function calculateProjectedMonths(
  targetAmount: number,
  startingAmount: number,
  totalMonthly: number,
): number {
  const remaining = targetAmount - startingAmount;
  if (remaining <= 0) return 0;
  if (totalMonthly <= 0) return Infinity;
  return Math.ceil(remaining / totalMonthly);
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  if (months === Infinity) {
    result.setFullYear(result.getFullYear() + 100);
    return result;
  }
  result.setMonth(result.getMonth() + months);
  return result;
}
