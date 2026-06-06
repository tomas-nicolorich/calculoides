# Feature Specification: Redesign Design Constraints

**Feature Branch**: `004-redesign-design-constraints`

**Created**: 2026-06-05

**Status**: Draft

**Input**: Derived from `docs/adr/0001`, `docs/adr/0002`, `docs/adr/0003`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Savings Projection During Editing (Priority: P1)

As a group member adjusting Contributions in the Savings Calculator, I want the Projected Date to update instantly as I adjust each member's monthly contribution, so that I can explore different scenarios without waiting for the server.

**Why this priority**: The Savings Calculator is the feature most sensitive to latency — it is driven by per-keystroke input. Any network round-trip creates perceptible lag that breaks the exploration workflow. This is also the ADR with the tightest invariant (formula parity between client and server).

**Independent Test**: Open the Savings Calculator and start a Contribution Session, change a contribution value, and verify the Projected Date updates before any network request is dispatched. Can be validated by throttling the network to 0 and confirming the UI still responds.

**Acceptance Scenarios**:

1. **Given** a Contribution Session is active, **When** the user changes any member's monthly contribution, **Then** the Projected Date updates immediately without a network request.
2. **Given** no Contribution Session is active, **When** the Savings Calculator is viewed, **Then** the Forecast panel is visible and displays the server-returned Projected Date.
3. **Given** the user has adjusted contributions in the Contribution Session, **When** they click "Save", **Then** the final values are sent to the server and the Projected Date is persisted.
4. **Given** the user has adjusted contributions in the Contribution Session, **When** they click "Cancel", **Then** all edits are discarded and the Forecast panel reverts to the server-returned Projected Date.
5. **Given** the user has overridden contributions and then clicks "Reset to Income Split", **When** they immediately click "Undo Reset", **Then** all contribution values are restored from the Pre-Reset Snapshot without a server request.

---

### User Story 2 - Reduced Visual Weight UI (Priority: P1)

As a user browsing the dashboard and savings pages, I want the interface to feel light and modern — with clean typography, thin accents, and icons that only react on hover — so that the financial data stands out rather than the surrounding chrome.

**Why this priority**: Visual weight directly affects cognitive load across every screen in the application. Getting this baseline right before implementing remaining dashboard widgets prevents design debt from spreading through the component library.

**Independent Test**: Load the dashboard in a browser. Without hovering anything, verify that: section labels use medium-weight text, left accent borders are 2px (not 4px), icon buttons have no visible background, and nested rows inside cards use background fill (not a border) to separate them.

**Acceptance Scenarios**:

1. **Given** a primary figure (e.g., a balance total in `text-3xl`), **When** viewed at rest, **Then** it is rendered at `font-semibold`, not `font-bold`.
2. **Given** a section label using the `text-[10px] uppercase tracking-widest` pattern, **When** viewed at rest, **Then** it is rendered at `font-medium`, not `font-bold`, with uppercase and wide letter-spacing preserved.
3. **Given** a card with a colored left accent, **When** viewed at rest, **Then** the accent is `border-l-2` (2px wide), not 4px.
4. **Given** a card with nested member/item rows, **When** rows are visible, **Then** each row is separated from its siblings by a background fill color (`bg-slate-50` in light, `bg-slate-900/50` in dark), not an individual `border` rule.
5. **Given** a secondary action icon button (e.g., edit, delete, back), **When** the button is at rest, **Then** it has no background container. **When** the user hovers or focuses it, **Then** a background appears.

---

### User Story 3 - Two-Column Dashboard Layout (Priority: P1)

As a user on the dashboard, I want cards to be sized to their content and arranged in a clear two-column grid, so that the two primary summaries are prominent at the top and cards don't show distracting empty space at their bottom.

**Why this priority**: The layout grid is the structural foundation of the dashboard. It determines how all current and future cards are placed and cannot be easily changed once other cards are implemented against it.

**Independent Test**: Load the dashboard with at least one category and one expense in the database. On a desktop viewport (`md`–`lg`): verify Row 1 has Income Overview and Remaining Balance side by side; Row 2 has Budget Categories spanning full width; Row 3 has Recent Expenses and Budget Transfers side by side. On an extra-large viewport (`xl`+): verify the grid expands to three columns. Verify that no card stretches to match a taller sibling in the same row on any viewport.

**Acceptance Scenarios**:

1. **Given** the dashboard loads on a desktop viewport (`md`–`lg`), **When** rows are rendered, **Then** the grid has exactly two columns.
2. **Given** the dashboard loads on an extra-large viewport (`xl`+), **When** rows are rendered, **Then** the grid has three columns.
3. **Given** two cards in the same row with different content heights, **When** rendered, **Then** each card's height matches its own content, not the taller sibling's height.
4. **Given** the dashboard loads on a desktop viewport, **When** the top row is inspected, **Then** it contains Income Overview and Remaining Balance.
5. **Given** the dashboard loads on a desktop viewport, **When** the middle row is inspected, **Then** Budget Categories spans the full grid width.
6. **Given** the dashboard loads on a desktop viewport, **When** the bottom row is inspected, **Then** it contains Recent Expenses and Budget Transfers.
7. **Given** a narrow viewport (mobile), **When** the dashboard renders, **Then** all cards stack into a single column.

---

### Edge Cases

- What happens when the savings goal formula changes on the server but the client-side copy is stale? → The two copies must be kept in sync; any formula change must update both `api/src/services/savings.ts` and the frontend mirror simultaneously.
- What happens when the user edits contributions but navigates away without saving? → All changes are silently discarded (no draft is persisted to the server). No confirmation dialog is required unless data loss is not obvious to the user in context.
- What happens if the user edits a contribution after a Reset to Income Split but before clicking "Undo Reset"? → The Pre-Reset Snapshot is discarded on the first manual edit after a reset. "Undo Reset" disappears from the UI immediately. There is no way to recover the pre-reset values after a manual edit has been made.
- What happens with dark-mode background fills on nested rows when the contrast ratio falls below 4.5:1? → Dark-mode fill values (`bg-slate-900/50` or equivalent) must be verified against the card background to maintain legibility.
- What happens with icon buttons in a context where hover state is not available (touch devices)? → The button remains visually flat; affordance is provided by position and label context, consistent with secondary-action semantics.
- What happens when all members set their monthly contribution to zero? → The Projected Date displays "Never" (or "—") and the Save button is disabled until at least one member has a non-zero contribution. The formula must guard against division by zero before computing.
- What happens when `targetAmount ≤ startingAmount` (the goal is already fully funded)? → The Projected Date displays "Already reached" (or today's date). Save remains enabled — the goal is valid and can still be saved.
- What happens when the Save operation fails (network error or server error)? → An inline error message is displayed and the Contribution Session remains active, preserving all in-progress changes so the user can retry or cancel explicitly.
- What happens if two group members save the Savings Calculator simultaneously? → Last-write-wins: the second Save silently overwrites the first. Optimistic locking is out of scope for this iteration.
- What should a dashboard card display when it has no data (e.g., no expenses, no categories)? → Each card shows a minimal empty-state label (e.g., "No expenses yet") and an optional call-to-action link. Cards are never hidden or removed from the layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-DS-001**: During an active Contribution Session, the Projected Date MUST be recalculated and displayed using a client-side copy of the formula `ceil((targetAmount - startingAmount) / totalMonthlyContributions)` on every contribution change, before any network request is issued.
- **FR-DS-002**: The Projection Formula MUST live in a single module at `shared/logic/projection.ts`, exported from `shared/index.ts`. Both `api/` and `frontend/` MUST import from `shared` — no inline copies of the formula are permitted in either package.
- **FR-DS-003**: The Savings Calculator MUST operate in an explicit Contribution Session: changes are not written to the server until the user confirms via Save. Cancel discards all in-session changes.
- **FR-DS-004**: "Reset to Income Split" MUST capture a Pre-Reset Snapshot of all current contribution values (every member, regardless of override status) before overwriting them, so that an immediate Undo can restore the exact pre-reset state without a server read. The Pre-Reset Snapshot MUST be discarded and "Undo Reset" MUST be hidden the moment the user manually edits any contribution after a reset.
- **FR-DS-014**: When `totalMonthlyContributions` equals zero, the Projected Date MUST display "Never" (or "—") instead of evaluating the formula. The Save button MUST be disabled until at least one member contribution is non-zero.
- **FR-DS-018**: When `targetAmount ≤ startingAmount`, the Projected Date MUST display "Already reached" (or today's date) without evaluating the formula. The Save button MUST remain enabled — the goal is valid in this state. This case MUST be visually and semantically distinct from the "Never" state.
- **FR-DS-019**: The Forecast panel MUST be visible at all times in the Savings Calculator, not only during an active Contribution Session. At rest it MUST display the server-returned Projected Date. When a Contribution Session opens it MUST switch to the locally-computed value and update on every contribution change. When the session ends (Save or Cancel) it MUST revert to the server-returned value.
- **FR-DS-015**: When a Save operation fails (any network or server error), the Savings Calculator MUST display an inline error message and keep the Contribution Session active with all in-progress contribution values preserved. The user MUST be able to retry Save or explicitly Cancel from the error state.
- **FR-DS-016**: All interactive elements in the Savings Calculator and dashboard (icon buttons, contribution inputs, Save, Cancel, Reset, Undo) MUST be reachable and operable via keyboard alone (WCAG 2.1 AA). Focus states MUST be visible on all interactive elements.
- **FR-DS-017**: Each dashboard card MUST display a minimal empty-state label (e.g., "No expenses yet") when it has no data to show. An optional call-to-action link MAY be included. Cards with no data MUST remain visible in the grid at their assigned position and MUST NOT be hidden or removed.
- **FR-DS-005**: All primary figures displayed in large type (`text-3xl` or equivalent heading-size classes) MUST use `font-semibold`.
- **FR-DS-006**: All section labels using the `uppercase tracking-widest` micro-label pattern MUST use `font-medium`. Uppercase and wide letter-spacing MUST be preserved.
- **FR-DS-007**: Colored left accent borders on cards MUST use a 2px width (`border-l-2`). 4px accent borders are not permitted.
- **FR-DS-008**: Nested rows within a card MUST use a background fill color to visually separate from siblings. Individual `border` rules on nested rows are not permitted.
- **FR-DS-009**: Secondary icon buttons (edit, delete, back, and equivalent actions) MUST NOT display a background container at rest. A background MUST appear on hover and focus states only.
- **FR-DS-010**: The dashboard grid MUST use two columns on desktop viewports (`md` through `lg`). On extra-large viewports (`xl` and above) the grid MAY expand to three columns.
- **FR-DS-011**: All grid rows MUST use `align-items: start` so each card's height is determined by its own content, not its row sibling.
- **FR-DS-012**: At two-column widths (`md`–`lg`) the widget arrangement MUST be: Row 1 → Income Overview and Remaining Balance; Row 2 → Budget Categories (full width); Row 3 → Recent Expenses and Budget Transfers. At three-column widths (`xl`+) the arrangement MUST be: Row 1 → Income Overview, Remaining Balance, and Recent Expenses; Row 2 → Budget Categories (full width); Row 3 → Budget Transfers.
- **FR-DS-013**: On viewport widths below the two-column breakpoint, the dashboard grid MUST collapse to a single column.

### Key Entities

- **Contribution Session**: Defined in `frontend/CONTEXT.md`. Begins when the user opens the contribution adjustment panel; ends on Save or Cancel. No server writes occur during an active session.
- **Projection Formula**: The shared calculation `ceil((targetAmount - startingAmount) / totalMonthlyContributions)`, which returns a **month count**. The Projected Date is derived by adding that count to today's date. Only evaluated when `targetAmount > startingAmount` and `totalMonthlyContributions > 0`; all other cases are handled by FR-DS-014 and FR-DS-018. Defined once in `shared/logic/projection.ts` and imported by both `api/` and `frontend/` per FR-DS-002.
- **Pre-Reset Snapshot**: An in-memory copy of **all** contribution values (regardless of override status) captured immediately before a Reset to Income Split. Enables single-level undo without a server read. No per-member filtering — the full table state is preserved.
- **Micro-Label**: A UI typographic pattern — `text-[10px] uppercase tracking-widest` — used for section headers and status chips throughout the component library.
- **Left Accent**: A colored `border-l-*` strip on card or row elements that signals a status or category.
- **Nested Row**: A member or item row rendered inside a card, requiring visual separation from siblings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-DS-001**: The Projected Date in the Savings Calculator updates within 16ms (one animation frame) of a contribution change during a Contribution Session, with no network activity.
- **SC-DS-002**: 100% of primary figure elements across the entire application use `font-semibold` or lighter. Zero instances of `font-bold` on primary figures remain in any view.
- **SC-DS-003**: 100% of micro-label elements (`uppercase tracking-widest` pattern) across the entire application use `font-medium` or lighter. Zero instances of `font-bold` on micro-labels remain in any view.
- **SC-DS-004**: 100% of card left accents across the entire application use `border-l-2` or thinner. Zero `border-l-4` instances remain in any view.
- **SC-DS-005**: 100% of nested rows inside cards across the entire application use background fill for separation. Zero standalone `border` rules on nested rows remain in any view.
- **SC-DS-006**: 100% of secondary icon buttons across the entire application show no background at rest. All icon buttons correctly reveal a background on hover and focus in any view.
- **SC-DS-007**: The dashboard renders five cards in the correct arrangement on every load — two-column at `md`/`lg`, three-column at `xl`+ — with no layout shifts after initial render.
- **SC-DS-008**: No dashboard card stretches to match a sibling's height, confirmed across all data-loading states (empty, partial, full).

## Assumptions

- **Formula sync enforcement**: The Projection Formula is co-located in `shared/logic/projection.ts` and imported by both packages. Structural enforcement replaces manual review — a formula change cannot be applied to one side without updating the shared module.
- **Undo depth**: The Pre-Reset Snapshot supports only one level of undo (the immediately preceding reset). Multi-level undo history is out of scope.
- **Touch affordance**: Icon buttons on touch devices are assumed to be adequately discoverable through contextual placement. A separate touch-affordance study is out of scope.
- **Dashboard column breakpoint**: The two-column layout applies at the existing two-column breakpoint. No new breakpoint is introduced.
- **Formula location**: The Projection Formula lives in `shared/logic/projection.ts` per Constitution XI (shared owns pure utility logic used across packages). It is not a feature-slice concern.
- **Concurrent editing**: Simultaneous edits to the same savings goal by multiple group members are resolved by last-write-wins. No optimistic locking or conflict detection is implemented in this iteration.

## Clarifications

### Session 2026-06-05

- Q: What should the Projected Date display when `totalMonthlyContributions` equals zero? → A: Display "Never" (or "—") and also disable the Save button until at least one member contribution is non-zero.
- Q: What should the Projected Date display when the goal is already fully funded (`targetAmount ≤ startingAmount`)? → A: Display "Already reached" (or today's date). Save remains enabled. This state is distinct from "Never" — the goal is valid and achievable.
- Q: What should the Savings Calculator do when a Save attempt returns an error? → A: Show an inline error message and keep the Contribution Session active so the user can retry or cancel.
- Q: How should concurrent saves by two members on the same Savings Calculator be handled? → A: Last-write-wins; optimistic locking is out of scope for this iteration.
- Q: What accessibility baseline applies to icon buttons and the Savings Calculator? → A: WCAG 2.1 AA keyboard navigation — all interactive elements reachable and operable via keyboard, with visible focus states. Screen reader compliance is not required.
- Q: What should a dashboard card display when it has no data? → A: A minimal empty-state label (e.g., "No expenses yet") with an optional call-to-action link; cards remain visible in the grid and are never hidden.
