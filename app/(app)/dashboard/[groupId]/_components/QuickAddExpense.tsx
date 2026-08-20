"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddExpenseFab, Button, ResponsiveDialog } from "../../../../_ui";
import { useDashboardSummary } from "../../../../_data/summary";
import { useCategoriesList } from "../../../../_data/categories";
import { ExpenseForm } from "./ExpenseForm";

/**
 * Composes `ExpenseForm` as a dashboard quick-action (PR 16, task 16.8):
 * a trigger button + `ResponsiveDialog`, matching `main`'s `DashboardPage`
 * "Add Expense" placement (`DashboardHeader`'s desktop button /
 * `AddExpenseFab` on mobile) — scoped here to the button + dialog only, not
 * a full-page form and not `main`'s mobile FAB/skeleton/avatar-group
 * machinery, which is a separate widget's scope. Self-subscribes to the
 * already-hydrated `queryKeys.summary`/`queryKeys.categories` caches, same
 * "no per-widget waterfall" convention every dashboard widget follows.
 */
export function QuickAddExpense({
  groupId,
  currentUserId,
}: {
  groupId: string;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: summary } = useDashboardSummary(groupId);
  const { data: categories } = useCategoriesList(groupId);

  const defaultPayerId = summary?.members.find(
    (m) => m.userId === currentUserId,
  )?.id;

  return (
    <>
      <Button
        variant="cta"
        className="hidden md:inline-flex"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Plus size={16} className="mr-1" />
        Add Expense
      </Button>

      <div className="md:hidden">
        <AddExpenseFab
          onClick={() => {
            setOpen(true);
          }}
        />
      </div>

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Add Expense"
        description="Log a spend against a category and the member who paid."
        hideCloseButton
      >
        <ExpenseForm
          groupId={groupId}
          categories={categories ?? []}
          members={summary?.members ?? []}
          defaultPayerId={defaultPayerId}
          onSuccess={() => {
            setOpen(false);
          }}
          onCancel={() => {
            setOpen(false);
          }}
        />
      </ResponsiveDialog>
    </>
  );
}
