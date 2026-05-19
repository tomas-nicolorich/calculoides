# Research: Local Server Implementation

## Decision: Local Express-based API Server
**Rationale**: The existing Vercel functions in `api/*.ts` are already wrapped with a middleware (`withErrorHandling`) that polyfills Vercel's `status()` and `json()` methods. This allows them to be easily mounted in a standard Express application without modification. This approach avoids dependency on the Vercel CLI while providing a faithful representation of the production environment.

**Alternatives considered**:
- `vercel dev`: Rejected because the user specifically requested a local server "without connecting to Vercel".
- Manual Node.js `http` server: Rejected in favor of Express for easier routing and middleware (CORS, body parsing) support.

## Decision: Environment-aware Vite Proxy
**Rationale**: To maintain the `/api` endpoint path in the frontend without hardcoding URLs, the Vite development server will be configured to proxy requests starting with `/api` to the local Express server (defaulting to port 3001) when `CALC_ENVIRONMENT` is set to `local` or `test-local`.

**Alternatives considered**:
- Hardcoding `localhost:3001` in `apiClient`: Rejected as it complicates the code and deviates from the production `/api` pathing.

## Decision: Dynamic Route Loading
**Rationale**: The local server will automatically scan the `api/` directory for `.ts` files and mount their default exports as routes. This ensures that new functions are automatically available locally without manual configuration.

## Decision: CALC_ENVIRONMENT Variable
**Rationale**: A new environment variable `CALC_ENVIRONMENT` will be introduced. 
- `remote` (default): Use production/preview Vercel endpoints.
- `local`: Use local Express server + production Supabase (as per user clarification).
- `test-local`: Use local Express server + test Supabase.

---

## Needs Clarification Resolved

- **Unknown**: How to run Vercel functions locally without `vercel dev`?
  - **Resolution**: Use a custom Express wrapper that imports the function handlers and mounts them as routes.
- **Unknown**: Where does financial logic live?
  - **Resolution**: `api/src/services/calculation.ts`. It is already server-side and uses Prisma, satisfying Constitution III and IV.
- **Unknown**: How to handle frontend API calls?
  - **Resolution**: Add a proxy configuration to `frontend/vite.config.ts` that triggers when `CALC_ENVIRONMENT` is `local`.
