import { withAuth, withErrorHandling } from './src/middleware/handler';
import { prisma } from './src/utils/prisma';
import { calculateIncomeShares, calculateCategoryBalances } from './src/services/calculation';

export default withErrorHandling(
  withAuth(async (req, res, user) => {
    const { groupId } = req.query;

    if (!groupId || typeof groupId !== 'string') {
      res.status(400).json({ error: 'Missing groupId' }); return;
    }

    // 1. Get Group and Members
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' }); return;
    }

    // Verify user is in group
    const isMember = group.members.some(m => m.userId === user.id);
    if (!isMember && group.ownerId !== user.id) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    // 2. Get Categories, Expenses, and Transfers
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const categories = await prisma.category.findMany({
      where: { groupId },
      include: {
        memberLinks: { select: { memberId: true } }
      }
    });

    const expenses = await prisma.expense.findMany({
      where: {
        categoryId: { in: categories.map(c => c.id) },
        date: { gte: startOfMonth },
        isArchived: false
      }
    });

    const transfers = await prisma.transfer.findMany({
      where: {
        categoryId: { in: categories.map(c => c.id) },
        date: { gte: startOfMonth }
      }
    });

    // 3. Perform Calculations
    const memberIncomes = group.members.map(m => ({
      id: m.id,
      income: Number(m.income)
    }));

    const shares = calculateIncomeShares(memberIncomes);
    
    const totalIncome = memberIncomes.reduce((acc, m) => acc + m.income, 0);
    const totalBudget = categories.reduce((acc, c) => acc + Number(c.monthlyBudget), 0);
    const totalSpent = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

    const membersSummary = group.members.map(m => {
      const share = shares.find(s => s.id === m.id);
      
      const memberExpensesTotal = expenses
        .filter(e => e.payerId === m.id)
        .reduce((acc, e) => acc + Number(e.amount), 0);

      // Calculate remaining quota across all categories
      let totalRemainingQuota = 0;
      categories.forEach(cat => {
        // Filter members if category is restricted
        const isRestricted = cat.memberLinks.length > 0;
        if (isRestricted && !cat.memberLinks.some(ml => ml.memberId === m.id)) {
          return; // Member is not part of this category's budget
        }

        const catExpenses = expenses.filter(e => e.categoryId === cat.id);
        const catTransfers = transfers.filter(t => t.categoryId === cat.id);
        
        const relevantShares = isRestricted
          ? shares.filter(s => cat.memberLinks.some(ml => ml.memberId === s.id))
          : shares;

        const balances = calculateCategoryBalances(
          { monthlyBudget: Number(cat.monthlyBudget) },
          relevantShares,
          catExpenses.map(e => ({ payerId: e.payerId, amount: Number(e.amount) })),
          catTransfers.map(t => ({ fromMemberId: t.fromMemberId, toMemberId: t.toMemberId, amount: Number(t.amount) }))
        );
        
        const memberBalance = balances.find(b => b.memberId === m.id);
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
        remainingQuota: totalRemainingQuota
      };
    });

    const recentExpenses = expenses
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        categoryName: categories.find(c => c.id === e.categoryId)?.name ?? 'Unknown',
        payerName: group.members.find(m => m.id === e.payerId)?.user.name ?? 'Unknown'
      }));

    res.status(200).json({
      groupName: group.name,
      totalIncome,
      totalBudget,
      totalSpent,
      members: membersSummary,
      recentExpenses
    });
  })
);
