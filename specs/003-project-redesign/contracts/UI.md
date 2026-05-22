# UI Contract: ResponsiveDialog

The `ResponsiveDialog` is a core architectural component that abstracts the difference between a Desktop Modal (Dialog) and a Mobile Bottom Sheet (Drawer).

## Interface

```typescript
interface ResponsiveDialogProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isDirty?: boolean;
}
```

## Behavior

1. **Responsive Switch**:
   - `(min-width: 768px)`: Renders `shadcn/ui` Dialog.
   - `(max-width: 767px)`: Renders `vaul` Drawer.
2. **Back Button**:
   - On mobile, opening the drawer pushes a state to history.
   - Popstate event closes the drawer.
3. **Dirty Handling**:
   - If `isDirty` is true, any attempt to close the dialog (backdrop click, ESC, hardware back) must be intercepted.
   - User must confirm closure via `window.confirm` or an `AlertDialog`.
4. **Focus Management**:
   - Standard Radix focus trapping and restoration.
5. **Keyboard Support**:
   - `ESC` closes the dialog (unless dirty check fails).
   - Forms within the dialog should support `Enter` for submission where appropriate.
