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
        res.status(200).json(contribution);
        return;
      }

      // Create goal
      const validatedGroupId = IdSchema.parse(groupId);
      const validatedBody = CreateSavingsGoalSchema.parse(req.body);
      
      const goal = await SavingsService.createGoal(
        validatedGroupId,
        validatedBody.name,
        validatedBody.targetAmount,
        validatedBody.targetDate,
        validatedBody.startingAmount
      );
      res.status(201).json(goal);
      return;
    }

    if (req.method === 'PATCH') {
      const validatedGoalId = IdSchema.parse(goalId);
      const validatedBody = CreateSavingsGoalSchema.parse(req.body);
      
      const goal = await SavingsService.updateGoal(
        validatedGoalId,
        validatedBody.name,
        validatedBody.targetAmount,
        validatedBody.targetDate,
        validatedBody.startingAmount
      );
      res.status(200).json(goal);
      return;
    }

    if (req.method === 'GET') {
      const validatedGroupId = IdSchema.parse(groupId);
      const groups = await GroupService.getGroupsForUser(req.user.id);
      const group = groups.find((g) => g.id === validatedGroupId);

      if (!group) {
        res.status(403).json({ error: 'Access denied to this group' });
        return;
      }

      const goals = await SavingsService.getGoalsForGroup(validatedGroupId);
      res.status(200).json(goals);
      return;
    }

    if (req.method === 'DELETE') {
      const validatedGoalId = IdSchema.parse(goalId);
      await SavingsService.deleteGoal(validatedGoalId);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method ?? ''} Not Allowed` });
  })
);
