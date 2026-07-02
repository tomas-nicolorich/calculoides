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
  ApiRequest,
  ApiResponse,
} from "../middleware/handler";
import {
  CreateExpenseSchema,
  IdSchema,
  CreateCategorySchema,
  CreateSavingsGoalSchema,
  UpsertContributionSchema,
} from "shared";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import {
  calculateIncomeShares,
  calculateCategoryBalances,
} from "../services/calculation";

function requireStringParam(
  value: unknown,
  name: string,
  res: ApiResponse,
): value is string {
  if (!value || typeof value !== "string") {
    res.status(400).json({ error: `Missing ${name}` });
    return false;
  }
  return true;
}

function parsePagination(query: Record<string, unknown>) {
  const { limit = "20", offset = "0" } = query;
  return {
    parsedLimit: parseInt(limit as string, 10),
    parsedOffset: parseInt(offset as string, 10),
  };
}

const CreateTransferSchema = z.object({
  categoryId: IdSchema,
  fromMemberId: IdSchema,
  toMemberId: IdSchema,
  amount: z.number().positive(),
});

const UpdateExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string(),
  categoryId: IdSchema,
  payerId: IdSchema,
});

interface ExpenseListItem {
  id: string;
  categoryId: string;
  payerId: string;
  description: string;
  amount: { toString(): string } | number | string;
  date: Date;
  category: { name: string; icon: string | null };
  payer: { user: { name: string | null; email: string } };
}

export const routes: RouteConfig = {
  // Expenses
  "expenses-list": async (req: ApiRequest, res: ApiResponse) => {
    const { groupId, categoryId, memberId, from, to } = req.query;
    if (!requireStringParam(groupId, "groupId", res)) return;
    const { parsedLimit, parsedOffset } = parsePagination(req.query);
    const { expenses, total } = await ExpenseService.listExpenses(
      groupId,
      categoryId as string | undefined,
      memberId as string | undefined,
      parsedLimit,
      parsedOffset,
      from as string | undefined,
      to as string | undefined,
    );

    const mappedExpenses = (expenses as unknown as ExpenseListItem[]).map(
      (e) => ({
        id: e.id,
        categoryId: e.categoryId,
        payerId: e.payerId,
        description: e.description,
        amount: Number(e.amount.toString()),
        date: e.date,
        categoryName: e.category.name,
        categoryIcon: e.category.icon ?? "",
        payerName: e.payer.user.name ?? e.payer.user.email,
      }),
    );

    res.status(200).json({
      expenses: mappedExpenses,
      pagination: { total, limit: parsedLimit, offset: parsedOffset },
    });
  },
  "expense-create": async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const validatedBody = CreateExpenseSchema.parse(req.body);
    const expense = await ExpenseService.logExpense(
      validatedBody.categoryId,
      validatedBody.payerId ?? authReq.user.id,
      validatedBody.description,
      validatedBody.amount,
      validatedBody.date,
    );
    res.status(201).json(expense);
  },
  "expense-update": async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as AuthenticatedRequest;
    const id =
      req.query.id ??
      (req as ApiRequest & { params?: Record<string, string> }).params?.id;
    const validatedId = IdSchema.parse(id);
    const validatedBody = UpdateExpenseSchema.parse(req.body);
    try {
      const updated = await ExpenseService.updateExpense(
        validatedId,
        validatedBody,
        authReq.user.id,
      );
      res.status(200).json(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "Expense not found") {
        res.status(404).json({ error: msg });
      } else if (msg === "Not a member of this group") {
        res.status(403).json({ error: msg });
      } else {
        throw err;
      }
    }
  },
  "expense-delete": async (req: ApiRequest, res: ApiResponse) => {
    const id =
      req.query.id ??
      (req as ApiRequest & { params?: Record<string, string> }).params?.id;
    const validatedId = IdSchema.parse(id);
    await ExpenseService.deleteExpense(validatedId);
    res.status(204).end();
  },

  // Transfers
  "transfer-create": async (req: ApiRequest, res: ApiResponse) => {
    const validatedBody = CreateTransferSchema.parse(req.body);
    const transfer = await TransferService.createTransfer(
      validatedBody.categoryId,
      validatedBody.fromMemberId,
      validatedBody.toMemberId,
      validatedBody.amount,
    );
    res.status(201).json(transfer);
  },
  "transfers-by-category": async (req: ApiRequest, res: ApiResponse) => {
    const { categoryId } = req.query;
    const validatedCategoryId = IdSchema.parse(categoryId);
    const transfers =
      await TransferService.getTransfersForCategory(validatedCategoryId);
    res.status(200).json(transfers);
  },
  "transfers-list": async (req: ApiRequest, res: ApiResponse) => {
    const { groupId, categoryId, memberId } = req.query;
    if (!requireStringParam(groupId, "groupId", res)) return;
    const { parsedLimit, parsedOffset } = parsePagination(req.query);
    const { transfers, total } = await TransferService.listTransfers(
      groupId,
      categoryId as string | undefined,
      memberId as string | undefined,
      parsedLimit,
      parsedOffset,
    );
    res.status(200).json({
      transfers,
      pagination: { total, limit: parsedLimit, offset: parsedOffset },
    });
  },

  // Categories
  "category-create": async (req: ApiRequest, res: ApiResponse) => {
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
    res.status(201).json(category);
  },
  "category-update": async (req: ApiRequest, res: ApiResponse) => {
    const { id } = req.query;
    const validatedId = IdSchema.parse(id);
    const validatedBody = CreateCategorySchema.parse(req.body);
    const category = await BudgetService.updateCategory(
      validatedId,
      validatedBody.name,
      validatedBody.monthlyBudget,
      validatedBody.icon ?? undefined,
      validatedBody.memberIds,
    );
    res.status(200).json(category);
  },
  "categories-list": async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { groupId } = req.query;
    const validatedGroupId = IdSchema.parse(groupId);
    const groups = await GroupService.getGroupsForUser(authReq.user.id);
    const group = groups.find((g) => g.id === validatedGroupId);
    if (!group) {
      res.status(403).json({ error: "Access denied to this group" });
      return;
    }
    const categories =
      await BudgetService.listCategoriesWithBalances(validatedGroupId);
    res.status(200).json(categories);
  },
  "category-delete": async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { id } = req.query;
    const validatedId = IdSchema.parse(id);
    const category = await prisma.category.findUnique({
      where: { id: validatedId },
    });
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    const isOwner = await GroupService.isOwner(
      category.groupId,
      authReq.user.id,
    );
    if (!isOwner) {
      res
        .status(403)
        .json({ error: "Only group owners can delete categories" });
      return;
    }
    await prisma.category.delete({ where: { id: validatedId } });
    res.status(204).end();
  },

  // Savings
  "savings-goal-create": async (req: ApiRequest, res: ApiResponse) => {
    const { groupId } = req.query;
    if (!requireStringParam(groupId, "groupId", res)) return;
    const validatedGroupId = IdSchema.parse(groupId);
    const validatedBody = CreateSavingsGoalSchema.parse(req.body);
    const goal = await SavingsService.createGoal(
      validatedGroupId,
      validatedBody.name,
      validatedBody.targetAmount,
      validatedBody.targetDate,
      validatedBody.currentAmount,
    );
    res.status(201).json(goal);
  },
  "savings-goal-update": async (req: ApiRequest, res: ApiResponse) => {
    const { goalId } = req.query;
    if (!requireStringParam(goalId, "goalId", res)) return;
    const validatedGoalId = IdSchema.parse(goalId);
    const validatedBody = CreateSavingsGoalSchema.parse(req.body);
    const goal = await SavingsService.updateGoal(
      validatedGoalId,
      validatedBody.name,
      validatedBody.targetAmount,
      validatedBody.targetDate,
      validatedBody.currentAmount,
    );
    res.status(200).json(goal);
  },
  "savings-goal-delete": async (req: ApiRequest, res: ApiResponse) => {
    const { goalId } = req.query;
    if (!requireStringParam(goalId, "goalId", res)) return;
    const validatedGoalId = IdSchema.parse(goalId);
    await SavingsService.deleteGoal(validatedGoalId);
    res.status(204).end();
  },
  "savings-contribution-upsert": async (req: ApiRequest, res: ApiResponse) => {
    const { goalId, memberId } = req.query;
    if (
      !goalId ||
      typeof goalId !== "string" ||
      !memberId ||
      typeof memberId !== "string"
    ) {
      res.status(400).json({ error: "Missing goalId or memberId" });
      return;
    }
    const validatedGoalId = IdSchema.parse(goalId);
    const validatedMemberId = IdSchema.parse(memberId);
    const validatedBody = UpsertContributionSchema.parse(req.body);
    const contribution = await SavingsService.upsertContribution(
      validatedGoalId,
      validatedMemberId,
      validatedBody.amount,
    );
    res.status(200).json(contribution);
  },
  "savings-goals-list": async (req: ApiRequest, res: ApiResponse) => {
    const { groupId } = req.query;
    if (!requireStringParam(groupId, "groupId", res)) return;
    const validatedGroupId = IdSchema.parse(groupId);
    const goals = await SavingsService.getGoalsForGroup(validatedGroupId);
    res.status(200).json(goals);
  },

  // Summary
  summary: async (req: ApiRequest, res: ApiResponse) => {
    const authReq = req as unknown as AuthenticatedRequest;
    const { groupId } = req.query;

    if (!groupId || typeof groupId !== "string") {
      res.status(400).json({ error: "Missing groupId" });
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
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Verify user is in group
    const isMember = group.members.some((m) => m.userId === authReq.user.id);
    if (!isMember && group.ownerId !== authReq.user.id) {
      res.status(403).json({ error: "Forbidden" });
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
      include: {
        fromMember: { select: { memberId: true } },
        toMember: { select: { memberId: true } },
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
      let totalBudgetedQuota = 0;
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

        const relevantMembers = isRestricted
          ? memberIncomes.filter((mi) =>
              cat.memberLinks.some((ml) => ml.memberId === mi.id),
            )
          : memberIncomes;

        const balances = calculateCategoryBalances(
          { monthlyBudget: Number(cat.monthlyBudget) },
          relevantMembers,
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
          totalBudgetedQuota += memberBalance.totalQuota;
        }
      });

      return {
        id: m.id,
        userId: m.userId,
        name: m.user.name ?? m.user.email,
        income: Number(m.income),
        share: share?.percentage ?? 0,
        spent: memberExpensesTotal,
        remainingQuota: totalRemainingQuota,
        budgeted: Number(totalBudgetedQuota.toFixed(2)),
      };
    });

    const recentExpensesRaw = await prisma.expense.findMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
        isArchived: false,
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    const recentExpenses = recentExpensesRaw.map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      date: e.date,
      categoryName:
        categories.find((c) => c.id === e.categoryId)?.name ?? "Unknown",
      categoryId: e.categoryId,
      payerName:
        group.members.find((m) => m.id === e.payerId)?.user.name ?? "Unknown",
      payerId: e.payerId,
    }));

    const recentTransfersRaw = await prisma.transfer.findMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
      },
      include: {
        fromMember: { select: { memberId: true } },
        toMember: { select: { memberId: true } },
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    const recentTransfers = recentTransfersRaw.map((t) => ({
      id: t.id,
      categoryName:
        categories.find((c) => c.id === t.categoryId)?.name ?? "Unknown",
      fromMemberName:
        group.members.find((m) => m.id === t.fromMember.memberId)?.user.name ??
        "Unknown",
      fromMemberId: t.fromMember.memberId,
      toMemberName:
        group.members.find((m) => m.id === t.toMember.memberId)?.user.name ??
        "Unknown",
      toMemberId: t.toMember.memberId,
      amount: Number(t.amount),
      date: t.date,
    }));

    res.status(200).json({
      groupName: group.name,
      ownerId: group.ownerId,
      totalIncome,
      totalBudget,
      totalSpent,
      members: membersSummary,
      recentExpenses,
      recentTransfers,
    });
  },
};

routes.expenses = async (req: ApiRequest, res: ApiResponse) => {
  const actionKey = req.method === "POST" ? "expense-create" : "expenses-list";
  const handler = routes[actionKey];
  if (handler) return handler(req, res);
  res.status(405).json({ error: "Method not allowed" });
};

routes.transaction = async (req: ApiRequest, res: ApiResponse) => {
  const method = req.method;
  let actionKey = "";
  if (method === "PUT") {
    actionKey = "expense-update";
  } else if (method === "DELETE") {
    actionKey = "expense-delete";
  }
  const handler = routes[actionKey];
  if (handler) return handler(req, res);
  res.status(405).json({ error: "Method not allowed" });
};

routes.savings = async (req: ApiRequest, res: ApiResponse) => {
  const method = req.method;
  let actionKey = "";

  if (method === "GET") {
    actionKey = "savings-goals-list";
  } else if (method === "POST") {
    actionKey = "savings-goal-create";
  } else if (method === "PATCH") {
    actionKey = "savings-goal-update";
  } else if (method === "DELETE") {
    actionKey = "savings-goal-delete";
  }

  const handler = routes[actionKey];
  if (handler) {
    return handler(req, res);
  }

  res.status(405).json({ error: "Method not allowed" });
};

export const transactionsHandler = withErrorHandling(
  withAuth(async (req, res) => {
    return dispatch(req, res, routes, "summary");
  }),
);

export default transactionsHandler;
