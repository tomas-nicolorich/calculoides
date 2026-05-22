# Data Model: Function Consolidation Mapping

## Physical Handlers (Target: ≤ 12)

| Handler File | Logical Routes Handled | Logic Type |
|--------------|------------------------|------------|
| `api/groups.ts` | `/api/groups`, `/api/groups/transfer-ownership`, `/api/invitations` | CRUD / State |
| `api/transactions.ts` | `/api/expenses`, `/api/categories`, `/api/savings`, `/api/transfers`, `/api/summary` | Financial / Aggregation |
| `api/members.ts` | `/api/members`, `/api/members/[id]/income` | Profile / Calculation |

## SSG / Static Migration

| Logical Route | Original File | Target Strategy |
|---------------|---------------|-----------------|
| `/api/categories` | `api/categories.ts` | SSG (Build-time JSON) |
| `/api/config` | (New) | Static Environment Vars |

## Validation Rules

- **SC-001**: Total count of files in `api/` matching `*.ts` (excluding `src/` and subdirectories not handled by rewrites) must be ≤ 12.
- **SC-004**: Latency p95 difference between baseline and consolidated must be ≤ 20%.
- **FR-006 (Constitution III)**: Consolidated handlers MUST implement "Calculation on Read" and "Remainder Absorption" logic for all financial endpoints (Transactions, Members).
- **Bundle Size Gate**: Any single consolidated function file (e.g., `groups.ts`) MUST NOT exceed **40MB** bundle size.
