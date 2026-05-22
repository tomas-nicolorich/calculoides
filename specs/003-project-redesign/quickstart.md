# Quickstart: Project Redesign (Mobile-First)

## Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Local Development**:
   ```bash
   npm run dev
   ```

3. **Verify Responsive Layout**:
   - Open browser dev tools and toggle Device Toolbar (Ctrl+Shift+M).
   - Test at 320px (iPhone SE) and 1280px (Desktop).

## Core Components to Use

### 1. `ResponsiveDialog`
Use this for all new forms.
```tsx
import { ResponsiveDialog } from "@/shared/ui/responsive-dialog"

function MyFeature() {
  const [isDirty, setIsDirty] = useState(false);
  return (
    <ResponsiveDialog 
      trigger={<Button>Open</Button>}
      title="My Form"
      isDirty={isDirty}
    >
      <MyForm onChange={() => setIsDirty(true)} />
    </ResponsiveDialog>
  )
}
```

### 2. `BudgetTransferTrigger`
Add this to category rows to trigger transfers.
```tsx
import { BudgetTransferTrigger } from "@/widgets/category-list"

function CategoryRow({ member }) {
  return (
    <div className="flex justify-between">
      <span>{member.name}</span>
      <BudgetTransferTrigger memberId={member.id} />
    </div>
  )
}
```

## Testing

Run unit tests for UI components:
```bash
npm test frontend
```
Specifically check for:
- `useMediaQuery` behavior.
- `ResponsiveDialog` rendering correct component based on width.
- `popstate` event closing mobile drawers.
