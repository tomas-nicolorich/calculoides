import { withAuth, withErrorHandling } from './src/middleware/handler';
import { InvitationService } from './src/services/invitation';
import { z } from 'zod';

const RespondInvitationSchema = z.object({
  token: z.string(),
  action: z.enum(['ACCEPT', 'REJECT']),
});

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const { token, action } = RespondInvitationSchema.parse(req.body);

      if (action === 'ACCEPT') {
        const result = await InvitationService.acceptInvitation(token, req.user.id);
        res.status(200).json(result); return;
      } else {
        const result = await InvitationService.rejectInvitation(token);
        res.status(200).json(result); return;
      }
    }

    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method ?? ''} Not Allowed` });
  })
);
