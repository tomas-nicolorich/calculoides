import type { ContributionBreakdown } from "./index";

export interface ContributionPersistenceDiff {
  toUpsert: { memberId: string; amount: number }[];
  toDelete: string[];
}

/**
 * Diffs a goal's current DB-backed contribution breakdown against the
 * in-session override intent to derive exactly which members must be
 * upserted vs. deleted on save.
 *
 * - A member present in `overrideAmounts` is upserted with that value,
 *   whether the entry came from a live edit or an undo-restored reset.
 * - A member absent from `overrideAmounts` who WAS overridden
 *   (`breakdown[].isOverridden === true`) had that override reset and
 *   is deleted so the DB no longer holds a stale row.
 * - A member absent from `overrideAmounts` who was never overridden is
 *   untouched: no upsert, no delete.
 */
export function diffContributionPersistence(
  breakdown: ContributionBreakdown[],
  overrideAmounts: Record<string, number>,
): ContributionPersistenceDiff {
  const toUpsert: { memberId: string; amount: number }[] = [];
  const toDelete: string[] = [];

  for (const item of breakdown) {
    if (Object.prototype.hasOwnProperty.call(overrideAmounts, item.memberId)) {
      toUpsert.push({
        memberId: item.memberId,
        amount: overrideAmounts[item.memberId],
      });
    } else if (item.isOverridden) {
      toDelete.push(item.memberId);
    }
  }

  return { toUpsert, toDelete };
}
