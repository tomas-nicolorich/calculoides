# Calculoides API

Consolidated Vercel Serverless functions for financial logic and household budget management.

## Architecture

To stay within the Vercel Hobby plan limit (12 functions), we use a consolidated handler pattern:

- **Groups**: Handles group creation, listing, invitations, and ownership transfers.
- **Members**: Handles member listing, income updates, and member removal.
- **Transactions**: Handles expenses, budget transfers, categories, and savings goals.

### Routing

We use a `dispatcher` utility to route incoming requests to specific actions based on the `action` query parameter or body field.

Example: `POST /api/groups?action=invite`

### Local Development

The local server (`npm run start:api:local`) recursively loads handlers from `src/handlers/` and supports dynamic segments like `[id]`.

## Scripts

- `npm run build:api`: Runs type checks and enforces the 12-function limit.
- `npm run api:benchmark`: Measures latency for core endpoints.
- `npm run test`: Runs the Vitest suite.

## Function Limit Enforcement

We have a strict gate in `scripts/check-function-count.ts` that prevents builds if more than 12 serverless functions are detected in the root of the `api/` directory (per Vercel Hobby plan limits).
