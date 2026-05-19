import { withAuth, withErrorHandling } from './src/middleware/handler';
import { TransferService } from './src/services/transfer';
import { IdSchema } from '../shared/validation';
import { z } from 'zod';

const CreateTransferSchema = z.object({
  categoryId: IdSchema,
  fromMemberId: IdSchema,
  toMemberId: IdSchema,
  amount: z.number().positive(),
});

export default withErrorHandling(
  withAuth(async (req, res) => {
    if (req.method === 'POST') {
      const validatedBody = CreateTransferSchema.parse(req.body);
      const transfer = await TransferService.createTransfer(
        validatedBody.categoryId,
        validatedBody.fromMemberId,
        validatedBody.toMemberId,
        validatedBody.amount
      );
      res.status(201).json(transfer); return;
    }

    if (req.method === 'GET') {
      const { categoryId } = req.query;
      const validatedCategoryId = IdSchema.parse(categoryId);
      const transfers = await TransferService.getTransfersForCategory(validatedCategoryId);
      res.status(200).json(transfers); return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method ?? ''} Not Allowed` });
  })
);
