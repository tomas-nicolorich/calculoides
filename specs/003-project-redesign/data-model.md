# Data Model: Project Redesign

## UI Component Schema (Internal)

### ResponsiveDialog Props
| Field | Type | Description |
|-------|------|-------------|
| `open` | `boolean` | Control state |
| `onOpenChange` | `(open: boolean) => void` | Change handler |
| `trigger` | `ReactNode` | The element that opens the modal |
| `title` | `string` | Modal title |
| `description` | `string` | Modal description (accessibility) |
| `children` | `ReactNode` | Form content |
| `isDirty` | `boolean` | Track unsaved changes for close confirmation |

### BudgetTransferState (Zustand/Context)
| Field | Type | Description |
|-------|------|-------------|
| `fromMemberId` | `string \| null` | Source member (pre-filled from Category arrows) |
| `toMemberId` | `string \| null` | Destination member |
| `amount` | `number` | Transfer amount |
| `isOpen` | `boolean` | Modal visibility |

## Relationships

1. **CategoryRow → TransferTrigger**: One-to-one relationship in UI.
2. **TransferTrigger → BudgetTransferModal**: Triggers state update and modal visibility.
3. **Form → ResponsiveDialog**: Forms are children of the dialog, communicating "dirty" state via props/context.

## Validation Rules
- **Confirm Close**: If `isDirty` is true and `onOpenChange(false)` is called, a confirmation prompt MUST be shown.
- **Mobile Drawer Height**: Max height 90vh, scrollable internally.
