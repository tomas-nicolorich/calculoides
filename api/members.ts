import { withAuth, withErrorHandling } from './src/middleware/handler';
import { GroupService } from './src/services/group';
import { prisma } from './src/utils/prisma';

export default withErrorHandling(
  withAuth(async (req, res, user) => {
    // GET /api/members?groupId=xxx
    if (req.method === 'GET') {
      const { groupId } = req.query;
      if (!groupId || typeof groupId !== 'string') {
        res.status(400).json({ error: 'Missing groupId' });
        return;
      }

      // Check access: must be a member or owner
      const isMember = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: user.id, groupId } }
      });
      const isOwner = await GroupService.isOwner(groupId, user.id);

      if (!isMember && !isOwner) {
        res.status(403).json({ error: 'Unauthorized access to group members' });
        return;
      }
      
      const members = await GroupService.getGroupMembers(groupId);
      res.status(200).json(members);
      return;
    }

    const { id } = req.query; // memberId

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Missing memberId' });
      return;
    }

    if (req.method === 'PATCH') {
      const { income } = req.body as { income: number };
      
      if (typeof income !== 'number' || income < 0) {
        res.status(400).json({ error: 'Invalid income' });
        return;
      }

      // Authorization handled within GroupService.updateMemberIncome (BUG-013)
      const updatedMember = await GroupService.updateMemberIncome(user.id, id, income);
      res.status(200).json(updatedMember);
      return;
    }

    if (req.method === 'DELETE') {
      const { groupId } = req.query;
      if (!groupId || typeof groupId !== 'string') {
        res.status(400).json({ error: 'Missing groupId' });
        return;
      }

      const member = await prisma.groupMember.findUnique({
        where: { id }
      });

      if (!member) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      const isOwner = await GroupService.isOwner(groupId, user.id);
      const isSelf = member.userId === user.id;

      if (!isOwner && !isSelf) {
        res.status(403).json({ error: 'Only the owner can remove other members' });
        return;
      }

      await GroupService.removeMember(groupId, id);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
