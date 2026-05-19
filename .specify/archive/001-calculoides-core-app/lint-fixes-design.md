# Design: API Lint Fixes and Service Refactoring

Refactor service classes to objects and fix various TypeScript lint errors in the `api` directory to improve code quality and maintainability.

## 1. Service Refactoring
Convert classes with only static methods into exported constant objects. This removes unnecessary class instantiation boilerplate and aligns with modern TypeScript patterns.

- **Target Files:**
  - `api/src/services/budget.ts`
  - `api/src/services/expense.ts`
  - `api/src/services/group.ts`
  - `api/src/services/invitation.ts`
  - `api/src/services/savings.ts`
  - `api/src/services/transfer.ts`

- **Changes:**
  - Change `export class ServiceName` to `export const ServiceName = { ... }`.
  - Remove `static` keywords from methods.
  - Remove `private constructor() {}`.
  - Ensure internal method calls use `ServiceName.methodName()` or direct name if available in the same scope.

## 2. Nullish Coalescing Fixes
Replace `||` with `??` where the intent is to provide a default for `null` or `undefined`, avoiding issues with other falsy values (like `0` or `""`).

- **Target Files:**
  - `api/src/services/budget.ts`
  - `api/src/services/invitation.ts`
  - `api/src/services/savings.ts`
  - `api/summary.ts`
  - `api/src/env.ts`
  - `api/categories.ts`
  - `api/expenses.ts`

## 3. Template Literal Expression Fixes
Ensure values in template literals are explicitly converted to strings or are guaranteed to be non-nullable to satisfy `@typescript-eslint/restrict-template-expressions`.

- **Target Files:**
  - `api/groups/transfer-ownership.ts`
  - `api/invitations.ts`
  - `api/members.ts`
  - `api/members/[id]/income.ts`
  - `api/respond-invitation.ts`
  - `api/savings.ts`
  - `api/transfer-ownership.ts`
  - `api/transfers.ts`
  - `api/src/services/invitation.ts`

## 4. Redundant Type Conversions
Remove unnecessary `Number()` calls on values that are already numbers.

- **Target File:**
  - `api/src/services/savings.ts`

## 5. Unnecessary Conditions
Remove redundant optional chaining or checks on values that are guaranteed to be non-nullish.

- **Target Files:**
  - `api/summary.ts`
  - `api/tests/integration/groups.test.ts`
  - `api/tests/integration/server.test.ts`

## 6. Test Files Refactoring (BUG-038)
Improve type safety in tests by replacing `any` with proper types and using better mocking patterns with `vi.fn`.

- **Target Files:**
  - `api/tests/integration/date-coercion.test.ts`
  - `api/tests/integration/expenses.test.ts`
  - `api/tests/integration/groups.test.ts`
  - `api/tests/integration/invitations.test.ts`
  - `api/tests/integration/savings.test.ts`
  - `api/tests/logic/group.test.ts`

- **Changes:**
  - Replace `any` with specific types from Prisma or domain interfaces.
  - Use `vi.fn<Args, Return>()`.
  - Use `Prisma.TransactionClient` for `$transaction` mocks.

## Verification Plan
- Run `npx eslint <file>` after each modification.
- Run `npm test --prefix api` to ensure no regressions in logic or tests.
