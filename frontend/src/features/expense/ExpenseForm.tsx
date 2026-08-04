import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Select, DatePicker } from "../../shared/ui";
import { expenseApi } from "../../entities/expense";
import { queryKeys } from "../../shared/api/queryKeys";
import type { CategoryWithBalances } from "../../../../shared/src/types/redesign";

interface ExpenseFormProps {
  groupId: string;
  categories: CategoryWithBalances[];
  members: { id: string; name: string }[];
  defaultPayerId?: string;
  expense?: {
    id: string;
    description: string;
    amount: number;
    categoryId: string;
    payerId: string;
    date: string;
  };
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void;
}

// fallow-ignore-next-line complexity
export function ExpenseForm({
  groupId,
  categories,
  members,
  defaultPayerId,
  expense,
  onSuccess,
  onCancel,
  onDelete,
}: ExpenseFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const qc = useQueryClient();

  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(
    expense?.amount ? expense.amount.toString() : "",
  );
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "");
  const [date, setDate] = useState(
    expense?.date ? new Date(expense.date).toISOString().split("T")[0] : today,
  );
  const [payerId, setPayerId] = useState(
    expense?.payerId ?? defaultPayerId ?? "",
  );

  const invalidateGroup = () =>
    qc.invalidateQueries({ queryKey: queryKeys.group(groupId) });

  const logExpense = useMutation({
    mutationFn: (input: {
      categoryId: string;
      description: string;
      amount: number;
      date?: string;
      payerId?: string;
    }) => expenseApi.log(input),
    onSuccess: invalidateGroup,
  });
  const updateExpense = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        description: string;
        amount: number;
        date: string;
        categoryId: string;
        payerId: string;
      };
    }) => expenseApi.update(id, input),
    onSuccess: invalidateGroup,
  });

  const loading = logExpense.isPending || updateExpense.isPending;
  const mutationError = logExpense.error ?? updateExpense.error;
  const error = mutationError
    ? mutationError instanceof Error
      ? mutationError.message || "Failed to save expense"
      : String(mutationError)
    : null;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (expense) {
        await updateExpense.mutateAsync({
          id: expense.id,
          input: {
            description,
            amount: Number(amount),
            categoryId,
            date: new Date(date).toISOString(),
            payerId,
          },
        });
      } else {
        await logExpense.mutateAsync({
          description,
          amount: Number(amount),
          categoryId,
          date: new Date(date).toISOString(),
          ...(payerId ? { payerId } : {}),
        });
      }

      setDescription("");
      setAmount("");
      setCategoryId("");
      setDate(today);
      setPayerId(defaultPayerId ?? "");
      await onSuccess?.();
    } catch {
      // error derives from logExpense.error / updateExpense.error above.
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label htmlFor="expense-description" className="text-sm font-medium">
          Description
        </label>
        <Input
          id="expense-description"
          placeholder="e.g. Groceries, Electricity bill"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="expense-amount" className="text-sm font-medium">
            Amount (€)
          </label>
          <Input
            id="expense-amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
            }}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            id="expense-date-label"
            htmlFor="expense-date"
            className="text-sm font-medium"
          >
            Date
          </label>
          <DatePicker
            id="expense-date"
            labelId="expense-date-label"
            value={date}
            onChange={setDate}
            granularity="day"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          id="expense-category-label"
          htmlFor="expense-category"
          className="text-sm font-medium"
        >
          Category
        </label>
        <Select
          id="expense-category"
          labelId="expense-category-label"
          value={categoryId}
          onValueChange={setCategoryId}
          placeholder="Select category..."
          options={categories.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />
      </div>

      {members.length > 0 && (
        <div className="space-y-2">
          <label
            id="expense-payer-label"
            htmlFor="expense-payer"
            className="text-sm font-medium"
          >
            Paid By
          </label>
          <Select
            id="expense-payer"
            labelId="expense-payer-label"
            value={payerId}
            onValueChange={setPayerId}
            placeholder="Select member"
            options={members.map((m) => ({ value: m.id, label: m.name }))}
          />
        </div>
      )}

      {error && (
        <div className="text-xs font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 animate-in zoom-in-95">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2 justify-end">
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            className="text-brand-expense hover:text-red-700 hover:bg-brand-expense/5 mr-auto"
            onClick={onDelete}
            disabled={loading}
          >
            Delete
          </Button>
        )}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className={onDelete ? "" : "flex-1"}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="balance"
          className={onDelete ? "" : "flex-1"}
          disabled={loading || !categoryId}
        >
          {loading ? "Saving..." : expense ? "Save Changes" : "Log Expense"}
        </Button>
      </div>
    </form>
  );
}
