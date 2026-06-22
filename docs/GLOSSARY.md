# Glossary

Domain terms used across Calculoides. Keep entries one concept each; link the
ADR that fixes the term's meaning.

## Group Income

The combined monthly income of a group: `Σ GroupMember.income` over the group's
members. A derived figure (never persisted on `Group`), shown on the Groups list
card and gated to appear only when greater than zero. Not spend, budget, or
balance. See [ADR 0008](adr/0008-groups-list-design-fidelity.md).

## kind (group)

A group's category label (`Housemates` / `Trip` / `Family`) in the design
reference fixture only. **Not a persisted field** on `Group` as of 2026-06-21;
present in `.knowledge/.../groups.html` fixtures but dropped from the shipped
card pending a deliberate domain change. See
[ADR 0008](adr/0008-groups-list-design-fidelity.md).

## colorIndex (member)

A member's stable per-group colour/initial key, derived from join order, threaded
into every `Avatar` so one person renders one colour everywhere. See
[ADR 0007](adr/0007-dashboard-design-fidelity.md).

## role (group membership)

A user's relationship to a group: `OWNER` (created/owns it) or `MEMBER`.
Displayed lowercased and capitalised on the Groups card meta row.
