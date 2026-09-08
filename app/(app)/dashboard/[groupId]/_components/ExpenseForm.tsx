"use client";

import { useState } from "react";
import { Button, DatePicker, Input, Select } from "../../../../_ui";
import { useCreateExpense, useUpdateExpense } from "../../../../_data/expenses";
import type { CategoryWithBalances } from "shared/src/types/redesign";

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

/**
 * Ported from `main`'s `frontend/src/features/expense/ExpenseForm.tsx`
 * (PR 16). Pulls in `DatePicker` (PR 7) and `Select` (PR 6) as form fields,
 * per the design's own line-estimate rationale. `groupId`'s dashboard
 * placement wires this only as the quick-add trigger (16.8's
 * `QuickAddExpense`); the `expense`/`onDelete` edit path is ported for
 * parity with `main`'s real API but has no dashboard consumer yet.
 *
 * DEVIATION (documented): `create`/`update` return `ActionResult` and never
 * throw (unlike `main`'s `apiClient.fetch`-backed `expenseApi`), so this
 * form checks `result.ok` after `mutateAsync` instead of relying on a
 * thrown rejection — same adaptation `SavingsGoalForm`/`BudgetCategories`
 * already established for this repo's Server Action contract.
 */
interface ExpenseFormState {
  description: string;
  amount: string;
  categoryId: string;
  date: string;
  payerId: string;
}

/**
 * Pure shaping of the current form field values into the create/update
 * Server Action payload. Extracted out of `handleSubmit` so the
 * create-vs-update branching logic can be tested/read independently of the
 * mutation call itself.
 */
function buildExpensePayload(
  formState: ExpenseFormState,
  expense: ExpenseFormProps["expense"],
) {
  const { description, amount, categoryId, date, payerId } = formState;

  return expense
    ? {
        expenseId: expense.id,
        description,
        amount: Number(amount),
        categoryId,
        date: new Date(date).toISOString(),
        payerId,
      }
    : {
        description,
        amount: Number(amount),
        categoryId,
        date: new Date(date).toISOString(),
        ...(payerId ? { payerId } : {}),
      };
}

/**
 * Wraps `useCreateExpense`/`useUpdateExpense` behind a single `submit`
 * entrypoint plus combined `loading`/`error` state, so callers don't need
 * to pick between the two mutations themselves.
 */
function useExpenseMutation(
  groupId: string,
  expense: ExpenseFormProps["expense"],
) {
  const createExpense = useCreateExpense(groupId);
  const updateExpense = useUpdateExpense(groupId);

  const loading = createExpense.isPending || updateExpense.isPending;
  const mutationError = createExpense.error ?? updateExpense.error;
  const error =
    mutationError instanceof Error ? mutationError.message : null;

  const submit = (payload: ReturnType<typeof buildExpensePayload>) =>
    expense
      ? updateExpense.mutateAsync(payload)
      : createExpense.mutateAsync(payload);

  return { submit, loading, error };
}

/** Renders nothing when there's no error to show. */
function ExpenseFormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="text-xs font-bold text-brand-expense bg-brand-expense/5 dark:bg-brand-expense/10 dark:text-red-400 p-2 rounded border border-brand-expense/20 dark:border-red-900/30 transition-all duration-200 ease-out starting:opacity-0 starting:-translate-y-1">
      {message}
    </div>
  );
}

/** Renders nothing when the group has no members to pick a payer from. */
function PayerField({
  members,
  payerId,
  onPayerChange,
}: {
  members: { id: string; name: string }[];
  payerId: string;
  onPayerChange: (value: string) => void;
}) {
  if (members.length === 0) return null;

  return (
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
        onValueChange={onPayerChange}
        placeholder="Select member"
        options={members.map((m) => ({ value: m.id, label: m.name }))}
      />
    </div>
  );
}

/** Delete/Cancel/Submit action row; button widths and the submit label
 * adapt to whether an edit-only `onDelete` action is present. */
function ExpenseFormFooter({
  loading,
  categoryId,
  isEditing,
  onDelete,
  onCancel,
}: {
  loading: boolean;
  categoryId: string;
  isEditing: boolean;
  onDelete?: () => void;
  onCancel?: () => void;
}) {
  const wideButtons = !onDelete;
  const submitLabel = loading
    ? "Saving..."
    : isEditing
      ? "Save Changes"
      : "Log Expense";

  return (
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
          className={wideButtons ? "flex-1" : ""}
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      )}
      <Button
        type="submit"
        variant="balance"
        className={wideButtons ? "flex-1" : ""}
        disabled={loading || !categoryId}
      >
        {submitLabel}
      </Button>
    </div>
  );
}

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

  const { submit, loading, error } = useExpenseMutation(groupId, expense);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = buildExpensePayload(
      { description, amount, categoryId, date, payerId },
      expense,
    );
    const result = await submit(payload);

    if (!result.ok) return;

    setDescription("");
    setAmount("");
    setCategoryId("");
    setDate(today);
    setPayerId(defaultPayerId ?? "");
    await onSuccess?.();
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

      <PayerField
        members={members}
        payerId={payerId}
        onPayerChange={setPayerId}
      />

      <ExpenseFormError message={error} />

      <ExpenseFormFooter
        loading={loading}
        categoryId={categoryId}
        isEditing={expense !== undefined}
        onDelete={onDelete}
        onCancel={onCancel}
      />
    </form>
  );
}
