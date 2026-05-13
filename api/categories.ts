import { withAuth, withErrorHandling } from './src/middleware/handler';
import { BudgetService } from './src/services/budget';
import { GroupService } from './src/services/group';
import { CreateCategorySchema, IdSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    const { groupId } = req.query;
    const validatedGroupId = IdSchema.parse(groupId);

    if (req.method === 'POST') {
      const validatedBody = CreateCategorySchema.parse(req.body);
      const category = await BudgetService.createCategory(
        validatedGroupId,
        validatedBody.name,
        validatedBody.monthlyBudget,
        validatedBody.icon || undefined
      );
      return res.status(201).json(category);
    }

    if (req.method === 'GET') {
      // For listing, we need member shares to calculate balances
      const groups = await GroupService.getGroupsForUser(req.user.id);
      const group = groups.find((g) => g.id === validatedGroupId);

      if (!group) {
        return res.status(403).json({ error: 'Access denied to this group' });
      }

      // TODO: Get actual shares. For now, we list categories.
      // In a real flow, we'd fetch members and calculate shares first.
      const categories = await prisma.categories.findMany({
        where: { groupId: validatedGroupId },
      });
      return res.status(200).json(categories);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
