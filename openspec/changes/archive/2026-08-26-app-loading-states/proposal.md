# Proposal: App Loading States

> Revised after user product review. Two decisions expanded scope: `(auth)/**` moved in-scope (spinner-only), and per-widget streaming (exploration "Approach 2") moved from deferred into this change.

## Intent

Navigation has no in-flight feedback. All 7 `(app)` segments, the root shell, and all 5 `(auth)` segments are `async` Server Components with zero `loading.tsx`/`<Suspense>`, so navigation visibly freezes on the previous page (blank on hard load) until every await resolves. Production (`origin/main`) shows an instant page-shaped skeleton on every navigation. Beyond restoring that parity, the dashboard should genuinely stream: its 3 prefetches currently sit behind one `await Promise.all`, so the fastest region waits for the slowest.

## Scope

### In Scope

- **Per-segment fallbacks** — `loading.tsx` for 7 `(app)` segments plus root `app/(app)/loading.tsx`, each a high-fidelity page-shaped fallback composed from `app/_ui/Skeleton.tsx`, porting prod's page-skeleton shapes.
- **`(auth)/**` fallbacks** — centered full-page `Spinner`, **not** skeletons, for login, signup, forgot-password, reset-password, complete-profile. Justified: each awaits `supabase.auth.getUser()`, and complete-profile also awaits `UserService.getUser`. Prefer one shared `app/(auth)/loading.tsx`; design must confirm it applies without an explicit `(auth)/layout.tsx`, else fall back to per-segment files.
- **`app/_ui/Spinner.tsx`** — ported verbatim from prod (conic-gradient ring, sm/md/lg, `role="status"`), added to the `app/_ui` barrel.
- **Dashboard streaming** — replace `dashboard/[groupId]/page.tsx`'s single `await Promise.all([3 prefetchQuery])` with per-region `<Suspense>` boundaries so regions reveal independently.
- **Widget reconciliation** — plain-text "Loading…" → `Skeleton` in `RecentExpenses`, `BudgetCategories` (incl. nested `TransferHistory`), `RemainingBalance`, `IncomeOverview`.

### Out of Scope

- Route-transition progress bar (nprogress/toploader).
- Streaming restructure of `groups`/`members`/`profile`/`expenses`/`transfers`/`savings`. The lean-server three already client-fetch; the heavy three are single-query. Design may add `(app)/layout.tsx` (3 awaits) if it finds a second genuine multi-region page.
- Mutation `isPending` UX and `AppShell`, both already correct.

## Capabilities

### New Capabilities

- `route-loading-states`: per-segment navigation fallbacks, covering **both** `(app)` (skeleton, page-shaped) and `(auth)` (spinner, centered) route groups, plus re-trigger behavior.

### Modified Capabilities

- `ui-design-system`: adds `Spinner` to the sanctioned primitive/barrel set; codifies Spinner (full-page/shape-unknown) vs Skeleton (in-content/shape-known).
- `dashboard-view`: its "Loading state precedes hydration" scenario becomes literally true — widgets stream independently rather than rendering inline skeletons after one blocking parent await. Its "One Server Prefetch Feeds the Summary-Dependent Widgets" requirement must be **preserved**, not broken (see Approach).
- `client-data-cache`: candidate — multiple `HydrationBoundary` instances change the single-dehydrate story. Design MUST confirm whether a delta is required.

## Approach

Two mechanisms, deliberately different:

1. **Segment fallbacks** (`loading.tsx` file convention) — additive, no data-layer change, renders inside the already-mounted `AppShell`. Accepted decision: a `groupId`-only change re-triggers the segment fallback, matching prod's `isLoading`. No `key`-based suppression. Accepted: no minimum display duration; a brief flash on fast transitions is fine.
2. **Dashboard streaming** (`<Suspense>` per data region) — splits the page body into server sub-components that each own one prefetch + `HydrationBoundary`, wrapped in `<Suspense>` with a widget-shaped skeleton.

**Critical design constraint**: boundaries split per **query key**, not per widget. `queryKeys.summary` feeds four widgets (`IncomeOverview`, `RemainingBalance`, `RecentExpenses`, `BudgetTransfers`); splitting those into four boundaries would re-introduce exactly the client waterfall `dashboard-view` forbids. Maximum three regions — `summary` (4 widgets together), `categories`, `savingsGoals`.

Open design questions for `sdd-design`: how a per-region skeleton composes with the page-level `loading.tsx` above it (avoid double-skeleton), and whether the root `(app)` layout's 3 awaits also warrant streaming.

## Affected Areas

Workspace: root Next.js app (`app/**`) only. `shared` workspace, Prisma, and API untouched.

| Area | Impact | Description |
|------|--------|-------------|
| `app/(app)/**/loading.tsx` (8) | New | Page-shaped skeleton fallbacks |
| `app/(auth)/loading.tsx` (1, or 5) | New | Centered `Spinner` fallback |
| `app/_ui/Spinner.tsx`, `app/_ui/index.tsx` | New/Modified | Ported primitive + barrel export |
| `app/(app)/dashboard/[groupId]/page.tsx` | **Restructured** | `Promise.all` → per-region `<Suspense>` |
| `dashboard/[groupId]/_widgets/*.tsx` (4) | Modified | Text → `Skeleton`; region-aware composition |
| `openspec/specs/dashboard-view`, `client-data-cache` | Modified | Deltas from streaming |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Exceeds the 800-line review budget on its own** | **High** | Split into two slices (see below); flag to review workload guard |
| Streaming re-opens architecture the archived migration design settled | **High** | Preserve the one-prefetch-per-query-key invariant; per-key not per-widget boundaries |
| Splitting `summary` re-introduces the client waterfall | Med | Hard constraint: 4 summary widgets share one boundary |
| Page-level `loading.tsx` + per-region skeleton double-render | Med | Design decides composition before apply |
| Root `loading.tsx` remounts `AppShell` instead of scoping to `children` | Med | Verify empirically; fall back to segment-only |
| Widget tests assert "Loading…" text | High | Strict TDD: update RED assertions to role/testid first |
| `(auth)` spinner flashes on an already-fast session check | Low | Accepted; consistent with the no-floor decision |

## Recommended Delivery Split

This change now spans two very different effort/risk levels (exploration rated them Low vs Medium-High). Recommend `sdd-design` produce two slices:

- **Slice A — segment fallbacks**: all `loading.tsx` files, `Spinner`, `(auth)` fallbacks, widget text→Skeleton. Additive, delete-to-revert, no spec deltas beyond `route-loading-states` + `ui-design-system`.
- **Slice B — dashboard streaming**: `page.tsx` restructure, `dashboard-view`/`client-data-cache` deltas.

Slice A lands first: Slice B's per-region skeletons compose *underneath* the page-level fallback Slice A introduces.

## Rollback Plan

- **Slice A** — fully additive. Delete the `loading.tsx` files and `Spinner.tsx`, revert the barrel export and the 4 widget diffs. No state to unwind.
- **Slice B** — revert `dashboard/[groupId]/page.tsx` to the single `await Promise.all` + one `HydrationBoundary` shape and revert the spec deltas. Behavior-only; no schema, migration, or API-surface change, so no deploy ordering constraint and no data risk in either direction.

## Dependencies

- None. `next@^16.3.0` and `app/_ui/Skeleton.tsx` already exist.

## Success Criteria

- [ ] Every `(app)` route renders a page-shaped skeleton immediately on navigation — no frozen previous page, no blank screen.
- [ ] Every `(auth)` route renders a centered `Spinner` during its session check — no skeleton.
- [ ] Dashboard regions appear independently; a slow `savingsGoals` query does not delay `summary` widgets.
- [ ] The four `queryKeys.summary` widgets still hydrate from one prefetch — no new client-side waterfall.
- [ ] No plain-text "Loading…" remains under `app/**`.
- [ ] `Spinner` is in the barrel with prod's exact prop API and a11y attributes.
- [ ] `npm test`, `npm run lint`, `npm run typecheck` pass.
