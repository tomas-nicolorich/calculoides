# Quickstart: Calculoides Development

Follow these steps to set up your local development environment for the Calculoides project.

## Prerequisites
- Node.js (v20+)
- npm or pnpm
- Supabase CLI
- Docker (for local Supabase development)

## Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd calculoides
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Copy `.env.example` to `.env` and fill in your Supabase credentials and database URL.
   ```bash
   cp .env.example .env
   ```

4. **Database Initialization**
   Run Prisma migrations to set up your local or remote database schema.
   ```bash
   npx prisma migrate dev
   ```

5. **Start Development Server**
   Start both the frontend (Vite) and backend (Vercel Functions) concurrently.
   ```bash
   npm run dev
   ```
   - **Frontend**: `http://localhost:5173` (proxies `/api` to `http://localhost:3001`)
   - **Backend**: `http://localhost:3001` (managed by `vercel dev --listen 3001`)

   Alternatively, to run with a local mock server (using `tsx` instead of `vercel dev`):
   ```bash
   npm run dev:local
   ```

   **Note on Local SSL**: If you encounter `SELF_SIGNED_CERT_IN_CHAIN` errors while connecting to a local Supabase instance or other services with self-signed certificates, the API is configured to bypass SSL verification in development mode. You can also manually set `NODE_TLS_REJECT_UNAUTHORIZED=0` in your terminal environment if needed, though the application handles this automatically when `NODE_ENV=development`.

6. **Run Tests**
   ```bash
   npm test
   ```

## Key Commands
- `npm run lint`: Run ESLint and Prettier checks.
- `npx prisma studio`: Open the Prisma database browser.
- `supabase start`: Start local Supabase services.

## Architecture References
- [Feature-Sliced Design (FSD)](https://feature-sliced.design/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Supabase Documentation](https://supabase.com/docs/)
