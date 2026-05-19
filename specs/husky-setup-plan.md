# Husky Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Husky into the Turborepo monorepo to enforce code quality standards before commits and pushes.

**Architecture:** A split strategy where `pre-commit` handles fast linting/formatting (via `lint-staged`) and monorepo type-checking (via `turbo run typecheck`), while `pre-push` handles full test execution (via `turbo run test`).

**Tech Stack:** Node.js, npm, husky, lint-staged, turborepo.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install husky and lint-staged**

Run: `npm install --save-dev husky lint-staged`
Expected: Successfully added to `devDependencies` in `package.json`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(deps): install husky and lint-staged"
```

### Task 2: Configure Scripts and Turbo

**Files:**
- Modify: `package.json`
- Modify: `turbo.json`

- [ ] **Step 1: Add scripts and lint-staged config to package.json**

Modify `package.json` to include `"prepare": "husky"`, `"typecheck": "turbo run typecheck"`, and the `lint-staged` block.

```json
  "scripts": {
    "dev": "turbo run dev start:api",
    "dev:local": "turbo run dev start:api:local",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:local": "cross-env CALC_ENVIRONMENT=test-local turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
```

- [ ] **Step 2: Update turbo.json for typecheck**

Modify `turbo.json` to include `typecheck` in the pipeline.

```json
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "public/build/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
```

- [ ] **Step 3: Run npm to apply prepare script**

Run: `npm run prepare`
Expected: `.husky/_/husky.sh` exists.

- [ ] **Step 4: Commit**

```bash
git add package.json turbo.json
git commit -m "chore(config): configure husky prepare script, root typecheck, and lint-staged"
```

### Task 3: Configure Git Hooks

**Files:**
- Create: `.husky/pre-commit`
- Create: `.husky/pre-push`

- [ ] **Step 1: Create pre-commit hook**

Create `.husky/pre-commit` and make it executable.

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-commit checks..."
npx lint-staged
npm run typecheck
```

Run: `chmod +x .husky/pre-commit` (or equivalent `git add --chmod=+x` if on Windows)

- [ ] **Step 2: Create pre-push hook**

Create `.husky/pre-push` and make it executable.

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-push tests..."
npm run test
```

Run: `chmod +x .husky/pre-push`

- [ ] **Step 3: Commit**

```bash
git add .husky/pre-commit .husky/pre-push
git commit -m "ci(husky): add pre-commit and pre-push git hooks"
```

### Task 4: Verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Verify Pre-commit by making a test commit**

Add a trivial space to `package.json`, stage it, and attempt to commit.
Run: `git add package.json && git commit -m "chore: test pre-commit hook"`
Expected: Husky runs lint-staged and typecheck successfully.

- [ ] **Step 2: Verify Pre-push by doing a dry-run push**

Run: `git push --dry-run`
Expected: Husky runs `npm run test`.

- [ ] **Step 3: Clean up test commit**

Run: `git reset --soft HEAD~1` if you want to undo the test commit, or leave it.