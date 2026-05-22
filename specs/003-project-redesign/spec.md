# Feature Specification: Project Redesign (Mobile-First)

**Feature Branch**: `003-project-redesign`  
**Created**: 2026-05-22  
**Status**: Draft  
**Input**: User description: "Redesign the project. There are examples you can use as reference (do not necesarilly copy everything) in @.superpowers/docs/ The design has to be mobile first and responsive. The idea for input forms (expenses, new or edited categories, savings goals, etc) is to have modals that popup instead of having a card there at all times. Some UI elements might also be integrated better with the overall structure, look at how in the categories section there are 2 arrows besides each member and that opens the budget transfer modal."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Responsive Financial Overview (Priority: P1)

As a user on a mobile device, I want to see a clean and condensed overview of my finances so that I can quickly understand my budget status without excessive scrolling or horizontal panning.

**Why this priority**: Mobile-first responsiveness is the core requirement of the redesign. The overview is the most frequently visited screen.

**Independent Test**: Can be tested by opening the dashboard on a mobile screen (375px width) and verifying that all key metrics are visible and correctly scaled.

**Acceptance Scenarios**:

1. **Given** a user is on a mobile device, **When** they load the dashboard, **Then** all financial cards (Total Expenses, Remaining Budget, etc.) stack vertically and fit the screen width.
2. **Given** a user is on a desktop device, **When** they resize the window, **Then** the layout transitions from a multi-column view to a single-column mobile view seamlessly.

---

### User Story 2 - Modal-Based Expense Entry (Priority: P1)

As a user, I want to add a new expense through a modal popup rather than a persistent card so that the UI remains uncluttered and focused on my current task.

**Why this priority**: Explicitly requested by the user to improve the "look and feel" and reduce clutter.

**Independent Test**: Can be tested by clicking the "Add Expense" button and verifying that a modal appears, allows data entry, and disappears upon saving.

**Acceptance Scenarios**:

1. **Given** the user is on the Expenses page, **When** they click "New Expense", **Then** a modal overlays the screen with the expense form.
2. **Given** the modal is open, **When** the user clicks "Save" or "Cancel", **Then** the modal closes and the underlying list reflects the changes.

---

### User Story 3 - Integrated Budget Transfer (Priority: P2)

As a user in the Categories section, I want to trigger a budget transfer directly from the member list using intuitive icons (arrows) so that I can manage my group budget with minimal navigation.

**Why this priority**: Enhances UI integration and streamlines a key user workflow.

**Independent Test**: Can be tested by locating a member in the categories list, clicking the adjacent "transfer arrows", and verifying that the budget transfer modal opens with the member context pre-filled.

**Acceptance Scenarios**:

1. **Given** the Categories view, **When** the user clicks the "double arrows" icon next to a member name, **Then** the Budget Transfer modal opens.
2. **Given** the Budget Transfer modal is opened via these arrows, **When** it loads, **Then** the "From/To" member field is pre-selected based on the clicked member.

---

### Edge Cases

- **Large Form in Modal**: Modals containing long forms (e.g., Savings Goal with many parameters) must be scrollable internally on small screens to prevent being cut off.
- **Back Button Handling**: On mobile, hitting the hardware "back" button should close the open modal rather than navigating away from the page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST implement a mobile-first, responsive layout using a flexible grid system.
- **FR-002**: System MUST transition all standalone input cards (Expenses, New Category, Edit Category, Savings Goals) into triggered Modals/Dialogs.
- **FR-003**: System MUST provide a consistent "Floating Action Button" (FAB) or prominent "Add" button on mobile for primary actions (New Expense).
- **FR-004**: System MUST implement budget transfer triggers (bidirectional arrows) as inline UI elements next to member entries in the Categories view.
- **FR-005**: Modals MUST support "click-outside-to-close" and "ESC-to-close" behavior on desktop, and easy swipe/close gestures on mobile.
- **FR-006**: Input forms inside modals MUST be optimized for mobile input (correct keyboard types for numbers, large tap targets).

### Key Entities *(include if feature involves data)*

- **UI Component Library**: The set of redesigned components (Modals, Nav, Cards) following the new aesthetic.
- **Budget Transfer Interaction**: The data flow between the inline category arrows and the transfer modal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of input forms specified in the request are migrated from persistent cards to modals.
- **SC-002**: Mobile Lighthouse "Best Practices" and "Accessibility" scores are above 90.
- **SC-003**: Average time to initiate an expense entry on mobile is reduced by 20% due to better button placement.
- **SC-004**: Zero horizontal scrolling on screens as narrow as 320px width.

## Assumptions

- **A-001**: The redesign will leverage the existing Tailwind CSS and Shadcn/UI stack.
- **A-002**: Modals on mobile MUST utilize a "Drawer" (bottom-sheet) pattern for better thumb-reachability and consistency with mobile OS patterns, while remaining standard centered dialogs on desktop.
- **A-003**: Visual direction will follow a "Balanced/Hybrid" aesthetic, combining clean minimalist layouts with informative visual cues such as icons, progress bars, and subtle depth effects to ensure both clarity and information density.
