import { useEffect, useState } from "react";
import { expenseApi, type Expense } from "../../entities/expense";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  UserDisplay,
} from "../../shared/ui";

interface CategoryExpenseListProps {
  groupId: string;
  categoryId: string;
  categoryName: string;
}

export function CategoryExpenseList({
  groupId,
  categoryId,
  categoryName,
}: CategoryExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await expenseApi.list(groupId, categoryId);
        if (!active) return;
        setExpenses(data.expenses);
      } catch (err) {
        console.error("Failed to fetch expenses", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [groupId, categoryId]);

  if (loading)
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Loading expenses...
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Expenses for {categoryName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{expense.description}</p>
                  <UserDisplay
                    user={expense.payer.user}
                    className="text-xs text-muted-foreground"
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">
                    -€{expense.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(expense.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No expenses recorded for this category.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
