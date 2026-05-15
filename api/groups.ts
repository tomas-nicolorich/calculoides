import { withAuth, withErrorHandling } from './src/middleware/handler';
import { GroupService } from './src/services/group';
import { CreateGroupSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const validatedBody = CreateGroupSchema.parse(req.body);
      const group = await GroupService.createGroup(req.user.id, validatedBody.name);
      return res.status(201).json(group);
    }

    if (req.method === 'GET') {
      const { id } = req.query;
      if (id && typeof id === 'string') {
        const groups = await GroupService.getGroupsForUser(req.user.id);
        const group = groups.find(g => g.id === id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        return res.status(200).json(group);
      }
      const groups = await GroupService.getGroupsForUser(req.user.id);
      return res.status(200).json(groups);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
