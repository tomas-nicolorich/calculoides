import { withAuth, withErrorHandling } from './src/middleware/handler';
import { GroupService } from './src/services/group';

export default withErrorHandling(
  withAuth(async (req, res, user) => {
    const { groupId } = req.query;

    if (!groupId || typeof groupId !== 'string') {
      res.status(400).json({ error: 'Missing groupId' });
      return;
    }

    if (req.method === 'POST') {
      const { newOwnerId } = req.body as { newOwnerId: string };
      
      if (!newOwnerId || typeof newOwnerId !== 'string') {
        res.status(400).json({ error: 'Missing newOwnerId' });
        return;
      }

      // Verify current user is the owner
      const isOwner = await GroupService.isOwner(groupId, user.id);
      if (!isOwner) {
        res.status(403).json({ error: 'Only the owner can transfer ownership' });
        return;
      }

      const updatedGroup = await GroupService.transferOwnership(groupId, newOwnerId);
      res.status(200).json(updatedGroup);
      return;
    }

    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
