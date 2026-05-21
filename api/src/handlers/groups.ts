/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { dispatch, RouteConfig } from "../utils/dispatcher";
import { GroupService } from "../services/group";
import { ArchiveService } from "../services/archive";
import { InvitationService } from "../services/invitation";
import {
  withAuth,
  withErrorHandling,
  AuthenticatedRequest,
  ApiResponse,
} from "../middleware/handler";
import {
  CreateGroupSchema,
  CreateInvitationSchema,
  IdSchema,
} from "../../../shared/validation";
import { z } from "zod";
import { Request, Response } from "express";

const RespondInvitationSchema = z.object({
  token: z.string(),
  action: z.enum(["ACCEPT", "REJECT"]),
});

const routes: RouteConfig = {
  list: async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { id } = req.query;
    if (id && typeof id === "string") {
      const groups = await GroupService.getGroupsForUser(authReq.user.id);
      const group = groups.find((g) => g.id === id);
      if (!group) {
        (res as unknown as ApiResponse)
          .status(404)
          .json({ error: "Group not found" });
        return;
      }
      (res as unknown as ApiResponse).status(200).json(group);
      return;
    }
    const groups = await GroupService.getGroupsForUser(authReq.user.id);
    (res as unknown as ApiResponse).status(200).json(groups);
  },
  create: async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const validatedBody = CreateGroupSchema.parse(req.body);
    const group = await GroupService.createGroup(
      authReq.user.id,
      validatedBody.name,
    );
    (res as unknown as ApiResponse).status(201).json(group);
  },
  archive: async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { groupId } = req.body as { groupId: string };
    const validatedGroupId = IdSchema.parse(groupId);
    await ArchiveService.archiveExpenses(validatedGroupId, authReq.user.id);
    (res as unknown as ApiResponse).status(200).json({ success: true });
  },
  transfer: async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const groupId =
      (req.query.groupId as string) || (req.body.groupId as string);
    if (!groupId) {
      (res as unknown as ApiResponse)
        .status(400)
        .json({ error: "Missing groupId" });
      return;
    }
    const { newOwnerId } = req.body as { newOwnerId: string };
    if (!newOwnerId) {
      (res as unknown as ApiResponse)
        .status(400)
        .json({ error: "Missing newOwnerId" });
      return;
    }
    const isOwner = await GroupService.isOwner(groupId, authReq.user.id);
    if (!isOwner) {
      (res as unknown as ApiResponse)
        .status(403)
        .json({ error: "Only the owner can transfer ownership" });
      return;
    }
    const updatedGroup = await GroupService.transferOwnership(
      groupId,
      newOwnerId,
    );
    (res as unknown as ApiResponse).status(200).json(updatedGroup);
  },
  invitations: async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    if (req.method === "GET") {
      const { email } = authReq.user;
      if (!email) {
        (res as unknown as ApiResponse)
          .status(400)
          .json({ error: "User email not found in session" });
        return;
      }
      const invitations =
        await InvitationService.getPendingInvitationsForUser(email);
      (res as unknown as ApiResponse).status(200).json(invitations);
      return;
    } else if (req.method === "POST") {
      const groupId =
        (req.query.groupId as string) || (req.body.groupId as string);
      if (!groupId) {
        (res as unknown as ApiResponse)
          .status(400)
          .json({ error: "Missing groupId (query or body)" });
        return;
      }
      const validatedBody = CreateInvitationSchema.parse(req.body);
      const invitation = await InvitationService.createInvitation(
        groupId,
        authReq.user.id,
        validatedBody.email,
      );
      (res as unknown as ApiResponse).status(201).json(invitation);
      return;
    }
    (res as unknown as ApiResponse)
      .status(405)
      .json({ error: "Method not allowed" });
  },
  "respond-invite": async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { token, action } = RespondInvitationSchema.parse(req.body);
    if (action === "ACCEPT") {
      const result = await InvitationService.acceptInvitation(
        token,
        authReq.user.id,
      );
      (res as unknown as ApiResponse).status(200).json(result);
    } else {
      const result = await InvitationService.rejectInvitation(token);
      (res as unknown as ApiResponse).status(200).json(result);
    }
  },
};

export default withErrorHandling(
  withAuth(async (req, res) => {
    return dispatch(
      req as unknown as Request,
      res as unknown as Response,
      routes,
      "list",
    );
  }),
);
