# Research: Project Redesign

## Decisions

### 1. Component Library: @base-ui/react
- **Decision**: Use `@base-ui/react` (formerly Headless UI / Base UI from MUI) for accessible, unstyled components.
- **Rationale**: The user specifically requested BaseUI. It provides the best foundation for building custom-styled components with Tailwind CSS while ensuring accessibility.
- **Alternatives Considered**: Headless UI (rejected due to specific user request for BaseUI), Radix UI (rejected for same reason).

### 2. Styling: Tailwind CSS 4
- **Decision**: Use Tailwind CSS 4 as already configured in the project.
- **Rationale**: Tailwind 4 offers improved performance and a simplified configuration (CSS-first approach). It integrates seamlessly with Base UI via the `className` prop and `data-*` attributes for state styling.
- **Key Pattern**: Use `className` for layout and `data-[state]:` variants for component states (e.g., `data-popup-open:`, `data-highlighted:`).

### 3. Architecture: Feature-Sliced Design (FSD)
- **Decision**: Adhere strictly to FSD as mandated by the Constitution.
- **Rationale**: Ensures maintainability and scalability of the redesigned UI.
- **Structure**:
  - `shared`: UI primitives (wrappers around Base UI), icons (lucide-react), utils.
  - `entities`: Group, Member, Expense, Category, Transfer (data models and simple components).
  - `features`: Expense filtering, Group selection, Theme toggling, Category management.
  - `widgets`: Dashboard cards (Income Overview, Expenses Card, etc.), Global Sidebar/Menu.
  - `pages`: Dashboard, Expenses Page, My Groups, Profile.
  - `app`: Providers, global styles, router setup.

### 4. Financial Calculations
- **Decision**: Maintain all financial logic on the backend (api) per Constitution Principle III.
- **Rationale**: Prevents client-side discrepancies and ensures a "Single Source of Truth".

## Research Tasks Resolution

### Dependency Confirmation
- **Package**: `@base-ui/react` is the correct, modern package name for MUI's unstyled components.
- **Action**: Need to install it in the `frontend` workspace.

### Tailwind 4 Integration
- **Status**: Already configured in `frontend/package.json` and `vite.config.ts` using `@tailwindcss/vite`.
- **Note**: Tailwind 4 uses a CSS-first configuration, so most customization will happen in `src/index.css`.

### Base UI + Tailwind
- **Pattern**: 
  ```tsx
  <Menu.Trigger className="bg-blue-500 hover:bg-blue-600 data-popup-open:bg-blue-700 ...">
    Open
  </Menu.Trigger>
  ```
- **State Styling**: Use `data-*` attributes provided by Base UI components to apply conditional Tailwind classes.
