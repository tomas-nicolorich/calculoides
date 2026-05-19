import { withAuth, withErrorHandling } from './src/middleware/handler';
import { ExpenseService } from './src/services/expense';
import { CreateExpenseSchema, IdSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'GET') {
      const { groupId, categoryId, limit = '20', offset = '0' } = req.query;

      if (!groupId || typeof groupId !== 'string') {
        res.status(400).json({ error: 'Missing groupId' }); return;
      }

      const parsedLimit = parseInt(limit as string, 10);
      const parsedOffset = parseInt(offset as string, 10);

      const { expenses, total } = await ExpenseService.listExpenses(
        groupId,
        categoryId as string | undefined,
        parsedLimit,
        parsedOffset
      );

      res.status(200).json({
        expenses,
        pagination: {
          total,
          limit: parsedLimit,
          offset: parsedOffset
        }
      });
      return;
    }

    if (req.method === 'POST') {
      const validatedBody = CreateExpenseSchema.parse(req.body);

      const expense = await ExpenseService.logExpense(
        validatedBody.categoryId,
        validatedBody.payerId ?? req.user.id,
        validatedBody.description,
        validatedBody.amount,
        validatedBody.date
      );
      res.status(201).json(expense);
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const validatedId = IdSchema.parse(id);
      await ExpenseService.deleteExpense(validatedId);
      res.status(204).end();
      return;
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({ error: `Method ${String(req.method)} Not Allowed` });
    })
    );
