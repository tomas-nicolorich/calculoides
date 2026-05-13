import { withAuth, withErrorHandling } from './src/middleware/handler';
import { InvitationService } from './src/services/invitation';
import { CreateInvitationSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const { groupId } = req.query;
      if (!groupId || typeof groupId !== 'string') {
        return res.status(400).json({ error: 'Missing groupId query parameter' });
      }

      const validatedBody = CreateInvitationSchema.parse(req.body);
      const invitation = await InvitationService.createInvitation(
        groupId,
        req.user.id,
        validatedBody.email
      );
      return res.status(201).json(invitation);
    }

    if (req.method === 'GET') {
      const { email } = req.user;
      if (!email) {
        return res.status(400).json({ error: 'User email not found in session' });
      }
      const invitations = await InvitationService.getPendingInvitationsForUser(email);
      return res.status(200).json(invitations);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
