# Expenses page redesign: full implementation against design reference

Accepted (2026-06-26)

## Context

The existing `ExpensesPage` was a minimal first pass: delete-only rows, a static filter bar (member + category only), no edit capability, and a hardcoded `limit=50` that silently truncated results. The design reference (`.knowledge/calculoides-app/project/app/expenses.jsx`) specifies a substantially richer screen. This ADR records the implementation decisions made when replacing it wholesale.

## Decisions

### 1. Edit via `PUT` full-replacement endpoint

The existing API had no update path for expenses (`logExpense` + `deleteExpense` only). The redesign adds `PUT /transactions/:id` (expenses) that accepts all five mutable fields: description, amount, date, categoryId, payerId.

`PUT` (full replacement) rather than `PATCH` (partial): the edit dialog always pre-populates and submits all five fields, so the client always has the complete record. Partial-update diffing would add complexity with no benefit — concurrent editing is not a concern in this app.

### 2. Server-side date range filtering (`from` / `to`)

The design adds `from` and `to` date filters alongside the existing member and category filters. These are applied server-side rather than client-side.

Client-side filtering on the already-fetched page would produce silently incorrect totals and counts for groups with more expenses than the page size. Financial filters must be accurate against the full dataset.

### 3. Offset-based pagination with page controls

The API's existing `limit` / `offset` / `total` pagination was unused (frontend hardcoded `limit=50, offset=0`). The redesign wires it up with page controls (prev / next / page numbers). Default page size: 25.

"Load more" append was rejected — page controls make the total count and position visible at a glance, which matters when filtering by date range to locate specific records.

### 4. Row interaction: `tap` (mobile) + `menu` (desktop) only

The design component supports three modes: `tap`, `hover`, and `menu`. Only `tap` (entire row opens edit dialog, mobile) and `menu` (overflow `⋯` popover, desktop) are wired up. `hover` (inline icon buttons on hover) is defined in the spec but never activated by the screen — it is not implemented.

### 5. Generic `FilterPanel` extracted to `shared/ui`

The previous `ExpenseFilter` feature component (member + category selects, always visible) is replaced by a generic `FilterPanel` in `shared/ui`. `FilterPanel` owns the toggle show/hide state, active-count badge, and clear button. Field content is passed as children — callers compose their own `<Select>` / `<Input>` fields.

`ExpensesPage` uses `FilterPanel` with four fields (member, category, from, to). `TransfersPage` (not yet redesigned) continues to use the existing `ExpenseFilter` component until it is updated to use `FilterPanel` with its own field set (from-member, to-member, category).

### 6. `categoryIcon` added to `ExpensesListSchema`

Expense rows display a category tag (icon + name). The icon is resolved in the SQL query via a JOIN on the categories table and included in `ExpensesListSchema` as `categoryIcon: string | null`. Client-side lookup from the separately-fetched categories list was rejected — it would require threading a second data dependency into `ExpenseRow` and could show stale icons if category data is not yet loaded.

## Consequences

- API handler for expenses gains a `PUT` branch; `ExpenseService` gains `updateExpense(id, fields)`.
- `ExpensesListSchema` and the Prisma query gain `categoryIcon`.
- `listExpenses` query params gain `from` and `to` (ISO date strings).
- `ExpenseFilter` feature component is no longer used by `ExpensesPage` but is kept for `TransfersPage`.
- `FilterPanel` is a new `shared/ui` component; `TransfersPage` should migrate to it when its filter bar is redesigned.
- `RowMenu` (overflow popover) is a new component using a React portal to `<body>` with fixed positioning — no dropdown library is available.
