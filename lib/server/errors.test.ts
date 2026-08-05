import { describe, it, expect } from "vitest";
import { toStatus } from "./errors";

// design.md Interfaces / Contracts: "lib/server/errors.ts — one
// message→status table, reused by both surfaces. Ports the existing
// catch-blocks (\"Not a member of this group\" → 403, etc.)."
// Table entries below are ported verbatim from the thrown-message strings
// in `api/_src/handlers/{groups,transactions}.ts` and
// `lib/server/services/{group,archive,invitation}.ts`.
describe("toStatus", () => {
  it("maps known 'not found' messages to 404", () => {
    expect(toStatus("Group not found")).toBe(404);
    expect(toStatus("Member not found")).toBe(404);
  });

  it("maps known ownership/membership-denial messages to 403", () => {
    expect(toStatus("Unauthorized access to group")).toBe(403);
    expect(toStatus("Only the owner can transfer ownership")).toBe(403);
    expect(toStatus("Only the group owner can archive expenses")).toBe(403);
    expect(toStatus("Only the group owner can undo archiving")).toBe(403);
  });

  it("maps known validation-failure messages to 400", () => {
    expect(toStatus("New owner must be a member of the group")).toBe(400);
    expect(toStatus("User is already a member of this group")).toBe(400);
  });

  it("defaults an unrecognized message to 500", () => {
    expect(toStatus("Something exploded unexpectedly")).toBe(500);
  });
});
