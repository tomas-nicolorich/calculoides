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
 * Full calendar months elapsed between now and targetDate, day-of-month
 * aware. Only excludes the trailing partial month when targetDate's
 * day-of-month is earlier than now's — i.e. the last month hasn't fully
 * elapsed yet. Single source of truth consumed by both the contribution
 * divisor and the variance/forecast comparison sites.
 */
export function calculateMonthsRemaining(now: Date, targetDate: Date): number {
  const rawDiff =
    (targetDate.getFullYear() - now.getFullYear()) * 12 +
    (targetDate.getMonth() - now.getMonth());
  return targetDate.getDate() < now.getDate() ? rawDiff - 1 : rawDiff;
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
