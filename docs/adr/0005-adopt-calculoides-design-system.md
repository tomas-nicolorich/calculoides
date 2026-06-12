# Adopt the Calculoides Design System as the source of truth for UI primitives

## Status

Accepted

## Context

A design system for Calculoides (CDS) exists in `.knowledge/design-system/`. It provides:

- **Core primitives**: Button, Card, Input, Select, Badge, Avatar/AvatarGroup, IconButton
- **Money visualisations**: StatFigure (currency headline), MemberBar (stacked income bar), ProgressMeter (savings/category fill bar)
- **Visual language**: Geist variable fonts (already self-hosted), a token set (already in `frontend/src/app/index.css`), semantic brand colours (`--brand-income`, `--brand-balance`, `--brand-expense`, `--brand-transfer`, `--brand-category`), and Lucide icons exclusively

The existing `shared/ui/` layer was bootstrapped from shadcn, not from the CDS. As a result:

- Button uses `default`/`destructive` instead of semantic money variants (`balance`/`expense`)
- Card uses a shadcn sub-component split (`CardHeader`/`CardTitle`/`CardContent`) rather than a single composable Card
- Several widgets hand-roll visualisations the CDS already provides (`IncomeOverview` reimplements `MemberBar` from scratch)
- CDS components like `Badge`, `Avatar`, `StatFigure`, `MemberBar`, and `ProgressMeter` have no equivalent in `shared/ui/`

## Decision

Replace the shadcn-derived `shared/ui/` layer with Tailwind ports of the CDS. The CDS tokens are already present in `index.css`; the migration is purely at the component layer.

### Implementation approach: Tailwind ports, not CSS injection

The CDS reference implementation uses injected `<style>` tags with CSS custom properties. The codebase convention is Tailwind utility classes. We port the CDS visual design and component API into Tailwind rather than lifting the injection pattern. The visual output is identical because the CDS tokens map directly to the `@theme` block already in `index.css`.

### Component structure

- Core primitives → `shared/ui/` (flat, alongside existing Dialog/Select/UserDisplay)
- Money visualisations → `shared/ui/money/` (separate subdirectory, mirrors CDS `components/money/`)

Money components carry a domain flavour that pure UI primitives don't. The subdirectory signals the distinction without pushing them to a deeper FSD layer.

### Button variant vocabulary

Hard rename — no aliases:

| Old (shadcn) | New (CDS) |
|---|---|
| `default` | `balance` |
| `destructive` | `expense` |
| — | `income` |
| — | `transfer` |
| — | `cta` (hero action, one per screen) |
| `outline` | `outline` (unchanged) |
| `ghost` | `ghost` (unchanged) |

No call sites used `default` or `destructive` at the time of migration, so the rename is zero-blast-radius in practice.

### Card API

Replace the shadcn `CardHeader`/`CardTitle`/`CardContent` split with a single `Card` component accepting a `title` string prop, `accent` (income/balance/expense/transfer/category), `accentSide` (left/top), and `hover`. The sub-component pattern existed only as a shadcn artefact — the product has no use case that requires it.

### UserDisplay retained alongside Avatar

`UserDisplay` (text-only member name, with BUG-014 name-priority fix) and `Avatar` (coloured initial circle) are orthogonal concerns. Both are added to `shared/ui/`. Sites that need a visual identity opt into `Avatar`; sites that need a display name keep `UserDisplay`. No forced migration.

### Widget adoption

The three dashboard widgets and savings goal list are updated to use CDS components rather than inline implementations:

| Widget | Replaces with |
|---|---|
| `IncomeOverview` stacked bar + legend | `MemberBar` |
| `IncomeOverview`, `RemainingBalance` currency headlines | `StatFigure` |
| `SavingsGoalList` status pills | `Badge` |
| `SavingsGoalList` savings fill bar | `ProgressMeter` (unblocked by ADR 0004) |

## Consequences

- All UI primitive work goes through `shared/ui/` first; no new inline implementations of anything the CDS covers
- The Button variant and Badge tone vocabulary is now semantic money language — documented in `frontend/CONTEXT.md`
- Three-PR migration sequence: (1) core `shared/ui/` primitives, (2) `shared/ui/money/` + widget adoption, (3) `startingAmount` → `currentAmount` rename (ADR 0004)

## Rejected alternative

**CSS injection approach**: lift the CDS CSS strings into `index.css` as static blocks and use the CDS components as TypeScript conversions of the reference JSX. Rejected because it mixes CSS injection with Tailwind in a way that conflicts with the existing codebase convention, and because the token bridge already in `index.css` makes Tailwind ports visually identical to the injected approach.
