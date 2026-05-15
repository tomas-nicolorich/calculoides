import { withAuth, withErrorHandling } from './src/middleware/handler';
import { ExpenseService } from './src/services/expense';
import { CreateExpenseSchema, IdSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const validatedBody = CreateExpenseSchema.parse(req.body);
      
      const expense = await ExpenseService.logExpense(
        validatedBody.categoryId,
        validatedBody.payerId || req.user.id,
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

    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
