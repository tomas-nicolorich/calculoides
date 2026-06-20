# Budget Categories renders as a collapsible accordion

## Status

Accepted (2026-06-19)

## Context

The dashboard's Budget Categories widget previously showed every category fully expanded, with each category's per-member breakdown always visible. With several categories and three or more members, the widget grew very tall and pushed the per-member detail — quotas, spending, transfers — into an undifferentiated wall of rows. The redesign mock reworks this widget into a collapsible accordion so the panel stays scannable and the member-level detail is opt-in.

## Decision

Render each **Budget Category** as a collapsible accordion item (the **Budget Categories Accordion**, see `frontend/CONTEXT.md`).

- **Collapsed header**: category icon, name, monthly target, a category-level spent meter (`Σ member spent ÷ monthly target`), and a chevron. No per-category action buttons — the header stays clean.
- **Default state**: all items collapsed on load.
- **Expanded body**: one row per participating **Member**, plus an owner-gated Edit/Delete action row (Delete owner-only, as before).
- **Per-member row**: avatar (colour indexed by the member's position in the group, matching `MemberBar`), first name, the **Budget Quota** amount, spent, remaining ("left"/"over"), a per-member progress meter, the **Category Member Share**, and a transfer trigger.

The existing transfer / add-category / edit-category / delete-category **dialogs are reused unchanged** — only the presentation around them becomes collapsible, and Edit/Delete move from the (now removed) per-row action group into the expanded body. The "New Category" trigger remains in the widget header.

The **Category Member Share** shown on each row is income-proportional among the category's participating members and transfer-independent (defined in `frontend/CONTEXT.md`).

## Consequences

- The dashboard's Budget Categories panel is compact at rest and reveals member detail on demand.
- Editing or deleting a category now requires expanding it first; this is acceptable because both are infrequent owner actions.
- "Custom"/override badges from the mock are intentionally omitted — the schema has no per-member quota-override concept; a member's quota derives from income share ± transfers.
- The category-level spent meter and the **Category Member Share** are computed client-side from the dashboard summary (member incomes/shares) joined with each category's balances; no new API surface is required.
