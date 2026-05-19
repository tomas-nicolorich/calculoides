import { withAuth, withErrorHandling } from './src/middleware/handler';
import { InvitationService } from './src/services/invitation';
import { CreateInvitationSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const { groupId } = req.query;
      if (!groupId || typeof groupId !== 'string') {
        res.status(400).json({ error: 'Missing groupId query parameter' }); return;
      }

      const validatedBody = CreateInvitationSchema.parse(req.body);
      const invitation = await InvitationService.createInvitation(
        groupId,
        req.user.id,
        validatedBody.email
      );
      res.status(201).json(invitation); return;
    }

    if (req.method === 'GET') {
      const { email } = req.user;
      if (!email) {
        res.status(400).json({ error: 'User email not found in session' }); return;
      }
      const invitations = await InvitationService.getPendingInvitationsForUser(email);
      res.status(200).json(invitations); return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method ?? ''} Not Allowed` });
  })
);
