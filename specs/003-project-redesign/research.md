# Research: Project Redesign (Mobile-First)

## Decision: Responsive Drawer-Dialog Pattern
**Rationale**: As per Assumption A-002, we need a "Drawer" (bottom-sheet) on mobile and a "Dialog" (centered modal) on desktop.
**Implementation**: Use a shared `ResponsiveDialog` component that uses the `useMediaQuery` hook to switch between `shadcn/ui` Dialog and Drawer (Vaul).
**Alternatives considered**: Pure Dialog on all screens (rejected: poor mobile UX); Pure Drawer on all screens (rejected: awkward on wide monitors).

## Decision: Hardware Back Button Handling
**Rationale**: Mobile users expect the hardware back button to close overlays.
**Implementation**: Use the `window.history.pushState` pattern when a modal opens. When the user hits back, the `popstate` event will trigger, and we can close the modal.
**Code Pattern**:
```typescript
useEffect(() => {
  if (open) {
    window.history.pushState({ modal: true }, "");
    const handlePopState = () => setOpen(false);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.modal) window.history.back();
    };
  }
}, [open]);
```

## Decision: Dirty Form Confirmation
**Rationale**: Prevent accidental data loss.
**Implementation**: Wrap the `DialogContent` / `DrawerContent` close triggers. Use a `useConfirmClose` hook that checks a `isDirty` flag (from React Hook Form). If dirty, show a simple `window.confirm` or a nested small alert dialog.
**Integration**: Intercept `onPointerDownOutside` and `onEscapeKeyDown` in Radix primitives to prevent automatic closing if the form is dirty.

## Decision: Budget Transfer Integration
**Rationale**: Streamline the transfer workflow from the Categories view.
**Implementation**: The "Transfer Arrows" in `widgets/CategoryList` will trigger a global `useBudgetTransferStore` (Zustand) or a context-based hook that sets the `initialMemberId` and opens the `BudgetTransferModal`.
**FSD Placement**:
- Trigger: `widgets/category-list/ui/TransferTrigger.tsx`
- Modal: `features/budget-transfer/ui/BudgetTransferModal.tsx`

## Decision: FSD Layout Refactor
**Rationale**: Align with Constitution Principle II.
**Implementation**: 
- Move all base UI (Button, Input, Modal, Drawer) to `shared/ui`.
- Move global hooks (useMediaQuery, useConfirmClose) to `shared/lib`.
- All forms (Expense, Category, etc.) moved to `features/[feature-name]/ui`.
