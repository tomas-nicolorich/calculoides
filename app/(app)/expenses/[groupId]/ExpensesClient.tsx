"use client";

import { useState, type SyntheticEvent } from "react";
import type { ExpensesList } from "shared/src/types/redesign";
import {
  useExpensesList,
  useCreateExpense,
  useDeleteExpense,
  useDeleteAllExpenses,
} from "../../../_data/expenses";

/** Extracted from {@link ExpensesClient} to keep its own cognitive complexity low. */
function ExpensesListView({
  expenses,
  isLoading,
  onDelete,
}: {
  expenses: ExpensesList["expenses"];
  isLoading: boolean;
  onDelete: (expenseId: string) => void;
}) {
  if (isLoading) return <p data-testid="expenses-loading">Loading…</p>;
  if (expenses.length === 0) {
    return (
      <p className="text-slate-500">No expenses logged yet for this group.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="expenses-list">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-4"
        >
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {expense.description}
            </p>
            <p className="text-sm text-slate-500">
              {expense.categoryName} · {expense.payerName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono tabular-nums text-sm text-slate-900 dark:text-white">
              {expense.amount}
            </span>
            <button
              type="button"
              onClick={() => {
                onDelete(expense.id);
              }}
              className="text-sm text-red-600"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Lean Next-app port of `frontend/src/pages/expenses/ui/ExpensesPage.tsx`
 * (4b.6) — plain Tailwind, create/delete/delete-all wired through
 * `lib/actions/expense.ts` Server Actions with group-scoped cache
 * invalidation (4b.7), same "lean, not a full port" precedent as
 * `GroupsClient`/`MembersClient` (3b.8). Full filter/pagination/edit UI is
 * out of this phase's scope.
 */
export function ExpensesClient({ groupId }: { groupId: string }) {
  const { data, isLoading } = useExpensesList(groupId);
  const createExpense = useCreateExpense(groupId);
  const removeExpense = useDeleteExpense(groupId);
  const removeAll = useDeleteAllExpenses(groupId);

  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: SyntheticEvent) => {
    event.preventDefault();
    setError(null);

    const result = await createExpense.mutateAsync({
      categoryId,
      description,
      amount: Number(amount),
      date,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCategoryId("");
    setDescription("");
    setAmount("");
    setDate("");
  };

  const expenses = data?.expenses ?? [];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Expenses
        </h1>
        <button
          type="button"
          disabled={expenses.length === 0 || removeAll.isPending}
          onClick={() => {
            void removeAll.mutateAsync({ groupId });
          }}
          className="h-10 px-4 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-60"
        >
          Delete All
        </button>
      </header>

      <form
        onSubmit={(event) => {
          void handleCreate(event);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <input
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
          }}
          placeholder="Category ID"
          className="h-10 rounded-md border border-slate-300 dark:border-slate-700 px-3"
        />
        <input
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
          placeholder="Description"
          className="h-10 flex-1 min-w-40 rounded-md border border-slate-300 dark:border-slate-700 px-3"
        />
        <input
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
          }}
          placeholder="Amount"
          type="number"
          className="h-10 w-28 rounded-md border border-slate-300 dark:border-slate-700 px-3"
        />
        <input
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
          }}
          placeholder="YYYY-MM-DD"
          className="h-10 rounded-md border border-slate-300 dark:border-slate-700 px-3"
        />
        <button
          type="submit"
          disabled={createExpense.isPending}
          className="h-10 px-4 rounded-md bg-brand-balance text-white font-medium disabled:opacity-60"
        >
          {createExpense.isPending ? "Adding..." : "Add"}
        </button>
        {error && <p className="text-sm text-red-600 w-full">{error}</p>}
      </form>

      <ExpensesListView
        expenses={expenses}
        isLoading={isLoading}
        onDelete={(expenseId) => {
          void removeExpense.mutateAsync({ expenseId });
        }}
      />
    </div>
  );
}
