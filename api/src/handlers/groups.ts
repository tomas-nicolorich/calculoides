import { dispatch, RouteConfig } from "../utils/dispatcher";
import { GroupService } from "../services/group";
import { ArchiveService } from "../services/archive";
import { InvitationService } from "../services/invitation";
import {
  withAuth,
  withErrorHandling,
  AuthenticatedRequest,
  ApiRequest,
  ApiResponse,
} from "../middleware/handler";
import {
  CreateGroupSchema,
  CreateInvitationSchema,
  IdSchema,
} from "../../../shared/validation";
import { z } from "zod";

const RespondInvitationSchema = z.object({
  token: z.string(),
  action: z.enum(["ACCEPT", "REJECT"]),
});

const routes: RouteConfig = {
  list: async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.query;
    if (id && typeof id === "string") {
      const groups = await GroupService.getGroupsForUser(authReq.user.id);
      const group = groups.find((g) => g.id === id);
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      res.status(200).json(group);
      return;
    }
    const groups = await GroupService.getGroupsForUser(authReq.user.id);
    res.status(200).json(groups);
  },
  create: async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const validatedBody = CreateGroupSchema.parse(req.body);
    const group = await GroupService.createGroup(
      authReq.user.id,
      validatedBody.name,
    );
    res.status(201).json(group);
  },
  archive: async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const { groupId } = req.body as { groupId: string };
    const validatedGroupId = IdSchema.parse(groupId);
    await ArchiveService.archiveExpenses(validatedGroupId, authReq.user.id);
    res.status(200).json({ success: true });
  },
  transfer: async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const groupId =
      (req.query.groupId as string) ||
      (req.body as { groupId?: string }).groupId;
    if (!groupId) {
      res.status(400).json({ error: "Missing groupId" });
      return;
    }
    const { newOwnerId } = req.body as { newOwnerId: string };
    if (!newOwnerId) {
      res.status(400).json({ error: "Missing newOwnerId" });
      return;
    }
    const isOwner = await GroupService.isOwner(groupId, authReq.user.id);
    if (!isOwner) {
      res.status(403).json({ error: "Only the owner can transfer ownership" });
      return;
    }
    const updatedGroup = await GroupService.transferOwnership(
      groupId,
      newOwnerId,
    );
    res.status(200).json(updatedGroup);
  },
  invitations: async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    if (req.method === "GET") {
      const { email } = authReq.user;
      if (!email) {
        res.status(400).json({ error: "User email not found in session" });
        return;
      }
      const invitations =
        await InvitationService.getPendingInvitationsForUser(email);
      res.status(200).json(invitations);
      return;
    } else if (req.method === "POST") {
      const groupId =
        (req.query.groupId as string) ||
        (req.body as { groupId?: string }).groupId;
      if (!groupId) {
        res.status(400).json({ error: "Missing groupId (query or body)" });
        return;
      }
      const validatedBody = CreateInvitationSchema.parse(req.body);
      const invitation = await InvitationService.createInvitation(
        groupId,
        authReq.user.id,
        validatedBody.email,
      );
      res.status(201).json(invitation);
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  },
  "respond-invite": async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const { token, action } = RespondInvitationSchema.parse(req.body);
    if (action === "ACCEPT") {
      const result = await InvitationService.acceptInvitation(
        token,
        authReq.user.id,
      );
      res.status(200).json(result);
    } else {
      const result = await InvitationService.rejectInvitation(token);
      res.status(200).json(result);
    }
  },
};

export const groupsHandler = withErrorHandling(
  withAuth(async (req, res) => {
    return dispatch(req, res, routes, "list");
  }),
);

export default groupsHandler;
