// Plain-language translations for the errors the savings API can actually
// throw (see api/_src/services/savings.ts), matching the known-case /
// generic-fallback pattern already used by LoginForm. Never surface a raw
// exception message to the user.
const KNOWN_SAVINGS_ERRORS: Record<string, string> = {
  "Savings goal not found":
    "This savings goal no longer exists — it may have already been removed.",
  "Group member not found": "That member no longer belongs to this group.",
  "Member does not belong to the group associated with this savings goal":
    "That member doesn't belong to this group.",
  "User does not belong to the group associated with this savings goal":
    "You don't have access to this savings goal.",
  "Failed to fetch":
    "Couldn't reach the server. Check your connection and try again.",
};

const GENERIC_SAVINGS_ERROR = "Something went wrong. Please try again.";

export function toFriendlySavingsError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return KNOWN_SAVINGS_ERRORS[raw] ?? GENERIC_SAVINGS_ERROR;
}
