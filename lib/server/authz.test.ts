import { describe, it, expect, vi, beforeEach } from "vitest";
import { isGroupMember, isGroupOwner } from "./authz";
import { GroupService } from "./services/group";

// resource-authorization: "Group-Scoped Budget Resources Require Membership"
// — membership is resolved via the same `GroupService.getGroupsForUser`
// lookup `requireGroupAccess` already uses in the legacy
// `api/_src/handlers/transactions.ts`, single source of truth for both.
//
// `isGroupOwner` (3a.4) mirrors the exact ownership-check precedent at
// `api/_src/handlers/groups.ts:80` (`GroupService.isOwner(groupId,
// authReq.user.id)`), lifted alongside `isGroupMember` for reuse by
// `lib/actions/group.ts`'s `transferOwnership`/`archive`/`undoArchive`.
vi.mock("./services/group", () => ({
  GroupService: { getGroupsForUser: vi.fn(), isOwner: vi.fn() },
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

describe("isGroupOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when GroupService.isOwner resolves true for the caller", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(GroupService.isOwner).mockResolvedValue(true);

    await expect(isGroupOwner(USER_ID, GROUP_A)).resolves.toBe(true);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(GroupService.isOwner).toHaveBeenCalledWith(GROUP_A, USER_ID);
  });

  it("returns false when GroupService.isOwner resolves false for a non-owner", async () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(GroupService.isOwner).mockResolvedValue(false);

    await expect(isGroupOwner(USER_ID, GROUP_A)).resolves.toBe(false);
  });
});
