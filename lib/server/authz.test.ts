import { describe, it, expect, vi, beforeEach } from "vitest";
import { isGroupMember } from "./authz";
import { GroupService } from "./services/group";

// resource-authorization: "Group-Scoped Budget Resources Require Membership"
// — membership is resolved via the same `GroupService.getGroupsForUser`
// lookup `requireGroupAccess` already uses in the legacy
// `api/_src/handlers/transactions.ts`, single source of truth for both.
vi.mock("./services/group", () => ({
  GroupService: { getGroupsForUser: vi.fn() },
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const GROUP_A = "22222222-2222-4222-8222-222222222222";
const GROUP_B = "33333333-3333-4333-8333-333333333333";

describe("isGroupMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when the user's groups include the target groupId", async () => {
    // `GroupService` is `vi.mock`ed above into plain `vi.fn()`s, so neither
    // `this`-binding (`unbound-method`) nor argument typing
    // (`no-unsafe-argument`, from the per-element `as any` casts below) is a
    // real concern here — same false-positive class the codebase already
    // silences per-element with `no-explicit-any` throughout these fixtures.
    // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument
    vi.mocked(GroupService.getGroupsForUser).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: GROUP_A } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: GROUP_B } as any,
    ]);

    await expect(isGroupMember(USER_ID, GROUP_A)).resolves.toBe(true);
  });

  it("returns false when the target groupId is not among the user's groups", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument
    vi.mocked(GroupService.getGroupsForUser).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: GROUP_B } as any,
    ]);

    await expect(isGroupMember(USER_ID, GROUP_A)).resolves.toBe(false);
  });
});
