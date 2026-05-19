import { withAuth, withErrorHandling } from './src/middleware/handler';
import { BudgetService } from './src/services/budget';
import { GroupService } from './src/services/group';
import { CreateCategorySchema, IdSchema } from '../shared/validation';
import { prisma } from './src/utils/prisma';

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
        validatedBody.icon ?? undefined,
        validatedBody.memberIds
        );
        res.status(201).json(category); return;
        }

        if (req.method === 'GET') {
        // For listing, we need member shares to calculate balances
        // Verify group visibility before listing
        const groups = await GroupService.getGroupsForUser(req.user.id);
        const group = groups.find((g) => g.id === validatedGroupId);

        if (!group) {
        res.status(403).json({ error: 'Access denied to this group' }); return;
        }

        const categories = await BudgetService.listCategoriesWithBalances(validatedGroupId);
        res.status(200).json(categories); return;
        }

        if (req.method === 'DELETE') {
        const { id } = req.query;
        const validatedId = IdSchema.parse(id);

        const category = await prisma.category.findUnique({
        where: { id: validatedId },
        });

        if (!category) {
        res.status(404).json({ error: 'Category not found' }); return;
        }

        // Verify group ownership before deletion
        const isOwner = await GroupService.isOwner(category.groupId, req.user.id);

        if (!isOwner) {
        res.status(403).json({ error: 'Only group owners can delete categories' }); return;
        }

        await prisma.category.delete({
        where: { id: validatedId },
        });

        return res.status(204).end();
        }

        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).json({ error: `Method ${String(req.method)} Not Allowed` });
        })
        );
