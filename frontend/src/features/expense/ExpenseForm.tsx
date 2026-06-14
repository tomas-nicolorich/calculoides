import { useState } from "react";
import { Button, Input, Select } from "../../shared/ui";
import { expenseApi } from "../../entities/expense";
import type { CategoryWithBalances } from "../../../../shared/src/types/redesign";

interface ExpenseFormProps {
  groupId: string;
  categories: CategoryWithBalances[];
  members: { id: string; name: string }[];
  defaultPayerId?: string;
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ExpenseForm({
  categories,
  members,
  defaultPayerId,
  onSuccess,
  onCancel,
}: ExpenseFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today);
  const [payerId, setPayerId] = useState(defaultPayerId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await expenseApi.log({
        description,
        amount: Number(amount),
        categoryId,
        date: new Date(date).toISOString(),
        ...(payerId ? { payerId } : {}),
      });

      setDescription("");
      setAmount("");
      setCategoryId("");
      setDate(today);
      setPayerId(defaultPayerId ?? "");
      await onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to log expense");
    } finally {
      setLoading(false);
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
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Description
        </label>
        <Input
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
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Amount (€)
          </label>
          <Input
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
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
            }}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Category
        </label>
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
          placeholder="Select category..."
          options={categories.map((c) => ({
            value: c.id,
            label: `${c.icon ?? ""} ${c.name}`.trim(),
          }))}
        />
      </div>

      {members.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Paid by
          </label>
          <Select
            value={payerId}
            onValueChange={setPayerId}
            placeholder="Select member"
            options={members.map((m) => ({ value: m.id, label: m.name }))}
          />
        </div>
      )}

      {error && (
        <div className="text-[10px] font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 animate-in zoom-in-95">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="expense"
          className="flex-1"
          disabled={loading || !categoryId}
        >
          {loading ? "Saving..." : "Log Expense"}
        </Button>
      </div>
    </form>
  );
}
