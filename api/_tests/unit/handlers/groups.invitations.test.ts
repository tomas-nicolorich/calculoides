/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import groupsHandler from "../../../_src/handlers/groups";
import { InvitationService } from "../../../../lib/server/services/invitation";
import { GroupService } from "../../../../lib/server/services/group";

// Mock the services
vi.mock("../../../../lib/server/services/group");
vi.mock("../../../../lib/server/services/archive");
vi.mock("../../../../lib/server/services/invitation");
vi.mock("../../../_src/middleware/handler", async () => {
  const actual = (await vi.importActual(
    "../../../_src/middleware/handler",
  )) as any;
  return {
    ...actual,
    withAuth: (handler: any) => (req: any, res: any) => {
      req.user = { id: "user-1", email: "test@example.com" };
      return handler(req, res);
    },
    withErrorHandling: (handler: any) => handler,
  };
});

describe("Groups Handler - Invitations Regression (BUG-005)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    } as any;
  });

  it("GET /api/invitations (action=invitations) should return Invitation array, not Groups", async () => {
    const mockInvitations = [
      {
        id: "inv-1",
        email: "test@example.com",
        status: "PENDING",
        group: { name: "Test Group" },
        inviter: { name: "Owner", email: "owner@example.com" },
      },
    ];

    vi.mocked(InvitationService.getPendingInvitationsForUser).mockResolvedValue(
      mockInvitations as any,
    );

    req = {
      method: "GET",
      query: { action: "invitations" },
      headers: { authorization: "Bearer token" },
    };

    await groupsHandler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockInvitations);
    expect(InvitationService.getPendingInvitationsForUser).toHaveBeenCalledWith(
      "test@example.com",
    );
    expect(GroupService.getGroupsForUser).not.toHaveBeenCalled();
  });

  it("GET /api/invitations (WITHOUT action) should return Groups (current buggy behavior if defaultAction is list)", async () => {
    const mockGroups = [{ id: "group-1", name: "Some Group" }];
    vi.mocked(GroupService.getGroupsForUser).mockResolvedValue(
      mockGroups as any,
    );

    req = {
      method: "GET",
      query: {}, // MISSING action
      headers: { authorization: "Bearer token" },
    };

    await groupsHandler(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockGroups);
  });
});
