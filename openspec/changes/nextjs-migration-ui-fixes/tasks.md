# Tasks: Next.js Migration UI Fixes

> Source of truth for scope/order: `design.md`'s Migration/Rollout PR-slice table (16 rows,
> `src`/`tests`/`Δ` columns) and its dependency graph. This file does not redo that forecast —
> it translates it into an executable, strict-TDD checklist. Every task group below matches a
> `design.md` PR row 1:1, same boundaries, same merge order.

## Review Workload Forecast

**Chained PRs recommended: Yes — already planned.** `design.md` pre-splits the ~8,571-line
total into 16 slices; this is not a new recommendation, it is confirmation the existing plan
satisfies the `chained-pr` skill's split trigger.

**Budget in effect: 800 lines/PR, not the skill's 400-line default.** SDD session preflight
sets `review_budget_lines=800` for this change, which supersedes `chained-pr`'s standard
400-line trigger. All 16 slices are assessed against **800**, not 400. Under a 400-line budget
essentially every slice below would need a further split (12 of 16 rows exceed 400); under the
800-line budget in effect, every slice fits, but several sit close enough to the ceiling to be
a real risk once tests and inevitable scope creep (missed sub-component, extra a11y test, a
mutation edge case) are added.

| PR | Unit | src | tests | Δ (of 800) | Headroom | Risk |
|---|---|---:|---:|---:|---:|---|
| 1 | `proxy.ts` rename completion + font matcher fix | 60 | 30 | **90** | 710 | Low |
| 2 | Foundations: deps, `cn.ts`, `use-is-mobile.ts`, `app/_data/**` hoist | 250 | 150 | **400** | 400 | Low |
| 3 | `_ui` atoms A: Button, Card, Input, barrel, Badge | 252 | 160 | **412** | 388 | Low |
| 4 | `_ui` atoms B: Alert, Skeleton, IconButton, ReloadButton, Logo | 317 | 150 | **467** | 333 | Low |
| 5 | `_ui` identity + money: Avatar/AvatarGroup, StatFigure, MemberBar, ProgressMeter | 493 | 220 | **713** | 87 | **Watch** |
| 6 | `_ui` overlays: Dialog, ResponsiveDialog, RowMenu, Select, IconPicker | 451 | 230 | **681** | 119 | **Watch** |
| 7 | `_ui` DatePicker | 477 | 170 | **647** | 153 | **Watch** |
| 8 | Theme (`THEME_SCRIPT` + `ThemeToggle`), `/` redirect, `signOut()` | 145 | 120 | **265** | 535 | Low |
| 9 | Nav A: `NAV_ITEMS`, `NavItemLink`, `SidebarNav`, `AppShell` rewrite, layout un-stub | 448 | 200 | **648** | 152 | **Watch** |
| 10 | Nav B: `MobileTopBar`, `MobileTabBar`, `GroupSwitcher`, `AccountMenu` | 293 | 200 | **493** | 307 | Low |
| 11 | Groups full parity: `GroupsClient` rewrite + `CreateGroupForm` | 281 | 200 | **481** | 319 | Low |
| 12 | Dashboard shell (two-column) + `RemainingBalance` + `RecentExpenses` | 424 | 180 | **604** | 196 | Med |
| 13 | `IncomeOverview` (+ income-edit mutation) + `BudgetTransfers` | 364 | 200 | **564** | 236 | Med |
| **14** | **`BudgetCategories` read/accordion (ADR-9)** | 450 | 250 | **700** | **100** | **High** |
| 15 | `BudgetCategories` mutations: CRUD dialogs + inline transfer + `by-category` history | 370 | 250 | **620** | 180 | Med |
| **16** | **`SavingsGoalList` + savings prefetch + `ExpenseForm` quick action** | 536 | 250 | **786** | **14** | **Highest** |
| | **Total** | **5,611** | **2,960** | **~8,571** | | |

**Flagged slices (closest to the 800 ceiling):**

- **PR 16** (`786`, 14 lines of headroom) — the single riskiest slice in the stack. It bundles
  two source areas (`SavingsGoalList` + `ExpenseForm`) that ADR-9's own logic (a working
  vertical seam beats a mid-file split) would apply here too if it overshoots.
- **PR 14** (`700`, 100 lines of headroom) — `BudgetCategories` is a single 801-line source
  file on `main`; ADR-9 already concluded it cannot land as one PR and pre-split it into 14
  (read) + 15 (mutations). PR 14 alone is still the largest single-widget slice in the stack.
- **Secondary watch list** (100–200 lines of headroom, worth a mid-slice line count check):
  PR 5 (713), PR 6 (681), PR 9 (648), PR 7 (647).

**Why this is a real risk, not a formality**: `persistent-navigation` — the predecessor delta
this change supersedes — overshot its own per-slice forecasts by **1.7–3.2×**. Applied
naively to PR 14 and PR 16, that historical multiplier would put actual changed lines at
**1,190–2,240** (PR 14) and **1,336–2,515** (PR 16) — 1.5–3× over the 800 budget. `sdd-apply`
MUST run `git diff --stat` against the actual diff **after the RED tests are written** (before
GREEN implementation is complete) for PR 14 and PR 16 specifically, and re-split before opening
the PR if the running total is trending past ~650–700:

- **PR 14 fallback split** (if triggered): 14a — category rows + `ProgressMeter` + empty/loading
  state; 14b — expand/collapse + per-member balance breakdown. Both are independently
  reviewable and 14b still rolls back cleanly onto 14a's working read state.
- **PR 16 fallback split** (if triggered): 16a — `SavingsGoalList` + savings prefetch
  (delegates to existing `savings-goal-management` spec, self-contained); 16b — `ExpenseForm`
  quick-action (delegates to existing expense Server Action, self-contained). These are already
  two source areas per the row's own unit description, so the split has zero new design work.

**Verification plan** (per slice, from `design.md`'s Testing Strategy table): Vitest unit
(`node` env) for pure logic, Vitest+RTL (`jsdom` env, per-file `// @vitest-environment jsdom`)
for every primitive/widget, component tests for loading/empty/error/populated states and
mutation → `invalidateQueries(queryKeys.group(id))`, integration test extending the existing
`prefetchServerClient()` pattern for server-prefetch slices, and a manual side-by-side diff
against `main`'s running app recorded in the PR body. `npm run typecheck`, `npm run lint`, and
the focused `npm test` command for the touched files are mandatory gates before every PR is
opened — none of the 16 slices carries a `size:exception`; all fit inside the 800-line budget
as forecast, so none is requested.

**Strategy (revised 2026-08-11)**: Feature-branch chain (per SDD `chain_strategy=feature-branch-chain`),
tracker branch `nextjs-migration-tracker`. `main` still holds the pre-migration Vite/Express app and
will not receive any of this stack until the full Next.js migration + these UI fixes are verified
working — so no PR in this change targets `main` directly. `nextjs-migration-tracker` was forked
from `feat/nextjs-migration-7-cleanup` after PR 1 landed directly on that branch (commit `5ec6167`,
no separate PR-1 branch was cut — it predates this strategy revision and is treated as already part
of the tracker's base). PR 2 onward: each PR is its own branch, PR 2 branches from and targets
`nextjs-migration-tracker`, and every subsequent PR branches from and targets its immediate parent
PR's branch — only `nextjs-migration-tracker` itself will eventually PR into `main`, once this
whole change plus the rest of `nextjs-migration` is verified working. Merge order within the chain
is strictly the PR number.

## Dependency Graph

Verbatim from `design.md` (binding):

```
1 (independent, unblocks CI for everything)
2 ──┬── 3 ──┐
    └── 4 ──┼── 5 ──┬── 11 (groups)
            │       ├── 12 ── 13
            └── 6 ──┼── 14 ── 15
                    └── 7 ── 16
8 ── 9 ── 10 ──────────────────► (nav must land before 11-16 render inside real chrome)
```

**Per-PR read** (interpretation for branch sequencing — the ASCII diagram above is the binding
artifact; this table exists only to make "which branch do I fork from" unambiguous):

| PR | Forks from (base branch) | Parallelizable with |
|---|---|---|
| 1 | `main` (historical — actually landed as a direct commit on `feat/nextjs-migration-7-cleanup`, `5ec6167`, before the tracker existed; no PR-1 branch/PR) | — (lands first, alone) |
| 2 | `nextjs-migration-tracker` | — |
| 3 | PR 2 | PR 4 |
| 4 | PR 2 | PR 3 |
| 5 | PR 3 + PR 4 (rebase onto both before opening) | PR 6 |
| 6 | PR 3 + PR 4 (rebase onto both before opening) | PR 5, PR 7 (after 6 merges) |
| 7 | PR 6 | PR 16 work can start once 7 merges |
| 8 | `nextjs-migration-tracker` (PR 1's commit is already in the tracker's base — see PR 1 row) | PR 2–7 branch (independent chain per the diagram) |
| 9 | PR 8 | — |
| 10 | PR 9 | — |
| 11 | PR 5, rebased onto PR 10 before opening (nav must land first — see diagram footnote) | PR 12 |
| 12 | PR 5, rebased onto PR 10 | PR 11, PR 13 after 12 merges |
| 13 | PR 12 | — |
| 14 | PR 6, rebased onto PR 10 | PR 16 work stream |
| 15 | PR 14 | — |
| 16 | PR 7, rebased onto PR 10 | PR 14/15 work stream |

If implementation surfaces a cross-branch import the diagram does not show (e.g. `AccountMenu`
wanting `Avatar` from PR 5 before PR 5 has merged), treat it as a **base bug** per the
`chained-pr` skill ("polluted diffs are base bugs: retarget or rebase") — do not silently widen
a slice's scope to route around it.

## Branch Naming (feature-branch-chain)

`feat/nextjs-ui-fixes-{NN}-{slug}`, e.g. `feat/nextjs-ui-fixes-02-foundations`,
`feat/nextjs-ui-fixes-14-budget-categories-read`. Each PR's body carries the `chained-pr`
skill's **Chain Context** section (Chain, Tracker branch: `nextjs-migration-tracker`, Position
`N of 16`, Base, Depends on, Follow-up, Review budget `Δ / 800`, Starts at, Ends with) appended
to, not replacing, the repo PR template. No PR in this chain targets `main` — every PR targets
either `nextjs-migration-tracker` (PR 2, 8) or its immediate parent PR branch, per the table above.

---

## PR 1 — Complete `middleware.ts` → `proxy.ts` rename + font matcher fix

**Spec**: `server-session-auth` — *"The Routing Proxy Refreshes the Session on Every Matched
Request"* (MODIFIED), *"Protected Segments Require a Verified Session"* (MODIFIED, matcher-
exclusion independence scenario).
**Budget**: 60 src / 30 tests / **90** total. **Depends on**: none — independent, lands first.
**Blocks**: everything (repo cannot currently `lint`/`typecheck`/`test` — `middleware.ts` is
deleted from the worktree but still tracked, while `middleware.test.ts` imports `./middleware`
and `vitest.config.ts`/`tsconfig.next.json`/`package.json` still reference it).

**Current state verified**: `proxy.ts` already exists (untracked) with the `proxy()`
function, `PUBLIC_PATHS`, and the `/api` exclusion — but its `config.matcher` still only
excludes `_next/static`, `_next/image`, `favicon.ico`, and `svg|png|jpg|webp`. No `/fonts`
prefix or font-extension exclusion yet. `middleware.test.ts` still imports `middleware` from
`./middleware`, a file that no longer exists in the worktree.

- [x] 1.1 **RED**: Rename `middleware.test.ts` → `proxy.test.ts`. Change the import to
      `import { proxy } from "./proxy"` and every `middleware(...)` call site to `proxy(...)`.
      Add two new failing cases per the `server-session-auth` spec scenarios: `GET
      /fonts/geist-variable.woff2` unauthenticated must not be matched (no redirect, matcher
      excludes it) and `/dashboard/x.woff2` unauthenticated must still redirect to `/login`
      (matcher-exclusion independence — this path does not start with `/fonts/`, so it is
      still matched and still protected). Run `npx vitest run proxy.test.ts` — confirm the two
      new cases fail (matcher doesn't yet exclude fonts, or the renamed import breaks
      collection) and the four ported cases still pass unmodified.
- [x] 1.2 **GREEN**: In `proxy.ts`, extend `config.matcher` to exclude the `/fonts` path
      prefix first, then extend the extension-suffix set to
      `svg|png|jpg|webp|woff|woff2|ttf|otf` (per ADR-8: prefix guard first, extension set
      second). Run `npx vitest run proxy.test.ts` — all six cases green.
- [x] 1.3 **REFACTOR**: Confirm no behavior change beyond the matcher string — `PUBLIC_PATHS`,
      `isApiPath`, and the redirect branch are untouched. Delete the stale tracked
      `middleware.ts` (`git rm middleware.ts`).
- [x] 1.4 Fix every remaining `middleware.ts`/`middleware` reference blocking CI:
      `vitest.config.ts` L22 (`"middleware.test.ts"` → `"proxy.test.ts"`), `tsconfig.next.json`
      L25–26 (drop `middleware.ts`/`middleware.test.ts`, add `proxy.ts`/`proxy.test.ts` if not
      already covered by an `app/**`/root glob), `package.json` L21–22 (`lint`/`lint:next`:
      `middleware.ts` → `proxy.ts`), `CONTEXT-MAP.md` (prose reference), `README.md` (three
      references: intro sentence, `SUPABASE_URL` comment, directory table row).
- [x] 1.5 Verify: `npm run typecheck`, `npm run lint`, `npm test` (full suite) all pass — this
      is the first time all three gates are green since the in-flight rename began. Manual:
      `curl -I http://localhost:3000/fonts/geist-variable.woff2` (dev server running) returns
      `200`, not `307`; browser console shows no `OTS parsing error`.
- [x] 1.6 Commit as one work unit (`fix(proxy): complete middleware→proxy rename, exclude
      fonts from matcher`); open PR 1 against `main` with Chain Context (Position 1 of 16,
      Base `main`, Depends on: none, Follow-up: PR 2).

## PR 2 — Foundations: deps, `cn.ts`, `use-is-mobile.ts`, `app/_data/**` hoist

**Spec**: no dedicated spec requirement (infrastructure prerequisite for `ui-design-system`
and `app-navigation-shell`). ADR-1, ADR-2, ADR-3 (hook scope).
**Budget**: 250 src / 150 tests / **400** total. **Depends on**: PR 1 (merged, CI green).

- [x] 2.1 Confirm the exact dependency set before installing: verify `clsx`, `tailwind-merge`,
      `lucide-react` are absent from `package.json`; resolve the Base UI package name
      (`@base-ui/react` per the proposal vs. `@base-ui-components/react`, the historically
      published name — open question, but Base UI itself is only consumed starting PR 6, so
      this task only needs to *record* the resolved name for PR 6, not install it yet). This
      is a research task, not a RED/GREEN pair.
- [x] 2.2 **RED**: Add `lib/cn.test.ts` — assert `cn("a", false && "b", "c")` merges to
      `"a c"`, and `cn("p-2", "p-4")` (conflicting Tailwind classes) resolves to `"p-4"`
      (tailwind-merge precedence, last wins). Run — fails, `lib/cn.ts` doesn't exist yet.
- [x] 2.3 **GREEN**: Install `clsx` + `tailwind-merge`; create `lib/cn.ts` exporting
      `cn(...inputs: ClassValue[])` = `twMerge(clsx(inputs))`. Test green.
- [x] 2.4 **RED**: Add `lib/hooks/use-is-mobile.test.ts` (`// @vitest-environment jsdom`) —
      stub `window.matchMedia`, assert the hook returns `true` below the breakpoint and
      `false` above it, and updates on a simulated `change` event. Run — fails, hook doesn't
      exist.
- [x] 2.5 **GREEN**: Create `lib/hooks/use-is-mobile.ts` — `matchMedia` listener hook, SSR-safe
      default (`false` until mounted, per ADR-3's "narrower scope" decision — this hook is
      only consumed by `ResponsiveDialog` later, never the shell). Test green.
      **Deviation**: implemented with `useSyncExternalStore` instead of `useState`+`useEffect`
      — `eslint-plugin-react-hooks`'s `set-state-in-effect` rule rejects the sync-on-mount
      `useEffect` pattern; `useSyncExternalStore` is React's canonical fix for exactly this
      "subscribe to a browser API, stay hydration-safe" case and keeps the same SSR-safe
      `false` default via `getServerSnapshot`.
- [x] 2.6 **RED**: Confirmed via `Grep` the actual set is **four** `queries.ts` files (dashboard,
      expenses, transfers, **and savings** — the design doc's "three" refers only to the files
      duplicating both `fetchJson` **and** `invalidateGroupQueries`; dashboard duplicates only
      `fetchJson`, no mutations). Ported the one existing dedicated test
      (`expenses/[groupId]/queries.test.ts`'s `invalidateGroupQueries` coverage) to
      `app/_data/invalidate.test.ts` against the new import path, and wrote new RED tests for
      `fetch-json.ts` and each of `summary.ts`/`categories.ts`/`expenses.ts`/`transfers.ts`/
      `savings.ts` (no dedicated per-hook tests existed before — `DashboardClient.test.tsx`
      only exercised summary/categories indirectly). All fail first (module not found).
      **Deviation**: `app/_data/members.ts` from design's File Changes row is **not** created —
      no existing route consumes a members query hook yet (`useMembers` has zero call sites);
      the file is deferred to whichever PR (13+) first needs it, avoiding a speculative empty
      module.
- [x] 2.7 **GREEN**: Created `app/_data/fetch-json.ts` and `app/_data/invalidate.ts` (dedupe),
      then `app/_data/{summary,categories,expenses,transfers,savings}.ts` re-exporting the
      hoisted hooks. Updated all four consuming route clients (`DashboardClient.tsx`,
      `ExpensesClient.tsx`, `TransfersClient.tsx`, `SavingsClient.tsx`) to import from
      `../../../_data/**`. All tests green.
- [x] 2.8 **REFACTOR**: Deleted all four now-dead route-local `queries.ts` files and the
      superseded `expenses/[groupId]/queries.test.ts` (`git rm`); confirmed via `Grep` no
      remaining `from "./queries"` / `from "../queries"` imports of the hoisted functions.
- [x] 2.9 Verify: `npm run typecheck:next`, `npm run lint:next`, `npm test` (full suite, 262
      tests) all pass. `npm run build` (production) also passes — `/dashboard/[groupId]`,
      `/expenses/[groupId]`, `/transfers/[groupId]`, `/savings/[groupId]` all compile and
      bundle cleanly against the new `app/_data/**` import paths (used as the manual-render
      proxy in this sandboxed environment; no live Supabase-backed dev server available).
- [x] 2.10 Commit + PR 2 (Position 2 of 16, Base `main` post-PR-1-merge, Depends on: PR 1,
      Follow-up: PR 3, PR 4). `size:exception` accepted by the maintainer: actual `git diff
      --stat` vs `nextjs-migration-tracker` was **1,236 changed lines** (862 insertions + 374
      deletions across 28 files, four deduped `queries.ts` files — dashboard, expenses,
      transfers, savings), exceeding the 800-line hard budget. Approved as one coherent,
      fully-tested, low-risk mechanical unit; splitting would have fragmented the atomic
      refactor for no real review benefit. Committed as `d9e3c09a6ce5c12bf78bb151604df97e3679ee9a`.

## PR 3 — `_ui` atoms A: Button, Card, Input, barrel, Badge

**Spec**: `ui-design-system` — *"Primitives Live at `app/_ui/**` and Keep Their Ported Prop
API"*, *"Button and Badge Use the Semantic Money Variant Vocabulary"*.
**Budget**: 252 src / 160 tests / **412** total. **Depends on**: PR 2. **Parallel with**: PR 4.

- [x] 3.1 **RED**: `app/_ui/Button.test.tsx` (`jsdom`) — assert the semantic variant set
      `income | balance | expense | transfer | category` each maps to its designated color
      token class (per spec scenario "An income-related action uses the income variant"), plus
      disabled/loading states and role/label a11y assertions. Fails — `Button.tsx` absent.
      **Deviation**: `main`'s `ButtonVariant` union is `balance | income | expense | transfer |
      cta | outline | ghost` — it does not include `category` (that value is Card/Badge-only
      on `main`). Testing a `category` Button variant would require inventing a variant not on
      `main`, contradicting task 3.11's "rename/invent nothing" bar and the spec's own "Prop
      names match the ported source" scenario. The suite covers the four money variants that
      exist on Button (income/balance/expense/transfer) plus its non-money variants
      (cta/outline/ghost), and disabled state (native HTML `disabled`, no distinct `loading`
      prop exists on `main`'s Button either).
- [x] 3.2 **GREEN**: Port `app/_ui/Button.tsx` verbatim from `main`'s `shared/ui/Button.tsx`
      (markup/Tailwind unchanged, per the Technical Approach's "port markup verbatim" rule),
      keeping the exact `variant` prop name/values. Test green.
- [x] 3.3 **RED**: `app/_ui/Card.test.tsx` — renders children, applies the ported card
      container classes. Fails.
- [x] 3.4 **GREEN**: Port `Card.tsx`. Green.
- [x] 3.5 **RED**: `app/_ui/Input.test.tsx` — controlled value, `onChange`, error state
      rendering (design.md notes `Input` is defined inline in `index.tsx` on `main` — confirm
      during port whether to keep it inline in the barrel or extract; either way the test
      targets the barrel's exported `Input`). Fails. Confirmed: kept inline in the barrel,
      matching `main`'s exact file layout (`main` has no dedicated error-state prop on `Input`;
      that suite tests controlled value/onChange, prefix affordance, and className merge).
- [x] 3.6 **GREEN**: Port `Input` into `app/_ui/index.tsx` (or `Input.tsx` re-exported from the
      barrel — match `main`'s exact file layout). Green.
- [x] 3.7 **RED**: `app/_ui/Badge.test.tsx` — same five-variant vocabulary assertion as Button
      (spec scenario "A transfer-related badge uses the transfer variant"). Fails. `main`'s
      `BadgeTone` union is the full `income | balance | expense | transfer | category |
      neutral` — all five money variants tested here, literally satisfying the spec.
- [x] 3.8 **GREEN**: Port `Badge.tsx`. Green.
- [x] 3.9 **RED**: `app/_ui/index.test.tsx` (barrel smoke test) — every atom ported so far
      (`Button`, `Card`, `Input`, `Badge`) is importable from `app/_ui/index.tsx` by name.
      Fails until the barrel re-exports all four.
- [x] 3.10 **GREEN**: Wire `app/_ui/index.tsx` barrel exports. Green.
- [x] 3.11 **REFACTOR**: Diff each ported component's prop names against `main`'s source one
      more time — the spec's "Prop names match the ported source" scenario is the acceptance
      bar; rename nothing. `diff` confirms `Button.tsx`, `Card.tsx`, `Badge.tsx` are
      byte-identical to `main` (modulo the `cn` import path); `Input`'s inline markup/props in
      the barrel are unchanged from `main`.
- [x] 3.12 Verify: `npm run typecheck`, `npm run lint`, `npx vitest run app/_ui`. All green (26
      tests, 5 files). Manual: no consumer exists yet to visually diff — deferred until PR 9+
      actually renders these.
- [x] 3.13 Commit + PR 3 (Position 3 of 16, Base = PR 2's branch until PR 2 merges then `main`,
      Depends on: PR 2, Follow-up: PR 5/6 rebase onto this).

## PR 4 — `_ui` atoms B: Alert, Skeleton, IconButton, ReloadButton, Logo

**Spec**: `ui-design-system` — *"Primitives Live at `app/_ui/**`..."* (same requirement,
different atoms).
**Budget**: 317 src / 150 tests / **467** total. **Depends on**: PR 2. **Parallel with**: PR 3.

- [x] 4.1 **RED**: `app/_ui/Alert.test.tsx` — variant→class mapping (info/error/success per
      `main`'s API), role="alert" a11y. Fails.

      **Deviation**: `main`'s actual `shared/ui/Alert.tsx` API is `tone?: "error" | "success"`
      (default `"error"`), not a `variant` prop and not an `info` tone — there is no `info`
      state on `main`. Ported the real `tone` API verbatim; the spec/task wording's "variant" and
      "info" do not exist in the port source and were not invented. Same "confirm against real
      source" lesson PR 3 recorded.
- [x] 4.2 **GREEN**: Port `Alert.tsx`. Green.
- [x] 4.3 **RED**: `app/_ui/Skeleton.test.tsx` — renders a placeholder with the ported
      shimmer/pulse class, accepts `className` passthrough. Fails.
- [x] 4.4 **GREEN**: Port `Skeleton.tsx`. Green.
- [x] 4.5 **RED**: `app/_ui/IconButton.test.tsx` — icon-only button, `aria-label` required prop
      enforced/tested, size variants. Fails.

      **Deviation**: `main`'s `IconButtonProps` extends `ButtonHTMLAttributes` with no override
      making `aria-label` TS-required — it is forwarded through `...props` like any native
      attribute, not runtime-enforced. Test verifies the forwarding contract (label reaches the
      rendered button) instead of inventing a required-prop enforcement `main` never had.
- [x] 4.6 **GREEN**: Port `IconButton.tsx`. Green.
- [x] 4.7 **RED**: `app/_ui/ReloadButton.test.tsx` — click fires the passed `onReload` callback,
      shows a loading spinner state while pending. Fails.

      **Deviation**: `main`'s actual `shared/ui/ReloadButton.tsx` has no `onReload` prop at all.
      Its real API is `{ queryKey: QueryKey; className?: string }` — it calls
      `useQueryClient().invalidateQueries({ queryKey })` internally via TanStack Query and shows
      the spinner while that invalidation is pending. Ported the real `queryKey`-driven API
      verbatim (test wraps in `QueryClientProvider` and spies on `invalidateQueries`), not the
      spec wording's paraphrased `onReload` callback.
- [x] 4.8 **GREEN**: Port `ReloadButton.tsx`. Green.
- [x] 4.9 **RED**: `app/_ui/Logo.test.tsx` — renders the ported brand mark/wordmark, size
      variant if `main`'s API has one. Fails.

      **Deviation**: `main`'s `LogoProps` is `{ className?: string }` only — no size variant
      exists on `main`, so none was invented.
- [x] 4.10 **GREEN**: Port `Logo.tsx`. Green.
- [x] 4.11 **GREEN (barrel)**: Add all five to the `app/_ui/index.tsx` barrel; extend the
      barrel smoke test from PR 3.

      **Note**: PR 4 forked from PR 2's branch (parallel with PR 3, not sequential), so PR 3's
      barrel/tests are not present here — `app/_ui/index.tsx` and `index.test.tsx` were built
      fresh with only PR 4's five atoms. PR 5/6 will need to merge both barrels when they rebase
      onto PR 3 *and* PR 4 (expected, out of scope for PR 4).
- [x] 4.12 **REFACTOR**: Prop-name diff against `main`, same acceptance bar as PR 3. Confirmed
      via `diff` against each `main` source: only the `cn` import path (`../../lib/cn` vs.
      `../lib/utils`, per PR 2's foundations) and comment wording differ — every prop name, type,
      and default value is verbatim. Renamed nothing.
- [x] 4.13 Verify: typecheck, lint, `npx vitest run app/_ui`. All green — 6 test files / 19
      tests passing, `tsc --noEmit -p tsconfig.next.json` clean, `eslint app lib proxy.ts
      next.config.ts --max-warnings 0` clean.
- [x] 4.14 Commit + PR 4 (Position 4 of 16, Depends on: PR 2, Follow-up: PR 5/6 rebase onto
      this too — both PR 5 and PR 6 need atoms from PR 3 *and* PR 4).

## PR 5 — `_ui` identity + money: Avatar/AvatarGroup, StatFigure, MemberBar, ProgressMeter

**Spec**: `ui-design-system` — *"Money Visualisations Render Without a Charting Library"*.
**Budget**: 493 src / 220 tests / **713** total (87 lines of headroom — watch). **Depends on**:
PR 3 + PR 4 (rebase onto both). **Parallel with**: PR 6.

- [ ] 5.1 **RED**: `app/_ui/Avatar.test.tsx` — renders initials fallback when no image URL,
      renders `<img>` when a URL is given, size variants. Fails.
- [ ] 5.2 **GREEN**: Port `Avatar.tsx`. Green.
- [ ] 5.3 **RED**: `app/_ui/AvatarGroup.test.tsx` — stacks N avatars, collapses overflow into a
      `+N` indicator past `main`'s max-visible count. Fails.
- [ ] 5.4 **GREEN**: Port `AvatarGroup.tsx`. Green.
- [ ] 5.5 **RED**: `app/_ui/money/StatFigure.test.tsx` — renders a formatted currency figure
      and label, positive/negative sign styling if `main`'s API has it. Fails.
- [ ] 5.6 **GREEN**: Port `StatFigure.tsx`. Green.
- [ ] 5.7 **RED**: `app/_ui/money/MemberBar.test.tsx` — asserts the spec scenario "Member
      income split renders as a stacked bar": given N members with income shares, renders N
      CSS segments proportioned by share, **and explicitly asserts no `<canvas>`/`<svg
      class*="recharts">`/chart-library element is present** (the spec's negative assertion:
      "no chart-library canvas/SVG component"). Fails.
- [ ] 5.8 **GREEN**: Port `MemberBar.tsx` as CSS stacked-segment divs. Green — including the
      negative chart-library assertion.
- [ ] 5.9 **RED**: `app/_ui/money/ProgressMeter.test.tsx` — spec scenario "Category progress
      renders via ProgressMeter": given a spent/budgeted ratio, renders a proportioned fill
      element via CSS/DOM only (no chart dependency), clamps at 100% for over-budget
      categories if that's `main`'s behavior (verify against source during port). Fails.
- [ ] 5.10 **GREEN**: Port `ProgressMeter.tsx`. Green.
- [ ] 5.11 **GREEN (barrel)**: Extend `app/_ui/index.tsx` and `app/_ui/money/index.tsx` (or
      equivalent) barrel exports; extend the smoke test.
- [ ] 5.12 **REFACTOR**: Prop-name diff against `main`.
- [ ] 5.13 Verify: typecheck, lint, `npx vitest run app/_ui`. **Line-count checkpoint**: run
      `git diff --stat` against the PR 2 base — if trending near 713, do not silently pad
      scope; this PR is already flagged in the Review Workload Forecast, confirm it isn't
      overshooting further before opening.
- [ ] 5.14 Commit + PR 5 (Position 5 of 16, Depends on: PR 3, PR 4, Follow-up: PR 11, PR 12,
      PR 13).

## PR 6 — `_ui` overlays: Dialog, ResponsiveDialog, RowMenu, Select, IconPicker

**Spec**: `ui-design-system` — *"`ResponsiveDialog` Is the One Sanctioned `useIsMobile()`
Consumer"*; open question on Base UI package name resolves here.
**Budget**: 451 src / 230 tests / **681** total (119 headroom — watch). **Depends on**: PR 3 +
PR 4. **Parallel with**: PR 5.

**BLOCKED (partial — see apply-progress for full report)**: 6.1–6.9 and the barrel/verify steps
for those four components are complete and green. 6.10–6.15 (IconPicker + final barrel/verify/
commit/PR) are blocked: `main`'s `IconPicker.tsx` has a hard, previously untraced dependency on
`shared/lib/categoryIcons.tsx` (486 lines — `CategoryIconTile` + `CATEGORY_ICON_GROUPS`), which
does not exist anywhere in this repo and is not budgeted/scoped in design.md's 16-PR line-count
table (design.md lines 275-298) or anywhere else in tasks.md. Porting it here would blow PR6's
681-line estimate past the 800-line review budget on its own. This is a genuine scope gap in the
original plan, not a PR6 implementation issue — needs an explicit decision (add a scoped task/PR
for `categoryIcons.tsx`, most naturally alongside the category-CRUD work in PR 14/15) before
6.10 can proceed.

- [x] 6.1 Resolve and install the Base UI package (verify exact published name — `@base-ui/react`
      vs `@base-ui-components/react` — and current version before this task's GREEN steps;
      this is the design.md open question explicitly scoped to block only this PR). Confirmed
      `@base-ui/react@1.7.0` still current via `npm view`; installed.
- [x] 6.2 **RED**: `app/_ui/Dialog.test.tsx` — Fails. **DEVIATION**: `main`'s `Dialog.tsx` does
      NOT wrap Base UI's Dialog primitive — it only exports `DialogFooter`, a layout helper. The
      controlled `open`/focus-trap/Escape/backdrop-click behavior described in this task's
      original wording actually lives on `ResponsiveDialog.tsx` (task 6.4/6.5) and `DatePicker.tsx`
      (PR 7), both of which consume `@base-ui/react/dialog` directly. Ported `DialogFooter`
      verbatim instead of inventing a `Dialog` wrapper `main` never had; the controlled-open/
      focus-trap/Escape/backdrop behavior is instead covered by `ResponsiveDialog.test.tsx`.
- [x] 6.3 **GREEN**: Port `Dialog.tsx` (`DialogFooter`) verbatim. Green (3/3).
- [x] 6.4 **RED**: `app/_ui/ResponsiveDialog.test.tsx` (`jsdom`, stub `matchMedia`) — spec
      scenarios "Desktop opens a centered dialog" and "Mobile opens a bottom sheet". Fails.
- [x] 6.5 **GREEN**: Port `ResponsiveDialog.tsx`, consuming `lib/hooks/use-is-mobile.ts` from
      PR 2 (the one sanctioned non-shell consumer, per ADR-3 and the spec's own requirement
      title). Green (5/5). **DEVIATION**: `main` derives desktop/mobile from its own
      `useMediaQuery("(min-width: 768px)")` hook (not ported into this repo). This port uses
      `useIsMobile()` and derives `isDesktop = !useIsMobile()` — `useIsMobile()` has inverted
      boolean semantics (`true` below the 767px breakpoint) vs `main`'s `isDesktop` hook, but the
      768px boundary and resulting layout are unchanged. Also discovered: Base UI 1.7's
      `Dialog.Root` `onOpenChange` callback receives a second `eventDetails` argument
      (`{ reason: "escape-key", ... }`) alongside the boolean — confirmed real via the Escape
      test, not assumed.
- [x] 6.6 **RED**: `app/_ui/RowMenu.test.tsx` — opens a menu of row actions, keyboard
      navigable, closes on selection/outside-click. Fails.
- [x] 6.7 **GREEN**: Port `RowMenu.tsx` verbatim. Green (4/4).
- [x] 6.8 **RED**: `app/_ui/Select.test.tsx` — controlled value, option list render, keyboard
      select. Fails.
- [x] 6.9 **GREEN**: Port `Select.tsx` on Base UI's Select primitive verbatim. Green (6/6).
      **DISCOVERY**: Base UI 1.7's `Select.Item` only commits a selection once the item has been
      pointer-highlighted (`pointerMove`) first — a bare `click` on a non-highlighted item is a
      no-op in jsdom. Tests use a `pointerMove` → `pointerDown` → `pointerUp` → `click` sequence
      to mirror real mouse behavior; this is a test-harness detail, not a production deviation.
- [ ] 6.10 **RED**: `app/_ui/IconPicker.test.tsx` — BLOCKED, see note above. Not started.
- [ ] 6.11 **GREEN**: Port `IconPicker.tsx`. BLOCKED, see note above. Not started.
- [ ] 6.12 **GREEN (barrel)**: Extend barrel exports + smoke test. DialogFooter, ResponsiveDialog,
      RowMenu, Select are exported and smoke-tested (barrel + full `app/_ui` suite: 67/67 green).
      IconPicker export withheld — blocked, see note above.
- [x] 6.13 **REFACTOR**: Prop-name diff against `main` — for the four completed components,
      confirmed unrenamed (see per-task deviation notes above for the two intentional exceptions:
      `Dialog.tsx` ports `DialogFooter` only, `ResponsiveDialog` swaps its media-query hook).
- [ ] 6.14 Verify: typecheck, lint, `npx vitest run app/_ui`. Line-count checkpoint (same as
      PR 5 — this row is flagged "Watch"). Typecheck/lint/tests all green for what exists
      (67/67); checkpoint not finalized pending 6.10/6.11 resolution.
- [ ] 6.15 Commit + PR 6 (Position 6 of 16, Depends on: PR 3, PR 4, Follow-up: PR 7, PR 14). NOT
      opened — work committed to `feat/nextjs-ui-fixes-06-ui-overlays` pending the IconPicker
      scope decision.

## PR 7 — `_ui` DatePicker

**Spec**: `ui-design-system` — *"Primitives Live at `app/_ui/**`..."* (DatePicker is the
largest single primitive, 477 lines — isolated into its own slice for that reason).
**Budget**: 477 src / 170 tests / **647** total (153 headroom — watch). **Depends on**: PR 6.

- [ ] 7.1 **RED**: `app/_ui/DatePicker.test.tsx` — controlled selected-date value, month
      navigation, keyboard arrow-key date navigation, min/max date bounds if `main`'s API has
      them, `onChange` fires with the selected date. Fails.
- [ ] 7.2 **GREEN**: Port `DatePicker.tsx` verbatim (largest single primitive — port
      incrementally, re-running the test file after each sub-piece rather than writing all 477
      lines before the first test run).
- [ ] 7.3 **RED**: add a11y assertions if not already covered — `role="grid"`/date-cell
      labeling, focus management on open. Fails if missing.
- [ ] 7.4 **GREEN**: close any a11y gaps found in 7.3.
- [ ] 7.5 **GREEN (barrel)**: Add to barrel + smoke test.
- [ ] 7.6 **REFACTOR**: Prop-name diff against `main`.
- [ ] 7.7 Verify: typecheck, lint, `npx vitest run app/_ui/DatePicker.test.tsx`. This closes
      out the `_ui` layer — run the full `app/_ui/**` suite once here as a layer-complete
      checkpoint.
- [ ] 7.8 Commit + PR 7 (Position 7 of 16, Depends on: PR 6, Follow-up: PR 16 — `ExpenseForm`
      needs `DatePicker`).

## PR 8 — Theme (`THEME_SCRIPT` + `ThemeToggle`), `/` redirect, `signOut()` action

**Spec**: `theme-preference` (all 4 requirements), `app-navigation-shell` — *"Root Route
Redirects Based on Session State"*, *"Account Menu Exposes Identity and Sign-Out"* (the
`signOut()` action half only — `AccountMenu`'s UI lands in PR 10).
**Budget**: 145 src / 120 tests / **265** total. **Depends on**: PR 1 (independent of the
`_ui` branch per the dependency diagram).

- [ ] 8.1 **Open question to resolve first**: read `main`'s
      `frontend/src/features/theme-toggle/ui/ThemeToggle.tsx` for the exact `localStorage` key
      it uses (design.md assumes `"theme"` but flags this as unconfirmed) — the spec's
      "Pre-migration stored value is honored" scenario depends on using the *exact* key.
- [ ] 8.2 **RED**: `app/_theme/theme-script.test.ts` (`node` env) — `THEME_SCRIPT` is a string
      containing logic that reads the resolved `localStorage` key and sets `.dark` on
      `document.documentElement` before paint; assert the string content, not runtime
      execution (it's injected as a raw script tag). Fails.
- [ ] 8.3 **GREEN**: Write `app/_theme/theme-script.ts` exporting `THEME_SCRIPT`. Green.
- [ ] 8.4 **RED**: `app/_theme/ThemeToggle.test.tsx` (`jsdom`) — spec scenarios "Toggling to
      dark mode" (adds `.dark` to `<html>`), "Toggling back to light mode" (removes it),
      "Preference survives a reload" (writes to the resolved `localStorage` key), "First-ever
      visit with no stored preference" (falls back to a default, does not write to storage
      until first interaction), "OS preference changes after a manual choice is already
      stored" (assert the applied theme does NOT change after a manual choice is stored, even
      if a stubbed `matchMedia` "change" fires). Fails.
- [ ] 8.5 **GREEN**: Port `ThemeToggle.tsx` (direct port per the proposal's Approach table —
      pure `localStorage` + `.dark` toggle, zero router/data coupling). Green on all five
      scenarios.
- [ ] 8.6 **RED**: `app/layout.test.tsx` (extend or create) — asserts `<html>` carries
      `suppressHydrationWarning` and `<head>` contains an inline `<script>` whose content is
      `THEME_SCRIPT`, positioned before `<body>`. Fails.
- [ ] 8.7 **GREEN**: Wire `app/layout.tsx`: inline the script via `dangerouslySetInnerHTML`
      (the sanctioned use for a static, non-user-controlled string), add
      `suppressHydrationWarning` to `<html>`, add `font-sans` to `<body>` per the File Changes
      row. Green.
- [ ] 8.8 **RED**: `app/page.test.tsx` — spec scenarios "Signed-in user visits `/`" (redirects
      to `/groups`) and "Signed-out user visits `/`" (redirects to `/login`), replacing the
      current placeholder-shell-online message assertion. Fails — `app/page.tsx` still renders
      the placeholder.
- [ ] 8.9 **GREEN**: Rewrite `app/page.tsx` as a Server Component: `getUser()` → redirect
      branch. Green.
- [ ] 8.10 **RED**: `lib/actions/session.test.ts` — extend for the new `signOut()` export:
      spec scenario "Signing out clears the session and redirects" (calls
      `supabase.auth.signOut()` then `redirect("/login")`) and "Sign-out invalidates the server
      session, not just the browser store" (assert it's the server-side `supabase.auth.signOut()`
      call, not a client-only path — mock and assert the call happened). Fails — `signOut`
      doesn't exist in `lib/actions/session.ts` yet (current file only has
      `getAuthenticatedUserId`).
- [ ] 8.11 **GREEN**: Add `"use server"` `signOut()` to `lib/actions/session.ts` per ADR-6.
      Green.
- [ ] 8.12 **REFACTOR**: Confirm `signOut()` matches the existing file's style (same
      `createClient()` import, same error-handling convention as
      `getAuthenticatedUserId`/other `lib/actions/*.ts` files).
- [ ] 8.13 Verify: typecheck, lint, `npx vitest run app/_theme app/page.test.tsx
      app/layout.test.tsx lib/actions/session.test.ts`. Manual: toggle theme, hard-reload,
      confirm no flash (dev server); visit `/` signed-in and signed-out, confirm both
      redirects.
- [ ] 8.14 Commit + PR 8 (Position 8 of 16, Depends on: PR 1, Follow-up: PR 9).

## PR 9 — Nav A: `NAV_ITEMS`, `NavItemLink`, `SidebarNav`, `AppShell` rewrite, layout un-stub

**Spec**: `app-navigation-shell` — *"Persistent Shell Renders via CSS-First Responsive
Branching"* (desktop half), *"`children` Reaches the Shell as a Prop, Never an Import"*,
*"Active Group Is Derived From the URL, Not a Context"* (href-construction half), *"Group
Switcher Lists the User's Real Groups"* (the `getGroupNames()` un-stub half — `GroupSwitcher`
UI itself is PR 10).
**Budget**: 448 src / 200 tests / **648** total (152 headroom — watch). **Depends on**: PR 8.

- [ ] 9.1 **RED**: `app/(app)/_nav/navItems.test.ts` (`node`) — spec scenario "Members nav item
      builds a query-string href": given `groupId = "abc123"`, the Members `NavItem.href(...)`
      produces `/members?groupId=abc123`, not `/members/abc123`; every other item's `href`
      builds a plain `/segment/[groupId]` path or a static path per `requiresGroup`. Fails —
      `navItems.ts` doesn't exist.
- [ ] 9.2 **GREEN**: Create `app/(app)/_nav/navItems.ts` — `NavItem` interface with `href` as a
      **function** (per the Interfaces/Contracts block, ADR-5's route-shape trap), populate
      `NAV_ITEMS` for dashboard/expenses/transfers/savings/members/groups. Green.
- [ ] 9.3 **RED**: `app/(app)/_nav/NavItemLink.test.tsx` (`jsdom`) — renders a `next/link`,
      marks itself active via `usePathname()` match, hidden when `requiresGroup` is true and no
      `groupId` is resolvable (spec scenario "No active group hides group-scoped nav items").
      Fails.
- [ ] 9.4 **GREEN**: Create `NavItemLink.tsx`. Green.
- [ ] 9.5 **RED**: `app/(app)/_nav/SidebarNav.test.tsx` — renders `NAV_ITEMS` as
      `NavItemLink`s, carries `hidden md:flex` (CSS-first branching, ADR-3 — never a JS
      `useIsMobile()` gate in the shell). Fails.
- [ ] 9.6 **GREEN**: Create `SidebarNav.tsx`. Green.
- [ ] 9.7 **RED**: `app/(app)/AppShell.test.tsx` — rewrite for the real shell: spec scenario
      "Desktop viewport shows the sidebar tree" (sidebar visible via `hidden md:flex`, mobile
      trees `md:hidden` even though this PR doesn't yet build the mobile trees — assert the
      *desktop* tree renders and any placeholder-for-mobile slot is `md:hidden`) and "Page
      content server-renders independently of the shell" (spec scenario — `children` arrives
      as a prop; assert the component signature takes `children: ReactNode` as a prop, never
      an internal import of a page module). Fails — current `AppShell` is the placeholder
      header.
- [ ] 9.8 **GREEN**: Rewrite `app/(app)/AppShell.tsx` per ADR-4: `"use client"`, accepts
      `{ groups, user, children }` per the Interfaces/Contracts `ShellGroup`/`ShellUser`
      shapes, renders `SidebarNav` inside `hidden md:flex`. (Mobile top/tab bar slots are
      stubbed or omitted here — PR 10 fills them in; do not build dead mobile markup ahead of
      its own components landing, matching the same "avoid dead links" precedent the current
      placeholder's own doc comment already established.)
- [ ] 9.9 **RED**: `app/(app)/layout.test.tsx` — extend for the un-stub: asserts
      `GroupService.getGroupsForUser(user.id)` and `UserService.getUser(user.id)` are called
      (spec scenario "Switcher lists the signed-in user's groups" — 2 groups → both passed to
      `AppShell`), replacing the current `getGroupNames()` stub that always resolves `[]`.
      Fails.
- [ ] 9.10 **GREEN**: Rewrite `app/(app)/layout.tsx`: drop the local `getGroupNames()` stub,
      call `GroupService.getGroupsForUser(user.id)` + `UserService.getUser(user.id)`, pass
      `{ groups, user }` into `AppShell`. Green.
- [ ] 9.11 **REFACTOR**: Confirm `AppShell`'s new prop shape matches the
      Interfaces/Contracts block exactly (`ShellGroup { id, name }`, `ShellUser { id, name,
      email }`).
- [ ] 9.12 Verify: typecheck, lint, `npx vitest run app/(app)/_nav app/(app)/AppShell.test.tsx
      app/(app)/layout.test.tsx`. Manual: desktop viewport shows sidebar with real group names
      (no more placeholder `groupNames.join(", ")` span); active nav item highlighted per
      route.
- [ ] 9.13 Commit + PR 9 (Position 9 of 16, Depends on: PR 8, Follow-up: PR 10).

## PR 10 — Nav B: `MobileTopBar`, `MobileTabBar`, `GroupSwitcher`, `AccountMenu`

**Spec**: `app-navigation-shell` — *"Persistent Shell Renders via CSS-First Responsive
Branching"* (mobile half), *"Active Group Is Derived From the URL, Not a Context"*
(`GroupSwitcher`'s `useParams`/`usePathname` half), *"Account Menu Exposes Identity and
Sign-Out"* (UI half — wires PR 8's `signOut()`), *"Group Switcher Lists the User's Real
Groups"* (UI half).
**Budget**: 293 src / 200 tests / **493** total. **Depends on**: PR 9.

- [ ] 10.1 **RED**: `app/(app)/_nav/MobileTopBar.test.tsx` — renders brand + group switcher
      slot, `md:hidden`. Fails.
- [ ] 10.2 **GREEN**: Create `MobileTopBar.tsx`. Green.
- [ ] 10.3 **RED**: `app/(app)/_nav/MobileTabBar.test.tsx` — renders `NAV_ITEMS.filter(item =>
      item.showInTabBar)` as bottom-fixed tabs, `md:hidden`, active tab highlighted. Fails.
- [ ] 10.4 **GREEN**: Create `MobileTabBar.tsx`. Green.
- [ ] 10.5 **GREEN (wire)**: Update `AppShell.tsx` to render `MobileTopBar` + `MobileTabBar`
      inside `md:hidden` wrappers alongside the PR 9 desktop tree — re-run PR 9's
      `AppShell.test.tsx` "Desktop viewport shows the sidebar tree" / add "Mobile viewport
      shows the top/tab bar tree" (spec scenario) as a new RED case first, then satisfy it.
- [ ] 10.6 **RED**: `app/(app)/_nav/GroupSwitcher.test.tsx` — spec scenario "Dashboard route
      derives groupId from the path segment": given path `/dashboard/abc123`, resolves active
      group via `useParams<{ groupId?: string }>()` with `usePathname()` fallback; lists all
      groups from the `groups` prop (spec scenario "Switcher lists the signed-in user's
      groups"). Fails.
- [ ] 10.7 **GREEN**: Create `GroupSwitcher.tsx` per ADR-5. Green.
- [ ] 10.8 **RED**: `app/(app)/_nav/AccountMenu.test.tsx` — renders `user.name`/`user.email`
      from props; spec scenario "Signing out clears the session and redirects" — selecting
      "Sign out" calls the PR 8 `signOut()` Server Action (mock and assert the call, not the
      Server Action's own internals — those are covered by PR 8's test). Fails.
- [ ] 10.9 **GREEN**: Create `AccountMenu.tsx`, wiring PR 8's `signOut()`. Green.
- [ ] 10.10 **REFACTOR**: Confirm `AppShell` composes all six nav pieces
      (`SidebarNav`/`MobileTopBar`/`MobileTabBar`/`NavItemLink`/`GroupSwitcher`/`AccountMenu`)
      per the Data Flow diagram; no leftover placeholder markup remains.
- [ ] 10.11 Verify: typecheck, lint, `npx vitest run app/(app)/_nav app/(app)/AppShell.test.tsx`.
      Manual: mobile viewport (devtools responsive mode) shows top bar + tab bar, no sidebar;
      switch groups via the switcher and confirm route changes; sign out and confirm redirect
      to `/login` plus that a subsequent protected-route request also redirects (spec's
      "invalidates the server session" scenario, manually).
- [ ] 10.12 Commit + PR 10 (Position 10 of 16, Depends on: PR 9, Follow-up: PR 11–16, all of
      which render inside the now-real chrome for the first time).

## PR 11 — Groups full parity (ADR-0008): `GroupsClient` rewrite + `CreateGroupForm`

**Spec**: `groups-view` (all 3 requirements).
**Budget**: 281 src / 200 tests / **481** total. **Depends on**: PR 5 (money/identity
primitives), rebased onto PR 10 (real chrome).

- [ ] 11.1 **RED**: `app/(app)/groups/GroupsClient.test.tsx` — rewrite for parity: spec
      scenario "Populated list shows role and member count" (group card renders name, role
      string, `"N members"`, and asserts it's built from `app/_ui` `Card` — not the current
      plain `<li>`/`<Link>` markup) and "Empty state for a user with no groups" (renders an
      empty state with a path to create a group, replacing the current bare
      `"You are not part of any groups yet."` paragraph). Fails — current implementation is
      the lean plain-Tailwind version (its own doc comment confirms this).
- [ ] 11.2 **GREEN**: Rewrite `GroupsClient.tsx` using `app/_ui` `Card` (and any other ported
      atoms `main`'s `GroupsPage.tsx` uses) for the list; add an empty-state component. Green.
- [ ] 11.3 **RED**: `app/(app)/groups/_components/CreateGroupForm.test.tsx` — spec scenario
      "Successful creation adds the group to the list" (valid submit → `create` resolves →
      new group appears without a full reload) and "Server-side validation error surfaces
      inline" (`create` returns `{ ok: false, error }` → error renders inline, no group added).
      Fails — `CreateGroupForm` doesn't exist yet (creation is currently inlined in
      `GroupsClient` with raw `<input>`/`<button>`).
- [ ] 11.4 **GREEN**: Extract `CreateGroupForm.tsx` using `app/_ui` `Input`/`Button`, wired to
      the existing `lib/actions/group.ts` `create` action (already exists — no new Server
      Action needed). Green.
- [ ] 11.5 **RED**: extend `GroupsClient.test.tsx` — spec scenario "Selecting a group navigates
      to its dashboard": group card for `abc123` uses `next/link` to `/dashboard/abc123`.
      Already true in the current implementation (`Link href={...dashboard/${group.id}}`) —
      confirm this still holds post-rewrite rather than assuming; write the assertion, run,
      confirm it passes without new production code (documents behavior that must survive the
      rewrite, not a new feature).
- [ ] 11.6 **REFACTOR**: Replace `GroupsClient`'s inline creation state/handler with
      `CreateGroupForm` usage; remove now-dead inline form markup and `useState` for
      `name`/`error`/`loading` that moved into the extracted component.
- [ ] 11.7 Verify: typecheck, lint, `npx vitest run app/(app)/groups`. Manual side-by-side vs
      `main`'s `/groups`: card layout, role/count text, empty state, create flow, inline
      validation error.
- [ ] 11.8 Commit + PR 11 (Position 11 of 16, Depends on: PR 5, PR 10, Follow-up: none — leaf
      slice).

## PR 12 — Dashboard shell (ADR-0003 two-column) + `RemainingBalance` + `RecentExpenses`

**Spec**: `dashboard-view` — *"Dashboard Renders the Full Widget Set in a Two-Column Layout"*
(shell + loading-state half), *"One Server Prefetch Feeds the Summary-Dependent Widgets"*
(the `summary`+`categories` half — `savingsGoals` prefetch is added in PR 16), *"Recent
Expenses and Quick-Add Share the Same Invalidation Contract"* (`RecentExpenses` half — the
`ExpenseForm` quick-action half is PR 16).
**Budget**: 424 src / 180 tests / **604** total. **Depends on**: PR 5, rebased onto PR 10.

- [ ] 12.1 **RED**: `app/(app)/dashboard/[groupId]/DashboardClient.test.tsx` — rewrite for the
      two-column shell: spec scenario "Loading state precedes hydration" (each widget slot
      shows its own loading state, not one page-level spinner — replace the current
      `summaryLoading || categoriesLoading` combined early-return). Fails against the current
      lean placeholder.
- [ ] 12.2 **GREEN**: Rewrite `DashboardClient.tsx`'s outer structure into the ADR-0003
      two-column layout with named widget slots (six slots total; four are stubs/placeholders
      until PR 13–16 land — this PR fills `RemainingBalance` and `RecentExpenses` only, per
      its own row). Each slot owns its own loading boundary.
- [ ] 12.3 **RED**: `app/(app)/dashboard/[groupId]/_widgets/RemainingBalance.test.tsx` —
      loading / empty / error / populated states, reads from the hydrated `summary` query
      (`queryKeys.summary(groupId)`) with no client-side initial fetch (spec scenario "No
      client-side waterfall for summary-backed widgets" — assert via a mocked fetch spy that
      it is never called on mount when the cache is pre-hydrated). Fails.
- [ ] 12.4 **GREEN**: Port `RemainingBalance.tsx`. Green.
- [ ] 12.5 **RED**: `app/(app)/dashboard/[groupId]/_widgets/RecentExpenses.test.tsx` — same
      four-state coverage; renders the group's most recent expenses from `summary.recentExpenses`
      (per the target-seam inventory — `SummaryService.getGroupSummary` already returns
      `recentExpenses`). Fails.
- [ ] 12.6 **GREEN**: Port `RecentExpenses.tsx` (read-only in this PR — the quick-add form is
      PR 16's scope). Green.
- [ ] 12.7 **RED**: `app/(app)/dashboard/[groupId]/page.test.tsx` — extend: asserts both
      `queryKeys.summary(groupId)` and `queryKeys.categories(groupId)` are prefetched and
      dehydrated (the current page already prefetches both — confirm this survives, then add
      the "no client waterfall" integration assertion extending the
      `prefetchServerClient()` pattern per the Testing Strategy table). Fails only on the new
      integration assertion.
- [ ] 12.8 **GREEN**: Confirm/adjust `page.tsx`'s existing prefetch (already correct per the
      code read during design) satisfies the new integration test.
- [ ] 12.9 **REFACTOR**: Confirm all four "spec scenario: All six widgets render for a
      populated group" widgets present so far (`RemainingBalance`, `RecentExpenses` — two of
      six; the remaining four land in PR 13/14/16) are composed inside the two-column grid at
      their designated ADR-0003 positions, not appended ad hoc.
- [ ] 12.10 Verify: typecheck, lint, `npx vitest run app/(app)/dashboard`. Manual: two-column
      layout matches `main`'s `DashboardPage` visually for the two widgets present; empty
      widget slots render as clean placeholders, not broken layout.
- [ ] 12.11 Commit + PR 12 (Position 12 of 16, Depends on: PR 5, PR 10, Follow-up: PR 13).

## PR 13 — `IncomeOverview` (+ income-edit mutation) + `BudgetTransfers`

**Spec**: `dashboard-view` — widget-set requirement (two more of six), *"Budget Transfers
Support Inline Creation and Per-Category History"* (the standalone widget's own inline-creation
half — the accordion drill-down half is PR 15).
**Budget**: 364 src / 200 tests / **564** total. **Depends on**: PR 12.

- [ ] 13.1 **RED**: `_widgets/IncomeOverview.test.tsx` — four-state coverage; renders each
      member's income via `MemberBar` (spec `ui-design-system` "Member income split renders as
      a stacked bar" — this is the first real consumer of that primitive); an income-edit
      action uses `Button variant="income"` (spec `ui-design-system` "An income-related action
      uses the income variant"). Fails.
- [ ] 13.2 **GREEN**: Port `IncomeOverview.tsx`. Green.
- [ ] 13.3 **RED**: extend `IncomeOverview.test.tsx` — income-edit mutation: submitting a new
      income value calls `lib/actions/member.ts` `updateIncome`, and on success invalidates
      `queryKeys.group(groupId)` (dashboard-view's general invalidation contract). Fails.
- [ ] 13.4 **GREEN**: Wire the income-edit form to `updateIncome`, `onSuccess` →
      `invalidateQueries(queryKeys.group(groupId))`. Green.
- [ ] 13.5 **RED**: `_widgets/BudgetTransfers.test.tsx` — four-state coverage; a status badge
      uses `Badge variant="transfer"` (spec `ui-design-system` "A transfer-related badge uses
      the transfer variant" — this is the first real consumer); spec scenario "Creating a
      transfer invalidates the group cache": valid inline transfer submission calls
      `lib/actions/transfer.create`, and on success `queryKeys.group(groupId)` invalidates so
      `BudgetTransfers`/`RemainingBalance` both reflect the new transfer (write this as two
      assertions: the widget's own list re-renders, and a companion assertion/spy confirms
      `RemainingBalance`'s query key was invalidated too). Fails.
- [ ] 13.6 **GREEN**: Port `BudgetTransfers.tsx` with its own inline creation form → `transfer.create`.
      Green.
- [ ] 13.7 **REFACTOR**: Confirm `IncomeOverview` and `BudgetTransfers` slot into the two-column
      grid PR 12 established, at their ADR-0003 positions.
- [ ] 13.8 Verify: typecheck, lint, `npx vitest run app/(app)/dashboard`. Manual: income edit
      persists and reflects across widgets; inline transfer creation updates both
      `BudgetTransfers` and `RemainingBalance` without reload.
- [ ] 13.9 Commit + PR 13 (Position 13 of 16, Depends on: PR 12, Follow-up: none — leaf
      slice within the dashboard chain; PR 14–16 branch from PR 7/PR 10, not from PR 13).

## PR 14 — `BudgetCategories` read/accordion (ADR-9) — **flagged, highest-risk-of-two**

**Spec**: `dashboard-view` — *"BudgetCategories Renders an Accordion With Per-Member
Balances"*.
**Budget**: 450 src / 250 tests / **700** total (100 headroom — **High** risk per the Review
Workload Forecast). **Depends on**: PR 6, rebased onto PR 10.

**Line-count discipline for this slice**: run `git diff --stat` after task 14.1 (RED tests
written) and again after each GREEN step. If the running total crosses ~600 before all tasks
below are done, stop and apply the PR 14a/14b fallback split from the Review Workload Forecast
rather than opening an over-budget PR.

- [ ] 14.1 **RED**: `_widgets/BudgetCategories.test.tsx` — spec scenario "Zero categories
      renders an empty state, not an error": empty `categories` array renders an empty state,
      throws nothing. Loading state renders independently of other widgets (per the shared
      "Loading state precedes hydration" requirement). Fails against the placeholder (current
      `DashboardClient` only renders a flat `<ul>` of category names, no accordion).
- [ ] 14.2 **GREEN**: Create `BudgetCategories.tsx` skeleton: reads `categories` from the
      hydrated `queryKeys.categories(groupId)` cache (already prefetched by `page.tsx`),
      renders empty/loading states. Green.
- [ ] 14.3 **RED**: extend — each populated category row renders a `ProgressMeter` (spec
      `ui-design-system` "Category progress renders via ProgressMeter" — first real consumer)
      showing spent/budgeted ratio. Fails.
- [ ] 14.4 **GREEN**: Render category rows with `ProgressMeter`. Green.
- [ ] 14.5 **RED**: spec scenario "Expanding a category row shows per-member balances": row is
      collapsed by default, expand/collapse toggles, per-member balance rows render beneath an
      expanded row using the per-member balance data `BudgetService.listCategoriesWithBalances`
      already returns (per the target-seam inventory). Fails.
- [ ] 14.6 **GREEN**: Implement expand/collapse (accordion) state and per-member balance row
      rendering. Green.
- [ ] 14.7 **REFACTOR**: Confirm no create/edit/delete/transfer-history affordances leak into
      this PR — ADR-9's seam is strictly read-only here; anything mutation-shaped belongs in
      PR 15.
- [ ] 14.8 Verify: typecheck, lint, `npx vitest run app/(app)/dashboard`. Manual: accordion
      expand/collapse, progress bars, empty state, side-by-side vs `main`'s read-only
      rendering. **Final line-count check**: confirm the merged diff is at or under 700; if
      over, apply the 14a/14b split now, before opening the PR, not after review starts.
- [ ] 14.9 Commit + PR 14 (Position 14 of 16, Depends on: PR 6, PR 10, Follow-up: PR 15 — "a
      clean rollback boundary" per ADR-9, this PR must be independently revertable to a working
      state).

## PR 15 — `BudgetCategories` mutations: CRUD dialogs + inline transfer + `by-category` history

**Spec**: `dashboard-view` — *"BudgetCategories Mutations Invalidate the Group Cache"*,
*"Budget Transfers Support Inline Creation and Per-Category History"* (the accordion
drill-down half).
**Budget**: 370 src / 250 tests / **620** total. **Depends on**: PR 14.

- [ ] 15.1 **RED**: extend `BudgetCategories.test.tsx` — spec scenario "Creating a category
      refreshes dependent widgets": create-category dialog submit → `lib/actions/category.ts`
      `create` resolves → `queryKeys.group(groupId)` invalidates → `BudgetCategories` (and any
      widget reading category data) reflects the new category. Fails.
- [ ] 15.2 **GREEN**: Add create-category dialog using `ResponsiveDialog` + `IconPicker` +
      `Input` (from PR 6/PR 3), wired to `category.create`, `onSuccess` →
      `invalidateQueries(queryKeys.group(groupId))`. Green.
- [ ] 15.3 **RED**: extend — update-category dialog: same dialog/action pattern for
      `category.update`. Fails.
- [ ] 15.4 **GREEN**: Wire update dialog. Green.
- [ ] 15.5 **RED**: spec scenario "Deleting a category is confirmed before the call fires": row
      menu (`RowMenu` from PR 6) offers delete; a confirmation step precedes the
      `deleteCategory` call — a single click on the row-menu item does NOT itself call
      `deleteCategory` (assert the action is not called until a second, explicit confirm
      step). Fails.
- [ ] 15.6 **GREEN**: Wire delete with a confirmation step (e.g. `Dialog`-based confirm, or
      `ResponsiveDialog`) before calling `lib/actions/category.ts` `deleteCategory`. Green.
- [ ] 15.7 **RED**: spec scenario "Category drill-down lists only that category's transfers":
      given a category with 2 of the group's 5 total transfers, its accordion row's transfer
      history (loaded via `/api/transfers/by-category?categoryId=...`) lists exactly those 2.
      Mock the route response, assert the widget filters/renders only the returned set (the
      route itself already does the filtering server-side per
      `TransferService.getTransfersForCategory` — the widget test asserts correct consumption,
      not server-side filtering logic, which belongs to that route's own existing tests).
      Fails — no drill-down UI exists yet.
- [ ] 15.8 **GREEN**: Add the per-category transfer-history drill-down panel, fetching
      `/api/transfers/by-category`. Green.
- [ ] 15.9 **RED**: extend — the accordion's own inline budget-transfer form (per ADR-9's file
      list: "inline budget-transfer form → `lib/actions/transfer.create`", scoped to a single
      category from within its expanded row) submits and invalidates
      `queryKeys.group(groupId)`. Fails.
- [ ] 15.10 **GREEN**: Add the category-scoped inline transfer form. Green.
- [ ] 15.11 **REFACTOR**: Confirm every dialog/form here reuses PR 3/6's ported primitives —
      no inline reimplementation (the `ui-design-system` spec's standing "no inline
      reimplementation" requirement applies here as much as anywhere).
- [ ] 15.12 Verify: typecheck, lint, `npx vitest run app/(app)/dashboard`. Manual:
      create/update/delete-with-confirmation category flows; per-category drill-down shows the
      correct filtered transfer subset; inline transfer submission from within an expanded row.
- [ ] 15.13 Commit + PR 15 (Position 15 of 16, Depends on: PR 14, Follow-up: none — leaf
      slice; reverting this alone per the Rollback Plan leaves PR 14's read-only accordion
      intact and working).

## PR 16 — `SavingsGoalList` + savings prefetch + `ExpenseForm` quick action — **flagged, highest risk**

**Spec**: `dashboard-view` — *"Savings Goal List Delegates Goal Logic to Existing Specs"*,
*"One Server Prefetch Feeds the Summary-Dependent Widgets"* (the `savingsGoals` addition),
*"Recent Expenses and Quick-Add Share the Same Invalidation Contract"* (`ExpenseForm` half —
delegates to `savings-goal-management` and `savings-income-split-allocation` for underlying
goal/contribution math, unchanged).
**Budget**: 536 src / 250 tests / **786** total (**14 lines of headroom — the tightest slice in
the stack**). **Depends on**: PR 7, rebased onto PR 10.

**Line-count discipline for this slice (mandatory, not optional)**: this row already has almost
no margin before the RED tests are even written. Run `git diff --stat` after task 16.1 and
after every subsequent task. The moment the running total is projected to exceed ~700, stop and
apply the 16a (`SavingsGoalList`)/16b (`ExpenseForm`) fallback split from the Review Workload
Forecast — do not attempt to compress scope to fit; the two components are already
independently shippable per this row's own two-part unit description.

- [ ] 16.1 **RED**: `app/(app)/dashboard/[groupId]/page.test.tsx` — extend the prefetch
      assertion to include `queryKeys.savingsGoals(groupId)` alongside `summary`/`categories`
      (spec's summary-prefetch requirement extended to the third widget group). Fails — current
      `page.tsx` only prefetches `summary` and `categories`.
- [ ] 16.2 **GREEN**: Add `queryClient.prefetchQuery({ queryKey: queryKeys.savingsGoals(groupId),
      queryFn: () => SavingsService.getGoalsForGroup(groupId) })` to `page.tsx`'s
      `Promise.all`. Green.
- [ ] 16.3 **RED**: `_widgets/SavingsGoalList.test.tsx` — four-state coverage, reads from the
      now-hydrated `savingsGoals` cache. Spec scenario "Goal deletion behavior is unchanged
      inside the dashboard placement": row-menu delete on a goal card, confirmation-gated,
      matches the existing `savings-goal-management` deletion scenarios verbatim (isolated
      deletion — deleting one goal does not affect others; no shared-balance side effect) —
      write this as a direct port/adaptation of that spec's existing test cases into the
      dashboard placement context, not a new invention. Fails — the widget doesn't exist in
      `app/` yet (it currently lives, if at all, only under the standalone
      `app/(app)/savings/[groupId]/` route per the target-seam inventory's note that the hook
      "lives in `app/(app)/savings/[groupId]/queries.ts`").
- [ ] 16.4 **GREEN**: Port `SavingsGoalList.tsx`, reusing the existing delete/edit/adjust
      Server Actions from `lib/actions/savings.ts` (5 actions, per the target-seam inventory —
      no new action needed) and the goal-contribution math already governed by
      `savings-income-split-allocation`. Green.
- [ ] 16.5 **REFACTOR**: Confirm `SavingsGoalList` does not duplicate any logic already covered
      by `savings-goal-management`'s or `savings-income-split-allocation`'s existing test
      suites — this widget adds placement only, per the spec's own framing.
- [ ] 16.6 **RED**: `_components/ExpenseForm.test.tsx` — spec scenario "Quick-added expense
      appears in Recent Expenses": valid quick-add submission calls `lib/actions/expense.ts`'s
      create action, and on success invalidates `queryKeys.group(groupId)` so the new expense
      appears at the top of `RecentExpenses` (PR 12) and `RemainingBalance` (PR 12) reflects
      the reduced balance — write this as a cross-widget assertion (mount both `ExpenseForm`
      and `RecentExpenses` under one `QueryClientProvider`, submit, assert the new expense
      appears in the second component). Fails — `ExpenseForm` doesn't exist in the dashboard
      folder yet.
- [ ] 16.7 **GREEN**: Port `ExpenseForm.tsx` — this is the widget that pulls in `DatePicker`
      (PR 7) and `Select` (PR 6) as form fields, per the design's own line-estimate rationale
      ("did not trace `ExpenseForm`→`DatePicker`/`Select`"). Wire to `lib/actions/expense.ts`,
      `onSuccess` → `invalidateQueries(queryKeys.group(groupId))`. Green.
- [ ] 16.8 **REFACTOR**: Confirm `ExpenseForm` is composed into the dashboard as a quick-action
      (e.g. a trigger button + `ResponsiveDialog`/inline form, matching `main`'s placement),
      not a full-page form.
- [ ] 16.9 Verify: typecheck, lint, `npx vitest run app/(app)/dashboard`. Manual: savings goals
      render on the dashboard with working delete/edit/adjust; quick-add expense flow updates
      `RecentExpenses` and `RemainingBalance` live. **This is the last slice** — run the full
      `npm test`/`npm run typecheck`/`npm run lint` suite once more here as the change-level
      completion gate, plus a full manual side-by-side of the entire dashboard against `main`
      (all six widgets, per the proposal's Success Criteria).
- [ ] 16.10 Commit + PR 16 (Position 16 of 16, Depends on: PR 7, PR 10, Follow-up: none — this
      closes the stack. Confirm every proposal Success Criteria checkbox against the merged
      result before considering the change complete).

---

## Cross-Cutting Notes (apply to every PR above)

- [ ] Relative imports only, everywhere — no `@/*` alias (Fallow constraint, per
      `CONTEXT-MAP.md` and the proposal's Risks table).
- [ ] Every new/modified test file that renders a component uses per-file `//
      @vitest-environment jsdom` and `@testing-library/jest-dom/vitest`, matching the existing
      `DashboardClient.test.tsx` precedent — do not flip the repo default environment.
- [ ] Every mutation-firing test asserts the exact `invalidateQueries(queryKeys.group(groupId))`
      call, not just "some invalidation happened" — the cache-invalidation contract is the
      spec's acceptance bar across `dashboard-view`.
- [ ] Every ported primitive/widget is diffed against `main`'s source for prop-name and
      variant-vocabulary fidelity before its PR is marked done — "port verbatim" is a testable
      claim, not a vibe.
- [ ] Out-of-scope reminder for every PR touching Expenses/Transfers/Savings/Members pages
      beyond the ported widgets: parity for those four *pages* remains explicitly out of scope
      per the proposal; only the six named dashboard widgets and the groups list are in scope.

## Key Learnings

1. The repository was in a broken intermediate state at task-authoring time: `middleware.ts` is deleted from the worktree but still git-tracked, `middleware.test.ts` imports the now-missing `./middleware`, and `vitest.config.ts`, `tsconfig.next.json`, and `package.json` all still reference it, so `npm run lint`/`typecheck`/`test` cannot pass until PR 1 lands.
2. `proxy.ts` already exists as an untracked file with the `proxy()` function and `PUBLIC_PATHS` implemented, but its `config.matcher` does not yet exclude the `/fonts` prefix or font extensions, confirming the design's PR 1 scope is a fix-in-place, not a from-scratch rewrite.
3. `lib/actions/session.ts` currently exports only `getAuthenticatedUserId()`; `signOut()` does not exist yet, matching design.md's explicit "MISSING" flag for sign-out in its target-seam inventory.
4. `app/(app)/layout.tsx`'s `getGroupNames()` is a literal stub (`Promise.resolve([])`) with a `TODO(1b.12)` comment pointing at this exact un-stub work, and `app/(app)/AppShell.tsx`'s doc comment self-documents as a Phase 1a placeholder deferring all nav-chrome porting.
5. `app/(app)/dashboard/[groupId]/DashboardClient.tsx`'s own doc comment explicitly scopes itself as a lean placeholder excluding `IncomeOverview`, `BudgetCategories`, and the other widgets, and `app/(app)/dashboard/[groupId]/page.tsx` currently prefetches only `summary` and `categories` — `savingsGoals` prefetch is genuinely new work for PR 16, not already wired.
