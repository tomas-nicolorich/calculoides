import { withAuth, withErrorHandling } from './src/middleware/handler';
import { InvitationService } from './src/services/invitation';
import { z } from 'zod';

const RespondInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  action: z.enum(['ACCEPT', 'REJECT']),
});

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const { invitationId, action } = RespondInvitationSchema.parse(req.body);

      if (action === 'ACCEPT') {
        const result = await InvitationService.acceptInvitation(invitationId, req.user.id);
        return res.status(200).json(result);
      } else {
        const result = await InvitationService.rejectInvitation(invitationId);
        return res.status(200).json(result);
      }
    }

    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
