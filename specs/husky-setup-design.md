# Husky Implementation Design

## Purpose
Integrate Husky into the Turborepo monorepo to enforce code quality standards before commits and pushes. This ensures formatting, linting, type-checking, and tests are run reliably without overly slowing down the developer workflow.

## Architecture & Approach
We will use a split strategy:
- **Pre-commit**: Fast checks. Only run linting and formatting on changed files using `lint-staged`. Run monorepo-wide type checking using `turbo run typecheck`.
- **Pre-push**: Comprehensive checks. Run the full test suite using `turbo run test`.

## Components

### 1. Dependencies
- Install `husky` as a root dev dependency to manage git hooks.
- Install `lint-staged` as a root dev dependency to run scripts on staged files.

### 2. Configuration & Scripts
- **package.json (Root)**:
  - Add `"prepare": "husky"` script to ensure hooks are installed after `npm install`.
  - Add `"typecheck": "turbo run typecheck"` script.
  - Add `lint-staged` configuration to run `eslint --fix` and `prettier --write` on `*.{js,ts,tsx}` files.
- **turbo.json**:
  - Add `typecheck` pipeline task: `"typecheck": { "dependsOn": ["^typecheck"] }`.

### 3. Git Hooks
- **`.husky/pre-commit`**:
  ```bash
  npx lint-staged
  npm run typecheck
  ```
- **`.husky/pre-push`**:
  ```bash
  npm run test
  ```

## Error Handling & Edge Cases
- If `lint-staged` fails (e.g. ESLint finds unfixable errors), the commit will be blocked.
- If `typecheck` fails, the commit will be blocked.
- If tests fail, the push will be blocked. Developers can bypass via `--no-verify` if absolutely necessary, but this provides a strong default safeguard.

## Testing Strategy
- The implementation will be verified by intentionally creating a bad commit (formatting error or type error) and ensuring the pre-commit hook blocks it.
- A dummy test failure will be introduced to verify the pre-push hook blocks it.