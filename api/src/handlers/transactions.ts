import { dispatch, RouteConfig } from "../utils/dispatcher";
import { ExpenseService } from "../services/expense";
import { TransferService } from "../services/transfer";
import { BudgetService } from "../services/budget";
import { SavingsService } from "../services/savings";
import { GroupService } from "../services/group";
import {
  withAuth,
  withErrorHandling,
  AuthenticatedRequest,
  ApiResponse,
} from "../middleware/handler";
import {
  CreateExpenseSchema,
  IdSchema,
  CreateCategorySchema,
  CreateSavingsGoalSchema,
  UpsertContributionSchema,
} from "../../../shared/validation";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import {
  calculateIncomeShares,
  calculateCategoryBalances,
} from "../services/calculation";
import { Request, Response } from "express";

const CreateTransferSchema = z.object({
  categoryId: IdSchema,
  fromMemberId: IdSchema,
  toMemberId: IdSchema,
  amount: z.number().positive(),
});

const routes: RouteConfig = {
  // Expenses
  "expenses-list": async (req: Request, res: Response) => {
    const { groupId, categoryId, limit = "20", offset = "0" } = req.query;
    if (!groupId || typeof groupId !== "string") {
      (res as unknown as ApiResponse)
        .status(400)
        .json({ error: "Missing groupId" });
      return;
    }
    const parsedLimit = parseInt(limit as string, 10);
    const parsedOffset = parseInt(offset as string, 10);
    const { expenses, total } = await ExpenseService.listExpenses(
      groupId,
      categoryId as string | undefined,
      parsedLimit,
      parsedOffset,
    );
    (res as unknown as ApiResponse).status(200).json({
      expenses,
      pagination: { total, limit: parsedLimit, offset: parsedOffset },
    });
  },
  "expense-create": async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const validatedBody = CreateExpenseSchema.parse(req.body);
    const expense = await ExpenseService.logExpense(
      validatedBody.categoryId,
      validatedBody.payerId ?? authReq.user.id,
      validatedBody.description,
      validatedBody.amount,
      validatedBody.date,
    );
    (res as unknown as ApiResponse).status(201).json(expense);
  },
  "expense-delete": async (req: Request, res: Response) => {
    const { id } = req.query;
    const validatedId = IdSchema.parse(id);
    await ExpenseService.deleteExpense(validatedId);
    (res as unknown as ApiResponse).status(204).end();
  },

  // Transfers
  "transfer-create": async (req: Request, res: Response) => {
    const validatedBody = CreateTransferSchema.parse(req.body);
    const transfer = await TransferService.createTransfer(
      validatedBody.categoryId,
      validatedBody.fromMemberId,
      validatedBody.toMemberId,
      validatedBody.amount,
    );
    (res as unknown as ApiResponse).status(201).json(transfer);
  },
  "transfers-by-category": async (req: Request, res: Response) => {
    const { categoryId } = req.query;
    const validatedCategoryId = IdSchema.parse(categoryId);
    const transfers =
      await TransferService.getTransfersForCategory(validatedCategoryId);
    (res as unknown as ApiResponse).status(200).json(transfers);
  },

  // Categories
  "category-create": async (req: Request, res: Response) => {
    const { groupId } = req.query;
    const validatedGroupId = IdSchema.parse(groupId);
    const validatedBody = CreateCategorySchema.parse(req.body);
    const category = await BudgetService.createCategory(
      validatedGroupId,
      validatedBody.name,
      validatedBody.monthlyBudget,
      validatedBody.icon ?? undefined,
      validatedBody.memberIds,
    );
    (res as unknown as ApiResponse).status(201).json(category);
  },
  "categories-list": async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { groupId } = req.query;
    const validatedGroupId = IdSchema.parse(groupId);
    const groups = await GroupService.getGroupsForUser(authReq.user.id);
    const group = groups.find((g) => g.id === validatedGroupId);
    if (!group) {
      (res as unknown as ApiResponse)
        .status(403)
        .json({ error: "Access denied to this group" });
      return;
    }
    const categories =
      await BudgetService.listCategoriesWithBalances(validatedGroupId);
    (res as unknown as ApiResponse).status(200).json(categories);
  },
  "category-delete": async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { id } = req.query;
    const validatedId = IdSchema.parse(id);
    const category = await prisma.category.findUnique({
      where: { id: validatedId },
    });
    if (!category) {
      (res as unknown as ApiResponse)
        .status(404)
        .json({ error: "Category not found" });
      return;
    }
    const isOwner = await GroupService.isOwner(
      category.groupId,
      authReq.user.id,
    );
    if (!isOwner) {
      (res as unknown as ApiResponse)
        .status(403)
        .json({ error: "Only group owners can delete categories" });
      return;
    }
    await prisma.category.delete({ where: { id: validatedId } });
    (res as unknown as ApiResponse).status(204).end();
  },

  // Savings
  "savings-goal-create": async (req: Request, res: Response) => {
    const { groupId } = req.query;
    const validatedGroupId = IdSchema.parse(groupId);
    const validatedBody = CreateSavingsGoalSchema.parse(req.body);
    const goal = await SavingsService.createGoal(
      validatedGroupId,
      validatedBody.name,
      validatedBody.targetAmount,
      validatedBody.targetDate,
      validatedBody.startingAmount,
    );
    (res as unknown as ApiResponse).status(201).json(goal);
  },
  "savings-contribution-upsert": async (req: Request, res: Response) => {
    const { goalId, memberId } = req.query;
    const validatedGoalId = IdSchema.parse(goalId);
    const validatedMemberId = IdSchema.parse(memberId);
    const validatedBody = UpsertContributionSchema.parse(req.body);
    const contribution = await SavingsService.upsertContribution(
      validatedGoalId,
      validatedMemberId,
      validatedBody.amount,
    );
    (res as unknown as ApiResponse).status(200).json(contribution);
  },
  "savings-goals-list": async (req: Request, res: Response) => {
    const { groupId } = req.query;
    const validatedGroupId = IdSchema.parse(groupId);
    const goals = await SavingsService.getGoalsForGroup(validatedGroupId);
    (res as unknown as ApiResponse).status(200).json(goals);
  },

  // Summary
  summary: async (req: Request, res: Response) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { groupId } = req.query;

    if (!groupId || typeof groupId !== "string") {
      (res as unknown as ApiResponse)
        .status(400)
        .json({ error: "Missing groupId" });
      return;
    }

    // 1. Get Group and Members
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!group) {
      (res as unknown as ApiResponse)
        .status(404)
        .json({ error: "Group not found" });
      return;
    }

    // Verify user is in group
    const isMember = group.members.some((m) => m.userId === authReq.user.id);
    if (!isMember && group.ownerId !== authReq.user.id) {
      (res as unknown as ApiResponse).status(403).json({ error: "Forbidden" });
      return;
    }

    // 2. Get Categories, Expenses, and Transfers
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const categories = await prisma.category.findMany({
      where: { groupId },
      include: {
        memberLinks: { select: { memberId: true } },
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
        date: { gte: startOfMonth },
        isArchived: false,
      },
    });

    const transfers = await prisma.transfer.findMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
        date: { gte: startOfMonth },
      },
    });

    // 3. Perform Calculations
    const memberIncomes = group.members.map((m) => ({
      id: m.id,
      income: Number(m.income),
    }));

    const shares = calculateIncomeShares(memberIncomes);

    const totalIncome = memberIncomes.reduce((acc, m) => acc + m.income, 0);
    const totalBudget = categories.reduce(
      (acc, c) => acc + Number(c.monthlyBudget),
      0,
    );
    const totalSpent = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

    const membersSummary = group.members.map((m) => {
      const share = shares.find((s) => s.id === m.id);

      const memberExpensesTotal = expenses
        .filter((e) => e.payerId === m.id)
        .reduce((acc, e) => acc + Number(e.amount), 0);

      // Calculate remaining quota across all categories
      let totalRemainingQuota = 0;
      categories.forEach((cat) => {
        // Filter members if category is restricted
        const isRestricted = cat.memberLinks.length > 0;
        if (
          isRestricted &&
          !cat.memberLinks.some((ml) => ml.memberId === m.id)
        ) {
          return; // Member is not part of this category's budget
        }

        const catExpenses = expenses.filter((e) => e.categoryId === cat.id);
        const catTransfers = transfers.filter((t) => t.categoryId === cat.id);

        const relevantShares = isRestricted
          ? shares.filter((s) =>
              cat.memberLinks.some((ml) => ml.memberId === s.id),
            )
          : shares;

        const balances = calculateCategoryBalances(
          { monthlyBudget: Number(cat.monthlyBudget) },
          relevantShares,
          catExpenses.map((e) => ({
            payerId: e.payerId,
            amount: Number(e.amount),
          })),
          catTransfers.map((t) => ({
            fromMemberId: t.fromMemberId,
            toMemberId: t.toMemberId,
            amount: Number(t.amount),
          })),
        );

        const memberBalance = balances.find((b) => b.memberId === m.id);
        if (memberBalance) {
          totalRemainingQuota += memberBalance.remainingQuota;
        }
      });

      return {
        id: m.id,
        name: m.user.name ?? m.user.email,
        income: Number(m.income),
        share: share?.percentage ?? 0,
        spent: memberExpensesTotal,
        remainingQuota: totalRemainingQuota,
      };
    });

    const recentExpenses = expenses
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        categoryName:
          categories.find((c) => c.id === e.categoryId)?.name ?? "Unknown",
        payerName:
          group.members.find((m) => m.id === e.payerId)?.user.name ?? "Unknown",
      }));

    (res as unknown as ApiResponse).status(200).json({
      groupName: group.name,
      totalIncome,
      totalBudget,
      totalSpent,
      members: membersSummary,
      recentExpenses,
    });
  },
};

export default withErrorHandling(
  withAuth(async (req, res) => {
    return dispatch(
      req as unknown as Request,
      res as unknown as Response,
      routes,
      "summary",
    );
  }),
);
