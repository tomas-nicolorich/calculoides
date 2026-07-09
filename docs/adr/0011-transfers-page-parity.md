# 0011: Transfers page brought to parity with Expenses page

Date: 2026-07-04

## Status

Accepted

## Context

`TransfersPage` (`frontend/src/pages/transfers/ui/TransfersPage.tsx`) predates the
`ExpensesPage` redesign (ADR 0010) and never received the same treatment. Today it:

- uses the `ExpenseFilter` feature component (member + category selects only)
- fetches a flat `limit=50` list with no pagination controls, no total, no page-total
- renders a single row layout for all viewports (no desktop table / mobile card split)
- has no delete (or edit/create) action on the list itself

Note: ADR 0010 states `ExpensesPage` was migrated onto the shared `FilterPanel`
component. In the current codebase `ExpensesPage` actually renders its own inline
`Card` + `Select` filter bar and does not import `FilterPanel` — the two drifted
apart at some point after ADR 0010 landed. This ADR follows the code that actually
exists on `ExpensesPage` today (source of truth), not the older ADR's description.

Scope for this change (per stakeholder decision, not full CRUD parity):

- Browsing, filtering, and layout parity with `ExpensesPage`.
- Transfers gain **delete** only. No add/edit dialog is introduced on this page —
  `transfer-create` already exists elsewhere and is out of scope.
- No date-range filter for transfers (member + category only, matching what the
  backend already filters on in `listTransfers`).

## Decision

**Backend**

- Add `categoryId` and `categoryIcon` to `TransferSchema` (`shared/src/schemas/redesign.ts`),
  mirroring `ExpenseSchema`. `listTransfers` (`api/_src/services/transfer.ts`) selects
  `category.id` / `category.icon` to populate them.
- Add `deleteTransfer(transferId)` to `api/_src/services/transfer.ts`, mirroring
  `deleteExpense` (hard delete, no ownership checks beyond what exists for expenses).
  Wire a `DELETE` route/handler in `api/_src/handlers/transactions.ts`.
- Add `transferApi.delete` to a new `frontend/src/entities/transfer` module, mirroring
  `frontend/src/entities/expense`.

**Frontend `TransfersPage`**

- Drop the `ExpenseFilter` component. Replace with the same inline toggled filter
  panel `ExpensesPage` uses: a `Card` holding member + category `Select`s, a
  "Clear filters" button, and an active-filter-count badge on the "Filters" toggle
  button. No date inputs (out of scope, see above).
- Add pagination matching `ExpensesPage`: `PAGE_SIZE = 25`, `offset` state, prev/next
  `IconButton`s, total count display, and a page-total footer summing the visible
  transfers' amounts.
- Desktop table layout, grid roughly `grid-cols-[2.2fr_1.2fr_1.2fr_1fr_64px]`:
  `Transfer (icon + category + date) | From (avatar + name) | To (avatar + name) | Amount | RowMenu`.
  This column shape (not a straight description/category/payer copy from expenses)
  matches the existing product screenshot reference (`.knowledge/screenshots/transfer_layout.png`).
- Row icon: `CategoryIconTile` (per-category icon, same as `ExpensesPage`) rendered
  in the transfer brand color via a `className` override
  (`bg-brand-transfer/10 text-brand-transfer`), relying on `cn()`'s `twMerge` to win
  over the component's default `bg-brand-category/10 text-brand-category` classes.
  No component change needed for this — `CategoryIconTile` already forwards `className`.
- Mobile: card layout mirroring `ExpensesPage`'s mobile card, but tap-to-delete
  instead of tap-to-edit — tapping a card opens the delete confirmation dialog
  directly, since there is no edit action to open instead. Desktop keeps a
  `RowMenu` (delete-only) in the last column.
- Delete confirmation `Dialog` mirrors `ExpensesPage`'s ("Delete Transfer" title,
  same body copy pattern, confirm button `variant="transfer"`). On confirm, call
  `transferApi.delete`, then refresh the transfers list and the dashboard summary.

**Shared component change**

- `RowMenu.onEdit` becomes optional. When absent, the Edit2 menu entry is not
  rendered — only Delete shows. `ExpensesPage` is unaffected since it always
  passes `onEdit`.

## Consequences

- Transfers and Expenses pages now share the same browsing UX (filters, pagination,
  totals, responsive layout, row actions styling) even though their data shapes and
  available actions differ (delete-only vs. full CRUD).
- `RowMenu` becomes a shared delete-only-capable component, usable by future list
  pages that don't need edit.
- `TransferSchema` gaining `categoryId`/`categoryIcon` is a backward-compatible
  additive API change.
- The `ExpenseFilter` feature component becomes unused once `TransfersPage` stops
  using it; it is left in place rather than deleted, since removing unused code
  is out of scope for this change.
- The `FilterPanel`/`ExpensesPage` drift noted above is not resolved by this ADR;
  it's flagged here so a future cleanup can either delete `FilterPanel` or migrate
  both pages onto it.
