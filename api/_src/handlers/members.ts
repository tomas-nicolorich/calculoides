import { dispatch, RouteConfig } from "../utils/dispatcher";
import { GroupService } from "../services/group";
import {
  withAuth,
  withErrorHandling,
  AuthenticatedRequest,
  ApiRequest,
  ApiResponse,
} from "../middleware/handler";
import { prisma } from "../utils/prisma";
import { z } from "zod";

const UpdateIncomeSchema = z.object({
  income: z.number().nonnegative(),
});

const routes: RouteConfig = {
  list: async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const { groupId } = req.query;
    if (!groupId || typeof groupId !== "string") {
      res.status(400).json({ error: "Missing groupId" });
      return;
    }

    // Check access: must be a member or owner
    const isMember = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: authReq.user.id, groupId } },
    });
    const isOwner = await GroupService.isOwner(groupId, authReq.user.id);

    if (!isMember && !isOwner) {
      res.status(403).json({ error: "Unauthorized access to group members" });
      return;
    }

    const members = await GroupService.getGroupMembers(groupId);
    res.status(200).json(members);
  },
  "update-income": async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const id =
      (req.query.id as string) || (req.body as { memberId?: string }).memberId;
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Missing memberId" });
      return;
    }
    const { income } = UpdateIncomeSchema.parse(req.body);

    // Authorization handled within GroupService.updateMemberIncome
    const updatedMember = await GroupService.updateMemberIncome(
      authReq.user.id,
      id,
      income,
    );
    res.status(200).json(updatedMember);
  },
  "remove-member": async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Missing memberId" });
      return;
    }

    const member = await prisma.groupMember.findUnique({
      where: { id },
    });

    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    // Authorization is derived from the member's own groupId, never from a
    // caller-supplied one — otherwise an owner of group A could pass group
    // A's id alongside a memberId from group B and remove that member.
    const isOwner = await GroupService.isOwner(member.groupId, authReq.user.id);
    const isSelf = member.userId === authReq.user.id;

    if (!isOwner && !isSelf) {
      res
        .status(403)
        .json({ error: "Only the owner can remove other members" });
      return;
    }

    await GroupService.removeMember(member.groupId, id);
    res.status(204).end();
  },
};

export const membersHandler = withErrorHandling(
  withAuth(async (req, res) => {
    return dispatch(req, res, routes, "list");
  }),
);

export default membersHandler;
