import { withAuth, withErrorHandling } from '../src/middleware/handler';
import { GroupService } from '../src/services/group';
import { IdSchema } from '../../shared/validation';
import { z } from 'zod';

const TransferOwnershipSchema = z.object({
  newOwnerId: IdSchema,
});

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { groupId } = req.query;
    const validatedGroupId = IdSchema.parse(groupId);
    const validatedBody = TransferOwnershipSchema.parse(req.body);

    const isOwner = await GroupService.isOwner(validatedGroupId, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Only the group owner can transfer ownership' });
    }

    await GroupService.transferOwnership(validatedGroupId, validatedBody.newOwnerId);
    return res.status(200).json({ success: true });
  })
);
