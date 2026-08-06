"use client";

import { useState, type SyntheticEvent } from "react";
import {
  useTransfersList,
  useCreateTransfer,
  useDeleteTransfer,
  useDeleteAllTransfers,
} from "./queries";

/**
 * Lean Next-app port of `frontend/src/pages/transfers/ui/TransfersPage.tsx`
 * (5.8) — plain Tailwind, create/delete/delete-all wired through
 * `lib/actions/transfer.ts` Server Actions with group-scoped cache
 * invalidation, same "lean, not a full port" precedent as
 * `ExpensesClient`/`GroupsClient`/`MembersClient` (4b.6, 3b.8). Full
 * filter/pagination/detail-dialog UI is out of this phase's scope.
 */
export function TransfersClient({ groupId }: { groupId: string }) {
  const { data, isLoading } = useTransfersList(groupId);
  const createTransfer = useCreateTransfer(groupId);
  const removeTransfer = useDeleteTransfer(groupId);
  const removeAll = useDeleteAllTransfers(groupId);

  const [categoryId, setCategoryId] = useState("");
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: SyntheticEvent) => {
    event.preventDefault();
    setError(null);

    const result = await createTransfer.mutateAsync({
      categoryId,
      fromMemberId,
      toMemberId,
      amount: Number(amount),
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCategoryId("");
    setFromMemberId("");
    setToMemberId("");
    setAmount("");
  };

  const transfers = data?.transfers ?? [];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Transfers
        </h1>
        <button
          type="button"
          disabled={transfers.length === 0 || removeAll.isPending}
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
          value={fromMemberId}
          onChange={(event) => {
            setFromMemberId(event.target.value);
          }}
          placeholder="From Member ID"
          className="h-10 rounded-md border border-slate-300 dark:border-slate-700 px-3"
        />
        <input
          value={toMemberId}
          onChange={(event) => {
            setToMemberId(event.target.value);
          }}
          placeholder="To Member ID"
          className="h-10 rounded-md border border-slate-300 dark:border-slate-700 px-3"
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
        <button
          type="submit"
          disabled={createTransfer.isPending}
          className="h-10 px-4 rounded-md bg-brand-balance text-white font-medium disabled:opacity-60"
        >
          {createTransfer.isPending ? "Transferring..." : "Transfer"}
        </button>
        {error && <p className="text-sm text-red-600 w-full">{error}</p>}
      </form>

      {isLoading ? (
        <p data-testid="transfers-loading">Loading…</p>
      ) : transfers.length === 0 ? (
        <p className="text-slate-500">
          No transfers logged yet for this group.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="transfers-list">
          {transfers.map((transfer) => (
            <li
              key={transfer.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-4"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {transfer.fromMemberName} → {transfer.toMemberName}
                </p>
                <p className="text-sm text-slate-500">
                  {transfer.categoryName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono tabular-nums text-sm text-slate-900 dark:text-white">
                  {transfer.amount}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void removeTransfer.mutateAsync({
                      transferId: transfer.id,
                    });
                  }}
                  className="text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
