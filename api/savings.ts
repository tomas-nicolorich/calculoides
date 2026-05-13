import { withAuth, withErrorHandling } from './src/middleware/handler';
import { SavingsService } from './src/services/savings';
import { GroupService } from './src/services/group';
import { CreateSavingsGoalSchema, UpsertContributionSchema, IdSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    const { groupId, goalId, memberId } = req.query;

    if (req.method === 'POST') {
      if (goalId && memberId) {
        // Upsert contribution
        const validatedGoalId = IdSchema.parse(goalId);
        const validatedMemberId = IdSchema.parse(memberId);
        const validatedBody = UpsertContributionSchema.parse(req.body);
        
        const contribution = await SavingsService.upsertContribution(
          validatedGoalId,
          validatedMemberId,
          validatedBody.amount
        );
        return res.status(200).json(contribution);
      }

      // Create goal
      const validatedGroupId = IdSchema.parse(groupId);
      const validatedBody = CreateSavingsGoalSchema.parse(req.body);
      
      const goal = await SavingsService.createGoal(
        validatedGroupId,
        validatedBody.name,
        validatedBody.targetAmount,
        validatedBody.targetDate
      );
      return res.status(201).json(goal);
    }

    if (req.method === 'GET') {
      const validatedGroupId = IdSchema.parse(groupId);
      const groups = await GroupService.getGroupsForUser(req.user.id);
      const group = groups.find((g) => g.id === validatedGroupId);

      if (!group) {
        return res.status(403).json({ error: 'Access denied to this group' });
      }

      const goals = await SavingsService.getGoalsForGroup(validatedGroupId);
      return res.status(200).json(goals);
    }

    if (req.method === 'DELETE') {
      const validatedGoalId = IdSchema.parse(goalId);
      await SavingsService.deleteGoal(validatedGoalId);
      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
