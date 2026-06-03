# API Contracts: Consolidated Handlers

The goal of consolidation is to maintain **zero regression** in API behavior. All existing endpoints MUST maintain their original request/response schemas.

## 1. Groups Handler (`api/groups.ts`)

### Create Group
- **Path**: `POST /api/groups`
- **Body**: `{ "name": string }`
- **Response**: `201 Created` with Group object.

### List Groups
- **Path**: `GET /api/groups`
- **Response**: `200 OK` with Array of Group objects.

### Archive Group
- **Path**: `POST /api/groups/:id/archive`
- **Response**: `200 OK` with updated Group object.

### Transfer Ownership
- **Path**: `POST /api/groups/:id/transfer-ownership`
- **Body**: `{ "newOwnerId": string }`
- **Response**: `200 OK` with updated Group object.

## 2. Transactions Handler (`api/transactions.ts`)

### List/Create Expenses
- **Path**: `GET | POST /api/expenses`
- **Query**: `groupId: string`

### List/Create Transfers
- **Path**: `GET | POST /api/transfers`
- **Query**: `groupId: string`

### Get Summary
- **Path**: `GET /api/summary`
- **Query**: `groupId: string`

## 3. Members Handler (`api/members.ts`)

### List Members
- **Path**: `GET /api/members`
- **Query**: `groupId: string`

### Update Member Income
- **Path**: `POST /api/members/:id/income`
- **Body**: `{ "income": number, "period": "monthly" | "yearly" }`

## Routing Implementation
We will use a custom dispatcher or a lightweight router (like `next-connect` or similar pattern) to handle these sub-routes within the single file exported to Vercel.

**Constraint**: All paths must be relative to `/api` and match the frontend's expectations.
