import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { membersHandler } from "../../../_src/handlers/members";
import { GroupService } from "../../../_src/services/group";
import { prisma } from "../../../_src/utils/prisma";
import { RouteConfig } from "../../../_src/utils/dispatcher";
import { ApiRequest, ApiResponse } from "../../../_src/middleware/handler";

const mockedGroupService = GroupService as unknown as Record<string, Mock>;
const mockedPrisma = prisma as unknown as {
  groupMember: { findUnique: Mock };
};

vi.mock("../../../_src/services/group");
vi.mock("../../../_src/utils/prisma", () => ({
  prisma: {
    groupMember: { findUnique: vi.fn() },
  },
}));
vi.mock("../../../_src/utils/dispatcher", () => ({
  dispatch: vi.fn(
    (
      req: ApiRequest,
      res: ApiResponse,
      routes: RouteConfig,
      defaultAction: string,
    ) => {
      const action = (req.query.action as string) || defaultAction;
      const handler = routes[action];
      if (handler) return handler(req, res);
      res.status(404).json({ error: "Action not found" });
    },
  ),
}));
vi.mock("../../../_src/middleware/handler", () => ({
  withAuth: <T>(handler: T): T => handler,
  withErrorHandling: <T>(handler: T): T => handler,
}));

describe("Members Handler Consolidation", () => {
  it("should exist", () => {
    expect(membersHandler).toBeDefined();
  });
});

describe("remove-member handler", () => {
  let mockRequest: Partial<ApiRequest>;
  let mockResponse: Partial<ApiResponse>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };
  });

  const groupAId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const groupBId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const ownerOfAId = "11111111-1111-1111-1111-111111111111";
  const memberOfBId = "22222222-2222-2222-2222-222222222222";

  it("rejects removal when the caller owns a different group than the target member (parameter-confusion IDOR)", async () => {
    mockRequest = {
      query: {
        action: "remove-member",
        id: memberOfBId,
        groupId: groupAId, // caller supplies a group they own, but the target is in group B
      },
      user: { id: ownerOfAId },
    } as unknown as Partial<ApiRequest>;

    mockedPrisma.groupMember.findUnique.mockResolvedValue({
      id: memberOfBId,
      userId: "some-other-user",
      groupId: groupBId,
    });
    // Caller only owns group A, not group B
    mockedGroupService.isOwner.mockImplementation(
      (groupId: string, userId: string) =>
        Promise.resolve(groupId === groupAId && userId === ownerOfAId),
    );

    await membersHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockedGroupService.isOwner).toHaveBeenCalledWith(
      groupBId,
      ownerOfAId,
    );
    expect(mockedGroupService.removeMember).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });

  it("allows the group owner to remove a member of their own group", async () => {
    mockRequest = {
      query: { action: "remove-member", id: memberOfBId },
      user: { id: "owner-of-b" },
    } as unknown as Partial<ApiRequest>;

    mockedPrisma.groupMember.findUnique.mockResolvedValue({
      id: memberOfBId,
      userId: "some-other-user",
      groupId: groupBId,
    });
    mockedGroupService.isOwner.mockResolvedValue(true);
    mockedGroupService.removeMember.mockResolvedValue(undefined);

    await membersHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockedGroupService.removeMember).toHaveBeenCalledWith(
      groupBId,
      memberOfBId,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(204);
  });

  it("allows a member to remove themself", async () => {
    mockRequest = {
      query: { action: "remove-member", id: memberOfBId },
      user: { id: "self-user" },
    } as unknown as Partial<ApiRequest>;

    mockedPrisma.groupMember.findUnique.mockResolvedValue({
      id: memberOfBId,
      userId: "self-user",
      groupId: groupBId,
    });
    mockedGroupService.isOwner.mockResolvedValue(false);
    mockedGroupService.removeMember.mockResolvedValue(undefined);

    await membersHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockedGroupService.removeMember).toHaveBeenCalledWith(
      groupBId,
      memberOfBId,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(204);
  });
});
