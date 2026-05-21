# Quickstart: Testing Consolidated Functions

## Local Development

The local server simulates Vercel's routing.

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Measure Baseline (Phase 1)**:
   ```bash
   npm run api:benchmark
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

## Verifying Consolidation

1. **Check Function Count**:
   ```bash
   npm run api:check-count
   ```

2. **Run Handler Tests**:
   ```bash
   npm run test api/tests/unit
   ```

3. **Simulate Vercel Build**:
   ```bash
   npm run build:api
   ```
