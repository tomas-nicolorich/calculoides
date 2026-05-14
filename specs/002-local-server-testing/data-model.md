# Data Model: Local Server Testing

## Entities

### EnvironmentConfiguration
Configuration set used to initialize the application and backend services based on the deployment target.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| type | Enum | One of `local`, `remote`, `test-local` | Required |
| apiBaseUrl | String | The root URL for API calls (`/api` or `http://localhost:3001/api`) | Must be valid URI |
| supabaseUrl | String | URL of the Supabase project | Required |
| supabaseKey | String | Supabase Anon/Service Key | Required |

## State Transitions

- **Initialization**: On startup, the system reads `process.env.CALC_ENVIRONMENT`.
- **Mode Selection**: 
    - If `local`, the frontend proxies to port 3001, and the backend uses `.env` credentials.
    - If `test-local`, the backend uses a separate `.env.test` file or prefix.
    - If `remote` (or undefined), standard Vercel behavior is assumed.

## Relationships

- **Local Server** ↔ **API Handlers**: The local server dynamically mounts all files in `api/*.ts`.
- **Frontend** ↔ **Local Server**: Frontend communicates via the `/api` proxy managed by Vite.
