# Research: Reducing Vercel Serverless Functions

## Baseline Endpoint Inventory (SC-002)

The following logical endpoints must maintain behavioral parity after consolidation.

| Original Path | Logical Group | Current File | Target Action |
|---------------|---------------|--------------|---------------|
| `GET /api/groups` | Groups | `api/groups.ts` | Consolidated |
| `POST /api/groups` | Groups | `api/groups.ts` | Consolidated |
| `POST /api/archive` | Groups | `api/archive.ts` | Consolidated |
| `POST /api/groups/:id/transfer-ownership` | Groups | `api/groups/transfer-ownership.ts` | Consolidated |
| `POST /api/transfer-ownership` | Groups | `api/transfer-ownership.ts` | Consolidated (redundant) |
| `GET /api/expenses` | Transactions | `api/expenses.ts` | Consolidated |
| `POST /api/expenses` | Transactions | `api/expenses.ts` | Consolidated |
| `GET /api/transfers` | Transactions | `api/transfers.ts` | Consolidated |
| `POST /api/transfers` | Transactions | `api/transfers.ts` | Consolidated |
| `GET /api/summary` | Transactions | `api/summary.ts` | Consolidated |
| `GET /api/savings` | Transactions | `api/savings.ts` | Consolidated |
| `GET /api/categories` | Metadata | `api/categories.ts` | **Migrate to SSG** |
| `GET /api/members` | Members | `api/members.ts` | Consolidated |
| `POST /api/members/:id/income` | Members | `api/members/[id]/income.ts` | Consolidated |
| `POST /api/invitations` | Members | `api/invitations.ts` | Consolidated |
| `POST /api/respond-invitation` | Members | `api/respond-invitation.ts` | Consolidated |

**Total Logical Endpoints**: 16
**Target Physical Functions**: 3 Consolidated + 1 SSG + 1 Build Gate = 5 Functions (Safe margin vs 12).

## Baseline Performance (SC-004)

**Decision**: Conduct a baseline latency test for core endpoints using a script before applying consolidation.
**Rationale**: SC-004 requires < 20% degradation. Without a baseline, this cannot be verified.
**Alternatives**: Relying on Vercel Analytics (post-deployment only, less granular for local verification).

## Consolidation Strategy (FR-002)

**Decision**: Group functions by logical domain (Groups, Transactions, Members) into `api/src/handlers/`.
**Rationale**: Balances function reduction (down to ~5-8 total) with bundle size limits.
**Constraints**:
- **Bundle Size**: A **40MB threshold** is set for any single consolidated function. If exceeded, the function will be split by sub-resource.
- **Financial Logic**: All consolidated handlers MUST preserve "Calculation on Read" and "Remainder Absorption" patterns (Constitution III, FR-006) to ensure retroactive correctness and prevent rounding discrepancies.

**Alternatives**: Single massive handler (risks bundle size limits and cold starts), or keeping individual files (exceeds 12-function limit).

## Static Site Generation (US2)

**Decision**: Identify read-only endpoints like `api/categories.ts` for migration to the frontend build process (SSG) or SWR with local caching.
**Rationale**: Directly reduces the physical function count by removing unnecessary server-side logic.
**SSG Candidates**:
- `api/categories.ts` (Fixed list of expense categories)
- `api/invitations.ts` (Static metadata part, if any)

**Alternatives**: Keeping them as serverless functions (wastes function slots).

## Vercel Routing Configuration (FR-005)

**Decision**: Use `vercel.json` rewrites to preserve existing URL structure while pointing to consolidated handlers.
**Rationale**: Meets FR-004 (behavior parity) and FR-005 (IaC management).
**Alternatives**: Manual URL changes in frontend (requires massive refactoring and breaks external API consumers).

## Routing Pattern

```json
{
  "rewrites": [
    { "source": "/api/groups/:action", "destination": "/api/groups?action=:action" },
    { "source": "/api/expenses", "destination": "/api/transactions?type=expense" }
  ]
}
```

## Unknowns Resolved

- **Baseline Latency**: To be measured in T001.
- **SSG Candidates**: Categories and public group info.
- **Vercel Config**: `vercel.json` is the preferred mechanism for FR-005.
