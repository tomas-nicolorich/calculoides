# Quickstart: Local Server Testing

## Prerequisites
- Node.js installed.
- Supabase project created (or use existing development project).
- Environment variables configured in `.env`.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Set `CALC_ENVIRONMENT` in your shell or `.env`:
   ```bash
   CALC_ENVIRONMENT=local
   ```

3. **Start the Local API Server**
   ```bash
   npm run start:api:local  # To be implemented
   ```
   The server will start on `http://localhost:3001`.

4. **Start the Frontend**
   ```bash
   npm run dev:frontend
   ```
   Vite will automatically proxy `/api` requests to the local server.

## Configuration

The local server uses the `CALC_ENVIRONMENT` variable to determine which environment variables to load:

- `CALC_ENVIRONMENT=local` (default): Loads from `.env` in the root directory.
- `CALC_ENVIRONMENT=test-local`: Loads from `.env.test` in the root directory (falls back to `.env` if not found).

## Testing
To run the automated test suite against the local server:
```bash
npm run test:local
```
This will start the local API server on a test port and run the integration tests.
