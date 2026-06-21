# Groups list design fidelity: derive from existing data, drop what needs a new domain concept

## Status

Accepted (2026-06-21)

Builds on [ADR 0005](0005-adopt-calculoides-design-system.md) (adopt the CDS),
applying the "reference governs treatment, CDS governs tokens" rule to the
**Groups list** screen. The same rule is stated for the dashboard in ADR 0007
(landing with the dashboard redesign); this ADR is its sibling, not a dependency.

## Context

The design reference `.knowledge/calculoides-app/project/groups.html` renders a
richer group card than the shipped `GroupsPage`:

- An icon tile, the group name, and a **meta row** reading `owner · Housemates · 3 members`.
- A right-aligned **Group Income** figure (mono, tabular) shown only when > 0.
- An **`AvatarGroup`** of member avatars.
- A hover-lift (border tints to `brand-balance`, card rises 2px).

The shipped card had only the icon tile, name, lowercased role, and a chevron.

Mapping each reference element to backing data showed the gap is mostly
*treatment*, not capability — matching the ADR 0007 finding:

- **Member avatars** — free. `getUserGroups` already includes
  `members[].user.name`; `Avatar` / `AvatarGroup` already exist.
- **Group Income** — free. `GroupMember.income` is in the same payload; the
  figure is `Σ members.income`.
- **`kind`** (`Housemates` / `Trip` / `Family`) — the mock's `kind` is a
  **fixture-only** field. `Group` has **no** such column. Reaching it means a
  schema migration, an API field, a create-form picker, and a backfill of every
  existing group.

The reference is a static fixture (`app/data.js`) where `kind`, `memberCount`,
and `monthly` are hand-authored. "As close as possible" therefore forks on
whether a fixture field justifies a new persisted domain concept.

## Decision

**Reproduce every reference element that existing data already supports; drop
the one element (`kind`) that would require inventing a persisted domain
concept, rather than fake it.**

Built with Tailwind + existing `brand-*` tokens and CDS primitives (`Avatar`,
`AvatarGroup`, `Button`), not the reference's `ck-*` CSS or CDS bundle — the
frontend has no `ck-*` layer, so the tokens are reproduced, not imported.

### Group Income = Σ member incomes, label "Group Income", hidden when 0

Computed client-side from the list payload; no API change. "Group Income" is the
group's combined monthly household income, not spend or budget. Rendered in
`font-mono tabular-nums` to match the reference's numeric treatment. Suppressed
when the sum is 0 (e.g. a trip group with no incomes set), exactly as the mock
gates on `monthly > 0`.

### `kind` is dropped from the card — meta row is `role · N members`

No schema/API/form change. The meta row keeps its rhythm with role and the live
member count (`group.members.length`, pluralised). A real `Group.kind` may be
added later as its own scoped change with migration + picker + backfill; it is
out of scope for a fidelity pass and was explicitly deferred during grilling.

### Avatars use stable `colorIndex`, AvatarGroup overflow

`AvatarGroup max={4} size="sm"`, each `Avatar` keyed by `colorIndex={i}`
(member array order) — consistent with the stable per-member colour index the
dashboard uses (ADR 0007). Overflow
beyond four collapses into the component's built-in `+N` chip rather than the
mock's hand-sliced four. Name falls back `user.name → user.email → "?"` so a
member without a set name never renders a broken initial.

## Consequences

- **Zero backend change.** Pure `GroupsPage.tsx` rewrite; income and avatars are
  derived from the existing `/groups` payload.
- The card now lifts on hover and carries avatars + income, matching the
  reference's information density.
- `kind` remains absent until a deliberate domain change adds it; the meta row
  reads `owner · 3 members` instead of `owner · Housemates · 3 members`.
- The "New Group" / empty-state buttons move from inline Tailwind to the CDS
  `Button` (`income` / `balance` variants), per ADR 0005's no-inline-primitives rule.

## Rejected alternatives

- **Add a real `Group.kind` field** for full meta fidelity. Deferred (not
  rejected outright): a fidelity pass should not silently introduce a persisted
  domain concept, a migration, and a backfill. Tracked for a future scoped change.
- **Hardcode a placeholder `kind`** (e.g. a static "Group" label) to preserve the
  visual rhythm. Rejected: shows information that isn't real, and the dot-meta row
  reads cleanly with two segments.
- **Fetch per-group `/summary` for income.** Rejected: N requests on a list view
  when `Σ members.income` is already in the list payload.
