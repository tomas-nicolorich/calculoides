import { z } from 'zod';

// Base ID Schema
export const IdSchema = z.string().uuid();

// User
export const UserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  name: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Group
export const GroupSchema = z.object({
  id: IdSchema,
  name: z.string().min(1, 'Group name is required'),
  ownerId: IdSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateGroupSchema = GroupSchema.pick({ name: true });

// Group Member
export const GroupMemberSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  groupId: IdSchema,
  income: z.number().nonnegative(),
  joinedAt: z.date(),
});

// Category
export const CategorySchema = z.object({
  id: IdSchema,
  groupId: IdSchema,
  name: z.string().min(1, 'Category name is required'),
  icon: z.string().nullable().optional(),
  monthlyBudget: z.number().nonnegative('Budget must be positive'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCategorySchema = CategorySchema.pick({
  name: true,
  icon: true,
  monthlyBudget: true,
});

// Expense
export const ExpenseSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema,
  payerId: IdSchema,
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  date: z.date(),
  isArchived: z.boolean().default(false),
  createdAt: z.date(),
});

export const CreateExpenseSchema = ExpenseSchema.pick({
  categoryId: true,
  description: true,
  amount: true,
  date: true,
}).extend({
  payerId: IdSchema.optional(), // Default to current user if not provided
});

// Savings Goal
export const SavingsGoalSchema = z.object({
  id: IdSchema,
  groupId: IdSchema,
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.coerce.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateSavingsGoalSchema = SavingsGoalSchema.pick({
  name: true,
  targetAmount: true,
  targetDate: true,
});

export const UpsertContributionSchema = z.object({
  amount: z.number().nonnegative(),
});

// Invitation
export const InvitationSchema = z.object({
  id: IdSchema,
  groupId: IdSchema,
  email: z.string().email(),
  status: z.enum(['pending', 'accepted', 'declined']),
  inviterId: IdSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
});

// Transfer
export const TransferSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema,
  fromMemberId: IdSchema,
  toMemberId: IdSchema,
  amount: z.number().positive(),
  date: z.date(),
});
