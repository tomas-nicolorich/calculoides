/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GroupService } from "../../_src/services/group";
import { membersHandler } from "../../_src/handlers/members";
import { prisma } from "../../_src/utils/prisma";
import { Group, GroupMember, Prisma } from "@prisma/client";
import { ApiRequest, ApiResponse } from "../../_src/middleware/handler";

// Mock Prisma
vi.mock("../../_src/utils/prisma", () => ({
  prisma: {
    $transaction: vi.fn(
      (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        cb({
          group: {
            create: vi.fn().mockResolvedValue({
              id: "group-1",
              name: "Household",
              ownerId: "user-1",
            }),
          },
          groupMember: {
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
          },
        } as unknown as Prisma.TransactionClient),
    ),
    group: {
      findMany: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Bypass real Supabase auth + error-handling middleware so the route body
// (including UpdateIncomeSchema validation + GroupService authorization)
// can be exercised directly with an injected `req.user`.
vi.mock("../../_src/middleware/handler", () => ({
  withAuth: <T>(handler: T): T => handler,
  withErrorHandling: <T>(handler: T): T => handler,
}));

describe("GroupService Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a group and its first member", async () => {
    const ownerId = "user-1";
    const name = "Household";

    const result = await GroupService.createGroup(ownerId, name);

    expect(result).toEqual(expect.objectContaining({ id: "group-1", name }));
  });

  it("should transfer ownership correctly", async () => {
    const groupId = "group-1";
    const newOwnerId = "user-2";

    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue({
      id: "member-2",
    } as GroupMember);
    vi.mocked(prisma.group.update).mockResolvedValue({
      id: groupId,
      ownerId: newOwnerId,
    } as Group);

    const result = await GroupService.transferOwnership(groupId, newOwnerId);

    expect(vi.mocked(prisma.group.update)).toHaveBeenCalledWith({
      where: { id: groupId },
      data: { ownerId: newOwnerId },
    });
    expect(result.ownerId).toBe(newOwnerId);
  });

  describe("PUT /members/:id/income (update-income route)", () => {
    const memberId = "member-1";
    const targetGroupId = "group-1";
    const targetUserId = "user-target";
    const targetMemberRow = {
      id: memberId,
      userId: targetUserId,
      groupId: targetGroupId,
      group: { id: targetGroupId, ownerId: "owner-1" },
    } as unknown as GroupMember & { group: Group };

    let mockResponse: Partial<ApiResponse>;

    beforeEach(() => {
      mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        end: vi.fn().mockReturnThis(),
        headersSent: false,
      };
    });

    function buildRequest(
      overrides: Partial<ApiRequest> & { user: { id: string } },
    ): ApiRequest {
      return {
        query: { action: "update-income", id: memberId },
        headers: {},
        ...overrides,
      } as unknown as ApiRequest;
    }

    it("returns 200 when a non-owner shared-group member updates another member's income", async () => {
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
        income: 4200,
      } as unknown as GroupMember);

      const req = buildRequest({
        body: { income: 4200 },
        user: { id: requesterId },
      });

      await membersHandler(req, mockResponse as ApiResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: memberId, income: 4200 }),
      );
    });

    it("rejects a requester who is a member of a different group; income unchanged", async () => {
      vi.mocked(prisma.groupMember.findUnique).mockImplementation(((
        args: unknown,
      ) => {
        const where = (args as { where: Record<string, unknown> }).where;
        if ("userId_groupId" in where) {
          return Promise.resolve(null);
        }
        return Promise.resolve(targetMemberRow as unknown as GroupMember);
      }) as unknown as typeof prisma.groupMember.findUnique);

      const req = buildRequest({
        body: { income: 4200 },
        user: { id: "outsider-1" },
      });

      await membersHandler(req, mockResponse as ApiResponse);

      expect(mockResponse.status).not.toHaveBeenCalledWith(200);
      expect(vi.mocked(prisma.groupMember.update)).not.toHaveBeenCalled();
    });

    it("rejects negative income via UpdateIncomeSchema before reaching the service; no data change", async () => {
      const req = buildRequest({
        body: { income: -100 },
        user: { id: "owner-1" },
      });

      await membersHandler(req, mockResponse as ApiResponse);

      expect(mockResponse.status).not.toHaveBeenCalledWith(200);
      expect(vi.mocked(prisma.groupMember.findUnique)).not.toHaveBeenCalled();
      expect(vi.mocked(prisma.groupMember.update)).not.toHaveBeenCalled();
    });
  });
});
