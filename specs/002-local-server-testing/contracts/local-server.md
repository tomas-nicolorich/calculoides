# Contract: Local API Server

## Overview
The Local API Server provides a development-time replacement for Vercel's serverless runtime. It hosts the same handlers found in the `api/` directory.

## Base URL
`http://localhost:3001`

## Endpoints
The server mirrors the file structure of the `api/` directory:

| Path | Handler File | Description |
|------|--------------|-------------|
| `/api/groups` | `api/groups.ts` | Group management |
| `/api/members/*` | `api/members/*.ts` | Member management |
| `/api/savings` | `api/savings.ts` | Savings logic |
| ... | ... | All other files in `api/*.ts` |

## Request/Response Format
The server uses Express and must polyfill the Vercel-specific Request/Response properties if they are not already handled by the `withErrorHandling` middleware.

### Required Polyfills (if not using `withErrorHandling`)
- `res.status(code)`: Set HTTP status code.
- `res.json(data)`: Send JSON response and set content-type.
- `req.body`: Automatically parsed from JSON.
- `req.query`: Automatically parsed from URL.

## Environment Variables
The local server MUST be started with the following environment variables:
- `CALC_ENVIRONMENT=local`
- `SUPABASE_URL`: Valid Supabase URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Required for server-side Prisma operations.
- `DATABASE_URL`: Connection string for Prisma.
