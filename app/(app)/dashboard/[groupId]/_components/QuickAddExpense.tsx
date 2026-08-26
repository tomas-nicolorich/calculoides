"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddExpenseFab, Button, ResponsiveDialog } from "../../../../_ui";
import { useDashboardSummary } from "../../../../_data/summary";
import { useCategoriesList } from "../../../../_data/categories";
import { ExpenseForm } from "./ExpenseForm";
import type { DashboardSummary } from "shared/src/types/redesign";

/**
 * Composes `ExpenseForm` as a dashboard quick-action (PR 16, task 16.8):
 * a trigger button + `ResponsiveDialog`, matching `main`'s `DashboardPage`
 * "Add Expense" placement (`DashboardHeader`'s desktop button /
 * `AddExpenseFab` on mobile) — scoped here to the button + dialog only, not
 * a full-page form and not `main`'s mobile FAB/skeleton/avatar-group
 * machinery, which is a separate widget's scope. Self-subscribes to the
 * already-hydrated `queryKeys.summary` cache.
 *
 * `queryKeys.categories` is read only by the nested {@link ExpenseFields}
 * component, mounted only while `open` (design.md Decision 4). This
 * component lives inside `SummaryRegion`'s `<Suspense>` boundary, not
 * `CategoriesRegion`'s, so a *disabled* `useCategoriesList` call mounted
 * unconditionally here would still register a placeholder query-cache entry
 * for `categories` before `CategoriesRegion`'s own `HydrationBoundary` runs
 * — TanStack Query then treats the incoming dehydrated state as hydrating
 * an *existing* query (deferred to a post-commit effect) instead of a new
 * one (hydrated synchronously during render), reopening exactly the
 * client-fetch race nesting was meant to close. Not mounting the hook at
 * all until the dialog is actually open avoids creating that placeholder
 * in the first place; the `useCategoriesList(groupId, enabled)` parameter
 * itself is still exercised here as the belt-and-braces guard for the
 * dialog's own open/close transition.
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
        {open && (
          <ExpenseFields
            groupId={groupId}
            summary={summary}
            defaultPayerId={defaultPayerId}
            open={open}
            onSuccess={() => {
              setOpen(false);
            }}
            onCancel={() => {
              setOpen(false);
            }}
          />
        )}
      </ResponsiveDialog>
    </>
  );
}

/** Split out so `useCategoriesList` never mounts (and never registers a
 * query-cache entry) while the dialog is closed — see the module doc
 * comment above. */
function ExpenseFields({
  groupId,
  summary,
  defaultPayerId,
  open,
  onSuccess,
  onCancel,
}: {
  groupId: string;
  summary: DashboardSummary | undefined;
  defaultPayerId: string | undefined;
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { data: categories } = useCategoriesList(groupId, open);

  return (
    <ExpenseForm
      groupId={groupId}
      categories={categories ?? []}
      members={summary?.members ?? []}
      defaultPayerId={defaultPayerId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}
