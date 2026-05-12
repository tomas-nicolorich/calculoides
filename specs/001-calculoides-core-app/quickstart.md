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
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

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
