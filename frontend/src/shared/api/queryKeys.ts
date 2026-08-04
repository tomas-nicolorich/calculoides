/** Key placeholder used for a disabled query (`groupId === null`). */
export const NO_GROUP = "__no-group__";

export interface ExpenseFilters {
  categoryId?: string;
  memberId?: string;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}

export interface TransferFilters {
  categoryId?: string;
  memberId?: string;
  limit?: number;
  offset?: number;
}

/** Drops `undefined` fields so `{}` and `{ foo: undefined }` hash identically. */
function strip<T extends object>(filters: T): T {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as T;
}

export const queryKeys = {
  groups: () => ["groups"] as const,
  group: (groupId: string) => ["group", groupId] as const, // invalidation prefix
  summary: (groupId: string) => ["group", groupId, "summary"] as const,
  categories: (groupId: string) => ["group", groupId, "categories"] as const,
  savingsGoals: (groupId: string) => ["group", groupId, "savings"] as const,
  expenses: (groupId: string, filters: ExpenseFilters = {}) =>
    ["group", groupId, "expenses", strip(filters)] as const,
  transfers: (groupId: string, filters: TransferFilters = {}) =>
    ["group", groupId, "transfers", strip(filters)] as const,
} as const;
