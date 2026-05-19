import { withAuth, withErrorHandling } from '../../src/middleware/handler';
import { GroupService } from '../../src/services/group';
import { z } from 'zod';

const UpdateIncomeSchema = z.object({
  income: z.number().nonnegative(),
});

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'Missing member id' }); return;
      }

      const { income } = UpdateIncomeSchema.parse(req.body);
      
      // Verification: User can only update their own income unless they are the owner
      // RLS handles the DB part, but we can add service logic here
      const result = await GroupService.updateMemberIncome(id, income);
      res.status(200).json(result); return;
    }

    res.setHeader('Allow', ['PATCH']);
    res.status(405).json({ error: `Method ${req.method ?? ''} Not Allowed` });
  })
);
