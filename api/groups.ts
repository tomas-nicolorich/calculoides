import { withAuth, withErrorHandling } from './src/middleware/handler';
import { GroupService } from './src/services/group';
import { CreateGroupSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const validatedBody = CreateGroupSchema.parse(req.body);
      const group = await GroupService.createGroup(req.user.id, validatedBody.name);
      res.status(201).json(group); return;
    }

    if (req.method === 'GET') {
      const { id } = req.query;
      if (id && typeof id === 'string') {
        const groups = await GroupService.getGroupsForUser(req.user.id);
        const group = groups.find(g => g.id === id);
        if (!group) { res.status(404).json({ error: 'Group not found' }); return; }
        res.status(200).json(group); return;
      }
      const groups = await GroupService.getGroupsForUser(req.user.id);
      res.status(200).json(groups); return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${String(req.method)} Not Allowed` });
  })
);
