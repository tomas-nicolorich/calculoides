import { withAuth, withErrorHandling } from './src/middleware/handler';
import { ExpenseService } from './src/services/expense';
import { CreateExpenseSchema, IdSchema } from '../shared/validation';

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const validatedBody = CreateExpenseSchema.parse(req.body);
      
      // Need to find the memberId for the current user in this group
      // This logic should probably be in a helper or service
      // For now, assume payerId is provided or we fetch it
      const expense = await ExpenseService.logExpense(
        validatedBody.categoryId,
        validatedBody.payerId || req.user.id, // Fallback to userId if memberId not provided (needs fix in service logic later)
        validatedBody.description,
        validatedBody.amount,
        validatedBody.date ? new Date(validatedBody.date) : new Date()
      );
      return res.status(201).json(expense);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const validatedId = IdSchema.parse(id);
      await ExpenseService.deleteExpense(validatedId);
      return res.status(204).end();
    }

    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  })
);
