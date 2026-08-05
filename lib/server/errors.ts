// One message→status table, reused by both Route Handlers and Server
// Actions. Ports the existing catch-block mappings from
// `api/_src/handlers/{groups,transactions}.ts` into a single, extensible
// lookup — later phases (3b-6a) append their own entries here.
const STATUS_BY_MESSAGE: Record<string, 400 | 403 | 404 | 500> = {
  // Not found
  "Group not found": 404,
  "Member not found": 404,

  // Ownership / membership denial
  "Unauthorized access to group": 403,
  "Unauthorized: not a member of this group": 403,
  "Not a member of this group": 403,
  "Access denied to this group": 403,
  "Only the owner can transfer ownership": 403,
  "Only the group owner can archive expenses": 403,
  "Only the group owner can undo archiving": 403,

  // Validation failures
  "New owner must be a member of the group": 400,
  "User is already a member of this group": 400,
};

/**
 * Maps a thrown Error's message to its HTTP-equivalent status. Unknown
 * messages default to 500 (internal error) — the same behavior
 * `withErrorHandling` falls back to for uncaught error shapes.
 */
export function toStatus(message: string): 400 | 403 | 404 | 500 {
  return STATUS_BY_MESSAGE[message] ?? 500;
}
