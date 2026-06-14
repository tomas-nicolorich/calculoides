/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GroupService } from "../../_src/services/group";
import { prisma } from "../../_src/utils/prisma";
import { Group, GroupMember, Prisma } from "@prisma/client";

vi.mock("../../_src/utils/prisma", () => ({
  prisma: {
    group: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
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
});
