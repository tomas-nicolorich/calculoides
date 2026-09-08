/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GroupService } from "./group";
import { prisma } from "../../prisma";
import { Group, GroupMember, Prisma } from "@prisma/client";

vi.mock("../../prisma", () => ({
  prisma: {
    group: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(
      (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        cb(prisma as unknown as Prisma.TransactionClient),
    ),
  },
}));

describe("GroupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleOwnershipSuccession", () => {
    it("should transfer ownership to the member with the longest tenure", async () => {
      const groupId = "group-1";
      const leavingOwnerId = "owner-1";
      const nextOwner = {
        userId: "member-2",
        joinedAt: new Date("2026-01-01"),
      };

      vi.mocked(prisma.groupMember.findFirst).mockResolvedValue(
        nextOwner as unknown as GroupMember,
      );
      vi.mocked(prisma.group.update).mockResolvedValue({
        id: groupId,
        ownerId: nextOwner.userId,
      } as unknown as Group);

      await GroupService.handleOwnershipSuccession(groupId, leavingOwnerId);

      expect(vi.mocked(prisma.groupMember.findFirst)).toHaveBeenCalled();

      expect(vi.mocked(prisma.group.update)).toHaveBeenCalledWith({
        where: { id: groupId },
        data: { ownerId: nextOwner.userId },
      });
    });

    it("should return null if no other members exist", async () => {
      vi.mocked(prisma.groupMember.findFirst).mockResolvedValue(null);

      const result = await GroupService.handleOwnershipSuccession(
        "group-1",
        "owner-1",
      );

      expect(result).toBeNull();
      expect(vi.mocked(prisma.group.update)).not.toHaveBeenCalled();
    });
  });

  describe("updateMemberIncome", () => {
    const memberId = "member-1";
    const targetGroupId = "group-1";
    const targetUserId = "user-target";
    const targetMemberRow = {
      id: memberId,
      userId: targetUserId,
      groupId: targetGroupId,
      group: { id: targetGroupId, ownerId: "owner-1" },
    } as unknown as GroupMember & { group: Group };

    it("allows the group owner to update any member's income", async () => {
      vi.mocked(prisma.groupMember.findUnique).mockResolvedValueOnce(
        targetMemberRow,
      );
      vi.mocked(prisma.groupMember.update).mockResolvedValue({
        id: memberId,
        income: 5000,
      } as unknown as GroupMember);

      const result = await GroupService.updateMemberIncome(
        "owner-1",
        memberId,
        5000,
      );

      expect(vi.mocked(prisma.groupMember.update)).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { income: 5000 },
      });
      expect(result.income).toBe(5000);
    });

    it("allows a non-owner member who shares the target's group to update income", async () => {
      const requesterId = "member-requester";
      vi.mocked(prisma.groupMember.findUnique).mockImplementation(((
        args: unknown,
      ) => {
        const where = (args as { where: Record<string, unknown> }).where;
        if ("userId_groupId" in where) {
          return Promise.resolve({
            id: "member-requester-row",
            userId: requesterId,
            groupId: targetGroupId,
          } as unknown as GroupMember);
        }
        return Promise.resolve(targetMemberRow as unknown as GroupMember);
      }) as unknown as typeof prisma.groupMember.findUnique);
      vi.mocked(prisma.groupMember.update).mockResolvedValue({
        id: memberId,
        income: 3000,
      } as unknown as GroupMember);

      const result = await GroupService.updateMemberIncome(
        requesterId,
        memberId,
        3000,
      );

      expect(vi.mocked(prisma.groupMember.update)).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { income: 3000 },
      });
      expect(result.income).toBe(3000);
    });

    it("rejects a requester who is not a member of the target's group", async () => {
      vi.mocked(prisma.groupMember.findUnique).mockImplementation(((
        args: unknown,
      ) => {
        const where = (args as { where: Record<string, unknown> }).where;
        if ("userId_groupId" in where) {
          return Promise.resolve(null);
        }
        return Promise.resolve(targetMemberRow as unknown as GroupMember);
      }) as unknown as typeof prisma.groupMember.findUnique);

      await expect(
        GroupService.updateMemberIncome("outsider-1", memberId, 1000),
      ).rejects.toThrow("Unauthorized: not a member of this group");
      expect(vi.mocked(prisma.groupMember.update)).not.toHaveBeenCalled();
    });

    it("rejects when the target member does not exist", async () => {
      vi.mocked(prisma.groupMember.findUnique).mockResolvedValue(null);

      await expect(
        GroupService.updateMemberIncome("user-1", "missing-member", 1000),
      ).rejects.toThrow("Member not found");
    });

    // Characterization test for spec requirement "Derived Figures Refresh
    // Live, Never Persisted" (dashboard-income-edit): updateMemberIncome must
    // only ever write the raw `income` column. Shares/quotas/ceilings are
    // recomputed by the summary handler on every request (see
    // api/_tests/integration/summary.test.ts), never stored alongside income.
    it("persists only the raw income column — no derived share/quota/ceiling field is written", async () => {
      vi.mocked(prisma.groupMember.findUnique).mockResolvedValueOnce(
        targetMemberRow,
      );
      vi.mocked(prisma.groupMember.update).mockResolvedValue({
        id: memberId,
        income: 2750,
      } as unknown as GroupMember);

      await GroupService.updateMemberIncome("owner-1", memberId, 2750);

      const updateCall = vi.mocked(prisma.groupMember.update).mock
        .calls[0][0] as { data: Record<string, unknown> };
      expect(Object.keys(updateCall.data)).toEqual(["income"]);
      expect(updateCall.data).not.toHaveProperty("share");
      expect(updateCall.data).not.toHaveProperty("percentage");
      expect(updateCall.data).not.toHaveProperty("quota");
      expect(updateCall.data).not.toHaveProperty("budgeted");
      expect(updateCall.data).not.toHaveProperty("remainingQuota");
    });

    // Characterization test for spec requirement "Concurrency and Failure
    // Handling": two members editing the same income concurrently must
    // resolve last-write-wins with no merge/conflict error (accepted risk in
    // design.md — no optimistic locking). Runs two updateMemberIncome calls
    // sequentially, as two overlapping browser tabs' Confirm calls would
    // resolve at the API layer.
    it("two members editing the same income concurrently — last write wins, no conflict error", async () => {
      const requesterA = "member-a";
      const requesterB = "member-b";

      function mockFindUniqueFor(requesterId: string) {
        vi.mocked(prisma.groupMember.findUnique).mockImplementation(((
          args: unknown,
        ) => {
          const where = (args as { where: Record<string, unknown> }).where;
          if ("userId_groupId" in where) {
            return Promise.resolve({
              id: `${requesterId}-row`,
              userId: requesterId,
              groupId: targetGroupId,
            } as unknown as GroupMember);
          }
          return Promise.resolve(targetMemberRow as unknown as GroupMember);
        }) as unknown as typeof prisma.groupMember.findUnique);
      }

      // A saves first with 2200.
      mockFindUniqueFor(requesterA);
      vi.mocked(prisma.groupMember.update).mockResolvedValueOnce({
        id: memberId,
        income: 2200,
      } as unknown as GroupMember);
      const resultA = await GroupService.updateMemberIncome(
        requesterA,
        memberId,
        2200,
      );

      // B saves after, with a different value — no merge/conflict error.
      mockFindUniqueFor(requesterB);
      vi.mocked(prisma.groupMember.update).mockResolvedValueOnce({
        id: memberId,
        income: 3100,
      } as unknown as GroupMember);
      const resultB = await GroupService.updateMemberIncome(
        requesterB,
        memberId,
        3100,
      );

      expect(resultA.income).toBe(2200);
      expect(resultB.income).toBe(3100);
      expect(vi.mocked(prisma.groupMember.update)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(prisma.groupMember.update)).toHaveBeenNthCalledWith(1, {
        where: { id: memberId },
        data: { income: 2200 },
      });
      expect(vi.mocked(prisma.groupMember.update)).toHaveBeenNthCalledWith(2, {
        where: { id: memberId },
        data: { income: 3100 },
      });
    });
  });
});
