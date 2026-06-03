# Quickstart: Project Redesign

## Environment Setup
1. **Install Dependencies**:
   ```bash
   npm install
   cd frontend && npm install @base-ui/react
   ```
2. **Start Development Environment**:
   ```bash
   npm run dev
   ```
   This will start the frontend (Vite), the API (Vercel Dev), and the local simulation server.

## Key Development Workflows
- **Styling**: All components use Tailwind CSS 4. Primary configuration is in `frontend/src/index.css`.
- **FSD Structure**:
  - Add UI primitives to `frontend/src/shared/ui/`.
  - Add domain entities to `frontend/src/entities/`.
  - Add interaction logic to `frontend/src/features/`.
  - Assemble components into `frontend/src/widgets/`.
  - Create full views in `frontend/src/pages/`.
- **Testing**:
  ```bash
  npm run test
  ```
  Run Vitest for unit and integration tests.

## Redesign Verification
To verify the new card-based layout and features:
1. **Dashboard**: Navigate to `/dashboard/:groupId` and verify all 5 cards (Income, Balance, Expenses, Transfers, Categories) are visible.
2. **Filtering**: Go to the Expenses page and use the member/category filters to ensure the list updates.
3. **Dark Mode**: Open the hamburger menu and toggle Dark Mode. Verify the theme persists after refresh.
4. **Navigation**: Use the hamburger menu to navigate between My Groups, Profile, and Dashboard.

