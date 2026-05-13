import { withAuth, withErrorHandling } from './src/middleware/handler';
import { ArchiveService } from './src/services/archive';
import { IdSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const { groupId } = req.body;
      const validatedGroupId = IdSchema.parse(groupId);
      
      await ArchiveService.archiveExpenses(validatedGroupId, req.user.id);
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
