export function calculateProjectedMonths(
  targetAmount: number,
  currentAmount: number,
  totalMonthly: number,
): number {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  if (totalMonthly <= 0) return Infinity;
  return Math.ceil(remaining / totalMonthly);
}

/**
 * Calendar-months remaining until targetDate, adjusted to count only full
 * contribution opportunities: excludes the current partially-elapsed month
 * and the deadline month itself. Single source of truth consumed by both
 * the contribution divisor and the variance/forecast comparison sites.
 */
export function calculateMonthsRemaining(now: Date, targetDate: Date): number {
  return (
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
    (targetDate.getMonth() - now.getMonth()) -
    1
  );
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
