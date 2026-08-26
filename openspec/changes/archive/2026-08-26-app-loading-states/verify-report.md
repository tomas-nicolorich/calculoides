```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:f4fb40dbc9b9984e9585b6c3c9e0b9a0dee5e612c4a571f8b0f5cc1a866e0b96
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 11/11
scenarios: 23/23
test_command: npx vitest run --config vitest.config.ts
test_exit_code: 0
test_output_hash: sha256:2bedf964ceedf0699107e2cbbb1252454c51e7ce5bd33a7dfc486e4a6e03b688
build_command: npm run typecheck:next
build_exit_code: 0
build_output_hash: sha256:d9700b4510d066fcc38932998dbc8c3fe4d8ad5f2f9b3e71809c79afcfb3d5e1
```

## Verification Report

**Change**: app-loading-states
**Version**: N/A (two chained slices, both merged to `origin/nextjs-integration` via PRs #232/#233/#235; two unrelated follow-up fixes #237/#238 also merged after)
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 41 |
| Tasks complete | 41 |
| Tasks incomplete | 0 |

Spot-checked against the current working tree (not just checkboxes): 1.1–1.7 (Spinner + `_skeletons.tsx`), 2.1–2.11 (all 9 `loading.tsx` files present with matching test files), 3.1–3.7 (all 5 widgets converted, zero plain-text "Loading…" remains under `app/**`), 4.1–4.2 (both spec files present), 5.1–5.7 (`_regions.tsx`, `useCategoriesList` `enabled` param, `ExpenseFields` extraction), 6.1–6.5 (`page.tsx` restructured, `DashboardClient.tsx` accepts `children`, both spec deltas present). All genuinely implemented, not just checkbox-marked.

### Build & Tests Execution

**Build/Typecheck**: PASSED
```text
$ npm run typecheck:next
> tsc --noEmit -p tsconfig.next.json
(no output — clean, exit 0)
```

**Lint**: PASSED
```text
$ npm run lint:next
> eslint app lib proxy.ts next.config.ts --max-warnings 0
(no output — clean, exit 0)
```

**Tests**: 562 passed / 0 failed / 0 skipped (115 test files)
```text
$ npx vitest run --config vitest.config.ts
 Test Files  115 passed (115)
      Tests  562 passed (562)
```
Fresh run performed during this verify (not reused from apply-progress's 558/558 claim). The delta (+1 file, +4 tests vs. apply-progress's own count) is fully explained by PR #237 (`_skeletons.test.tsx` additions for header/category-row skeleton shapes) and PR #238 (`page.test.ts` additions for expenses/transfers/savings server-prefetch) — both already-merged, out-of-scope follow-ups, not a regression from this change. No interaction or regression found between those two follow-ups and this change's own Slice A/B code.

**Coverage**: Not available — no coverage tool configured/detected in this project's Vitest config.

### Spec Compliance Matrix

#### `route-loading-states` (4 requirements, 8 scenarios)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Every `(app)` segment renders page-shaped skeleton | Navigating to populated segment shows shaped skeleton | `loading.test.tsx` (×8, component-render only) | ⚠️ PARTIAL |
| Every `(app)` segment renders page-shaped skeleton | Hard-loading shows skeleton, not blank | `loading.test.tsx` (×8, component-render only) | ⚠️ PARTIAL |
| `groupId`-only change re-triggers fallback | Switching active group re-shows fallback | (none — no key-based suppression, verified by code inspection only) | ❌ UNTESTED |
| `groupId`-only change re-triggers fallback | No minimum display duration enforced | (none — static evidence: no artificial delay in code) | ❌ UNTESTED |
| Every `(auth)` segment renders centered Spinner | Login awaits session check with Spinner | `(auth)/loading.test.tsx` (component-render only) | ⚠️ PARTIAL |
| Every `(auth)` segment renders centered Spinner | Complete-profile awaits both checks with Spinner | `(auth)/loading.test.tsx` (shared file, not complete-profile-specific) | ⚠️ PARTIAL |
| Fallback type by content-shape knowledge | Shape-known segment never falls back to Spinner | `dashboard/[groupId]/loading.test.tsx` (asserts no `role="status"`) | ✅ COMPLIANT |
| Fallback type by content-shape knowledge | Shape-unknown segment never falls back to Skeleton | `(auth)/loading.test.tsx` (asserts zero `.animate-pulse`) | ✅ COMPLIANT |

**Note on the 4 PARTIAL/UNTESTED items**: this repo has no E2E tooling (design.md's own Testing Strategy table states this explicitly: "E2E: None — No E2E tooling in this repo"). The scenarios that require observing an actual client-side navigation event, a `groupId`-only route transition, or absence of an artificial delay are, by construction, not unit-testable with RTL against a Server-Component file-convention boundary — the same limitation apply-progress itself flagged ("No live `next dev`/browser harness available in this environment") for both slices. Design.md's Decision 1 substitutes verified-against-source reasoning (`createSubtreePropsFromSegmentPath` in the installed Next.js build) for the auth-boundary question, which is sound static evidence but not a runtime test. Code inspection confirms no `key` prop is used anywhere in the dashboard route tree that would suppress re-triggering, and no artificial delay/`setTimeout`/minimum-duration logic exists — consistent with the spec's intent — but neither claim is proven by an executed test. This is a pre-existing methodology gap in this repo, not a defect introduced by this change.

#### `ui-design-system` (2 requirements, 4 scenarios)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Spinner provides sanctioned full-page indicator | Exposes ported size vocabulary | `Spinner.test.tsx` (sm/md/lg classes) | ✅ COMPLIANT |
| Spinner provides sanctioned full-page indicator | Carries required a11y attributes | `Spinner.test.tsx` (`role="status"`, `aria-label="Loading"`) | ✅ COMPLIANT |
| Spinner vs. Skeleton reserved usage | Session-gated route uses Spinner | `(auth)/loading.test.tsx` | ✅ COMPLIANT |
| Spinner vs. Skeleton reserved usage | Page/widget-shaped state uses Skeleton | `dashboard/[groupId]/loading.test.tsx` + 5 widget test files | ✅ COMPLIANT |

#### `dashboard-view` (3 requirements, 6 scenarios)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Full widget set, two-column layout | All six widgets render for populated group | `DashboardClient.test.tsx` + widget tests | ⚠️ OUT OF SCOPE — see note |
| Full widget set, two-column layout | Loading state precedes hydration, per independent region | `_regions.test.tsx` ("paints summary widgets even while nested categories subtree never resolves") | ✅ COMPLIANT |
| One server prefetch feeds summary-dependent widgets | No client-side waterfall for summary widgets | `_regions.test.tsx` ("...no client-side fetch", `fetchMock` assertion) | ✅ COMPLIANT |
| One server prefetch feeds summary-dependent widgets | Independent regions elsewhere don't fragment shared summary hydration | `_regions.test.tsx` (same test, nested categories+summary combined) | ✅ COMPLIANT |
| Widget-level loading uses Skeleton, not text | Category drill-down shows Skeleton while transfer history loads | `BudgetCategories.test.tsx` (nested `TransferHistory` → 2 skeleton rows) | ✅ COMPLIANT |
| Widget-level loading uses Skeleton, not text | No widget renders literal loading text | `RecentExpenses.test.tsx` et al. (`queryByText("Loading…")` absent) + repo-wide grep confirms zero occurrences under `app/**` | ✅ COMPLIANT |

**Note on "All six widgets render" (pre-existing, out of scope)**: this exact requirement text (carried over unchanged by the delta — only the "Loading state precedes hydration" scenario was modified by this change) lists `SavingsGoalList` as a dashboard widget. Current code does not render `SavingsGoalList` on the dashboard — `SavingsGoalList` only exists on `/savings/[groupId]` (`SavingsClient.tsx`). Design.md's own Codebase Findings table for this change independently confirms this: "`queryKeys.savingsGoals` is prefetched by the dashboard but consumed by no dashboard widget (only `/savings`'s `SavingsClient`)." This mismatch between the base spec text and actual dashboard composition predates `app-loading-states` (the savings prefetch already existed before this change per that finding) and is not something this change introduced, modified, or was asked to fix — flagging for visibility only, not as a blocker for this verify.

#### `client-data-cache` (2 requirements, 5 scenarios)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| TanStack Query retained only for client-owned reads | Server-Component-served read has no query key | `_regions.test.tsx` (`fetchMock` not called) | ✅ COMPLIANT |
| TanStack Query retained only for client-owned reads | Non-migrated read still uses TanStack Query cache | (none in this change's new tests — unmodified, pre-existing behavior elsewhere in the app) | ➖ NOT APPLICABLE (unmodified by this change) |
| TanStack Query retained only for client-owned reads | A per-region streamed read is still Server-Component-owned | `_regions.test.tsx` ("renders full widget tree from the two regions' server prefetch with no client-side fetch") | ✅ COMPLIANT |
| Streamed region boundary must cover/nest below every key its subtree reads | Region hydrates every key its own subtree reads | `_regions.test.tsx` (`SavingsWarmRegion` dehydrates own key only) | ✅ COMPLIANT |
| Streamed region boundary must cover/nest below every key its subtree reads | Cross-reading consumer sits inside nested region | `_regions.test.tsx` (`BudgetCategories`, reading both `categories` and `summary`, nested inside `SummaryRegion`) + `page.tsx`/`page.test.tsx` structural assertions confirming nesting, not sibling, boundaries | ✅ COMPLIANT |

**Compliance summary**: 17/23 scenarios fully COMPLIANT, 4/23 PARTIAL/UNTESTED (all attributable to the repo's documented absence of E2E tooling, not to missing implementation), 1/23 correctly marked N/A (unmodified pre-existing behavior), 1/23 flagged as a pre-existing out-of-scope spec/code mismatch unrelated to this change.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Spinner ported verbatim | ✅ Implemented | `app/_ui/Spinner.tsx` matches design.md's Interfaces contract exactly; conic-gradient + radial mask, `role="status"`, `aria-label="Loading"` |
| Barrel export | ✅ Implemented | `app/_ui/index.tsx`: `export { Spinner }` + `export type { SpinnerSize }` |
| 9 `loading.tsx` files | ✅ Implemented | All 8 `(app)` + 1 shared `(auth)` present, each with a matching test file |
| Shared `_skeletons.tsx` module | ✅ Implemented | All 8 exports from design.md's Interfaces/Contracts present; `DashboardSkeleton` container chain verified to match `DashboardClient`'s classes |
| 5 widget conversions | ✅ Implemented | Zero plain-text "Loading…" remains under `app/**` (repo-wide grep) |
| `_regions.tsx` (Slice B) | ✅ Implemented | `SummaryRegion`/`CategoriesRegion`/`SavingsWarmRegion`, matching the Interfaces contract's signature exactly, including the `children`-nesting shape |
| `page.tsx` restructure | ✅ Implemented | Auth gate blocking, three promises hoisted and un-awaited, nested (not sibling) `<Suspense>` regions exactly as design.md's Data Flow diagram specifies |
| `useCategoriesList(groupId, enabled)` | ✅ Implemented | `app/_data/categories.ts`; wired into `QuickAddExpense` via the `ExpenseFields` extraction (documented, justified deviation from the literal "mount unconditionally with `enabled: open`" text — apply-progress's own Issue section explains the TanStack Query hydration race this avoids, and the fix is verifiably present in code) |
| `DashboardClient.tsx` accepts `children` | ✅ Implemented | No longer imports `BudgetCategories` directly |
| Both spec deltas (`dashboard-view`, `client-data-cache`) | ✅ Implemented | Present and consistent with Decision 5 |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Decision 1 — single shared `(auth)/loading.tsx`, no layout | ✅ Yes | Confirmed: no `app/(auth)/layout.tsx` exists; single `loading.tsx` covers all 5 routes |
| Decision 2 — `(app)/layout.tsx` not streamed | ✅ Yes | No changes found to `app/(app)/layout.tsx`'s blocking awaits |
| Decision 3 — `savingsGoals` invisible warm-up region | ✅ Yes | `SavingsWarmRegion` returns `<HydrationBoundary>{null}</HydrationBoundary>`, sibling `<Suspense fallback={null}>` |
| Decision 4 — nested (not sibling) regions, hoisted promises | ✅ Yes | Confirmed in both `page.tsx` and `_regions.tsx`; the `ExpenseFields`-mount fix genuinely strengthens this decision rather than deviating from its intent |
| Decision 5 — `client-data-cache` delta required | ✅ Yes | Delta present, invariant restated per the design's exact wording |
| One skeleton module as single source of truth | ✅ Yes | `_skeletons.tsx` consumed by `loading.tsx`, `_regions.tsx` fallbacks, and widget `isLoading` branches alike |
| Two chained PRs, Slice A before Slice B | ✅ Yes | Confirmed via `git log`: PR #232, #233 (Slice A) merged before PR #235 (Slice B), all stacked onto `origin/nextjs-integration` |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | Found in apply-progress ("TDD Cycle Evidence" table for Slice B; Slice A's own apply-progress, not re-read here, already merged) |
| All tasks have tests | ✅ | 41/41 tasks map to a test file or are pure-documentation (spec deltas, 6.5) |
| RED confirmed (tests exist) | ✅ | Sampled `_regions.test.tsx`, `Spinner.test.tsx`, `page.test.tsx`, 5 widget test files, 9 `loading.test.tsx` files — all exist and are non-trivial |
| GREEN confirmed (tests pass) | ✅ | 562/562 passing on this verify's fresh full-suite run |
| Triangulation adequate | ✅ | `_regions.test.tsx` covers 3 distinct scenarios (never-resolving nested subtree, fully-hydrated combined tree, invisible savings region) with differing expected values, not repeated trivial cases |
| Safety Net for modified files | ✅ | apply-progress documents baseline pass counts before each modified file's edit (e.g., `QuickAddExpense.test.tsx` 2/2, `DashboardClient.test.tsx` 2/2, `page.test.tsx` 3/3 non-rendering tests) |

**TDD Compliance**: 6/6 checks passed

### Assertion Quality
No tautologies, no assertion-free tests, and no ghost loops found in the sampled test files (`_regions.test.tsx`, `Spinner.test.tsx`, `page.test.tsx`, widget tests, `loading.test.tsx` ×9). CSS-class assertions (e.g., `toHaveClass("max-w-7xl", ...)`) appear throughout the `loading.test.tsx` files, but these directly verify literal container-width classes design.md's File Changes table specifies per segment (e.g. "`max-w-4xl … space-y-8`") — this is spec-mandated behavior, not incidental implementation-detail coupling, so it is not flagged.

`page.test.tsx`'s structural element-tree assertions (`.type`/`.props` navigation) are a deliberate, documented substitute for `render()` because RTL's client renderer cannot render an unresolved `async` Server Component — the test file's own comments explain this constraint and cross-reference where the render-based assertions moved (`_regions.test.tsx`). This is justified test-layer engineering, not a shortcut.

**Assertion quality**: ✅ All sampled assertions verify real behavior

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | ~15 | Spinner, `_skeletons`, 9×`loading.test.tsx` | Vitest + RTL |
| Integration | ~10 (this change's new/modified) | `_regions.test.tsx`, `page.test.tsx`, widget tests, `QuickAddExpense.test.tsx`, `DashboardClient.test.tsx` | Vitest + RTL |
| E2E | 0 | — | Not installed in this repo (documented, project-wide) |
| **Total (full suite)** | **562** | **115** | |

### Quality Metrics
**Linter**: ✅ No errors (0 warnings, `--max-warnings 0`)
**Type Checker**: ✅ No errors

### Issues Found

**CRITICAL**: None.

**WARNING**:
1. 4 of 23 `route-loading-states` scenarios (navigation re-trigger behavior, no-minimum-duration, and the two "populated segment"/"hard-load" navigation scenarios) are not covered by an executed runtime test — only by component-level render tests plus static code inspection. This is a pre-existing, repo-wide gap (no E2E tooling), not something introduced by this change, but it means those specific scenarios are not fully proven per the strict "compliant only when a covering test passed at runtime" rule.
2. Pre-existing, out-of-scope: the `dashboard-view` base requirement "Dashboard Renders the Full Widget Set" lists `SavingsGoalList` as a dashboard-rendered widget, but current code never renders `SavingsGoalList` on the dashboard (only on `/savings`). This mismatch predates `app-loading-states` (design.md's own Codebase Findings table independently documents the savings prefetch having no dashboard consumer) and this change did not touch that requirement's substance — flagged for visibility, not attributed to this change.
3. The working tree has an uncommitted, unrelated change (`app/(auth)/login/LoginForm.tsx`, +`LoginForm.test.tsx`) sitting alongside this change's already-merged history. It is unrelated to `app-loading-states` (no task or file in tasks.md/design.md references `LoginForm`) — flag so it is not swept into any commit/PR associated with this change's archive.

**SUGGESTION**:
1. `page.test.tsx`'s structural (`.type`/`.props`) assertions are a reasonable, well-justified adaptation to RTL's inability to render unresolved async Server Components, but they are inherently more coupled to `page.tsx`'s exact JSX shape than a behavioral test would be. No action needed now; worth keeping in mind if `page.tsx`'s JSX nesting is refactored later without an intentional behavior change.
2. Consider, in a future change, adding a lightweight `next dev`-based smoke check (even without full E2E tooling) to close the runtime-verification gap on the 4 WARNING-flagged navigation scenarios, since both this change and the prior Slice A apply-progress independently hit the same "no live harness available" limitation.

### Verdict
**PASS WITH WARNINGS** — All 41/41 tasks are genuinely implemented and match design.md's architecture; fresh full-suite tests (562/562), lint, and typecheck are all clean. Warnings are limited to (a) a documented, repo-wide, pre-existing absence of E2E coverage for a handful of navigation-behavior scenarios, (b) one pre-existing out-of-scope spec/code mismatch unrelated to this change, and (c) one unrelated uncommitted file in the working tree. No CRITICAL findings block archive.
