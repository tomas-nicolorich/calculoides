# Savings Calculator uses client-side projection

## Status

Accepted (amended 2026-07-17)

## Context

The **Savings Calculator** needs to show a live **Projected Date** as the user adjusts per-member **Contributions**. The projection formula is `ceil((targetAmount - startingAmount) / totalMonthlyContributions)` months from today — pure arithmetic with no external dependencies.

Two approaches were considered:

1. **Server roundtrip on every change** — user changes a value, the frontend sends a request, the server returns a new projected date.
2. **Client-side projection, server on save** — the frontend mirrors the same formula locally for instant feedback; the server recomputes and persists only when the user explicitly saves.

## Decision

Use client-side projection (option 2). The frontend owns a local copy of the projection formula during an active editing session. Only an explicit Save or Cancel ends the session and either writes the final result to the server or discards it.

## Consequences

- The projection formula must be kept in sync between `api/src/services/savings.ts` and the frontend. If the formula changes on the server, it must also be updated on the client.
- There are no intermediate server writes during editing. If the user navigates away without saving, all changes are lost.
- The undo feature for "Reset to Income Split" is also purely local state — it restores the pre-reset custom values from in-memory snapshot without a server read.

## Rejected alternative

Server roundtrip preview was rejected because it introduces latency on every keystroke and adds backend complexity (a non-persistent "preview" endpoint) for no benefit — the formula is simple enough to own on the frontend.

## Amendment (2026-07-17)

The savings service now computes and ships each member's live **remaining balance** ceiling (`income − budgeted category commitments`) alongside the goal breakdown, reusing `calculateCategoryBalances` (category/expense/transfer inputs). This extends the savings service's data dependencies beyond the projection formula's original "pure arithmetic with no external dependencies" framing: it now reads the same category/expense/transfer data the dashboard's remaining-balance widget uses.

This ceiling is used **for warning display only** — to flag when a member's computed income-split share exceeds what they can afford. It never drives a server-side allocation decision: the "Reset to Income Split" recompute stays entirely client-side per this ADR's core decision, with no server roundtrip per Reset click, and the ceiling comparison is a pure display-time check that does not alter any member's allocated amount.

This does **not** reverse the core decision. Client-side projection/recompute during an editing session is unchanged; the ceiling is an **additive, read-only data dependency** shipped with the initial fetch, not a return to server-per-change roundtrips. The consequence in "Consequences" about keeping the projection formula in sync still holds unchanged — the ceiling data does not participate in the projection formula.
