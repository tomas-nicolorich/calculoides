# Calculoides — Frontend

React 19 SPA built with Vite. Routing via React Router 7. Styling with Tailwind 4. Headless UI primitives from Base UI. Auth and data via Supabase JS client. Tests with Vitest + Testing Library.

See `shared/CONTEXT.md` for the core domain vocabulary used throughout this package.

## Conventions

- Components are in `src/`
- Use Base UI primitives for interactive elements (dialogs, dropdowns, etc.) rather than building from scratch
- Tailwind utility classes preferred over custom CSS; use `clsx` + `tailwind-merge` for conditional classes
- Zod schemas from `shared/` are used for form validation
- Shared UI primitives live in `shared/ui/` (Button, Card, Input, Badge, Avatar, IconButton); money-specific visualisations (`StatFigure`, `MemberBar`, `ProgressMeter`) live in `shared/ui/money/`. All are Tailwind ports of the Calculoides Design System — prefer them over inline implementations.
- Button variants are semantic money colours: `balance` (primary blue), `income`, `expense`, `transfer`, `cta` (hero action with glow), `outline`, `ghost`. No `default` or `destructive`.
- Badge `tone` follows the same money-colour vocabulary: `income`, `balance`, `expense`, `transfer`, `category`, `neutral`.

## Domain rendering notes

Add frontend-specific display conventions here as they emerge (e.g. how **Settlement** values are formatted, how **Budget Quota** progress is visualised). Use `/grill-with-docs` to formalise terms when they stabilise.

## Dashboard UI

**Budget Categories Accordion**:
The dashboard's Budget Categories panel renders each **Budget Category** as a collapsible item. The collapsed header shows the category icon, name, monthly target, and a category-level spent meter (`Σ member spent ÷ monthly target`). Expanding reveals the per-member breakdown (one row per participating **Member**) and the owner-gated Edit/Delete actions. All items start collapsed on load. Per-member rows carry the **Budget Quota** amount, spent, remaining ("left"/"over"), a per-member progress meter, the **Category Member Share**, and a transfer trigger that opens the existing Transfer dialog.
_Avoid_: category list, category cards, category table

**Category Member Share**:
The percentage shown on a member's row inside an expanded **Budget Category**. Defined as the member's income share **among that category's participating members**: `income_i ÷ Σ(income over the category's members) × 100`. For an all-members category the denominator is the whole group, so it equals the member's global **Income Percentage**; for a **Member Subset** category the denominator is just the subset, re-normalising the share. It is **transfer-independent** — it reflects the income-proportional split, not the transfer-adjusted **Budget Quota**.
_Avoid_: income share, quota percentage, contribution percentage

## Savings UI

**Savings Calculator**:
The full-page detail view for creating or editing a single **Savings Goal**. Accepts goal parameters (name, target amount, target date, current amount) and a per-member **Contribution** table. Computes the **Projected Date** live in the browser as values change; writes to the server only on explicit Save. Cancel discards all local changes.
_Avoid_: Savings form, goal editor

**Contribution Session**:
The transient client-side state that begins when a user opens the per-member contribution adjustment panel inside the **Savings Calculator** and ends when they confirm via Save or discard via Cancel. No server writes occur during an active **Contribution Session**. The **Projected Date** is recomputed locally on every contribution change throughout the session.
_Avoid_: Edit session, adjustment mode

**Reset to Income Split**:
A UI action within the **Contribution Session** that overwrites all current draft **Contribution** values with the **Income Split** defaults. Clears all overrides; the **Forecast** immediately recalculates from proportional amounts. Cancelling the session afterward restores the server-saved overrides (from the **Pre-Reset Snapshot**), not the pre-reset draft values.
_Avoid_: Reset to default, revert contributions

**Pre-Reset Snapshot**:
A snapshot of the server-saved override amounts, captured at the moment a **Contribution Session** opens. Stored as `memberId → actualAmount` for members whose contribution is currently overridden. Used by Cancel to restore the session to its at-rest server state. Distinct from the current draft overrides, which change as the user edits.
_Avoid_: Undo buffer, edit history

**Plan**:
The intended outcome panel in the **Savings Calculator**, displaying the **Target Date**. Always shown in neutral colour.
_Avoid_: Goal panel, target panel

**Forecast**:
The outcome panel in the **Savings Calculator** that displays the **Projected Date**. Always visible. At rest (no active **Contribution Session**) it shows the server-returned value. During an active **Contribution Session** it switches to a locally-computed value and updates on every contribution change. When the session ends (Save or Cancel) it reverts to the server-returned value. Colour: green when the **Projected Date** is on or before the **Target Date**; amber when it is after (but finite); red with the label "Never" when the total monthly **Contribution** reaches zero (Infinity result).
_Avoid_: Reality panel, projected panel
