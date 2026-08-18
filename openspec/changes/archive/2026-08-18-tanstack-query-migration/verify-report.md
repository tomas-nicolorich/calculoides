```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:56c9a7e714b44f647ff595fdff3284b42a01a369adde4c59b2107c82b5fca49e
verdict: fail
blockers: 0
critical_findings: 2
requirements: 2/6
scenarios: 5/10
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:f92f24389e5c08d9b695326f342876144aabbc778414ea07dc9ad79b863c4d43
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:c6d867d5f579b8b5803d7ea6bea8e278b46076bb2989551f14d00e1081e16422
```

## Verification Report: tanstack-query-migration

**Change**: `tanstack-query-migration`
**Date**: 2026-08-18
**Verdict**: **FAIL** (2 CRITICAL, 2 WARNING)

### Completeness

| Metric | Value |
|---|---|
| Tasks total | 48 |
| Tasks complete | 48 |
| apply-progress artifact | missing (legacy gap — apply predates this artifact requirement) |

### Structural context

This change's original implementation tree (`frontend/src/shared/api/queryClient.ts`, `dashboardHooks.ts`, etc., all under the Vite `frontend/` workspace) no longer exists. Commit `b1f4a7e` ("retire legacy api/frontend workspaces, complete Next.js migration", 2026-08-07) deleted the entire `frontend/` workspace this change was built in, superseding it with the Next.js App Router rewrite. The underlying `client-data-cache` capability still exists, relocated to `lib/query-client.ts`, `lib/query-keys.ts`, `app/_data/*`, `app/providers.tsx`. Verification below was performed against this current location, not the stale paths recorded in `design.md`/`tasks.md`.

### Build & Tests Execution

**Tests**: ✅ `npm test` exit 0 — 514/514 tests pass (103/103 files). The `app/_theme/ThemeToggle.test.tsx` failure noted during the original verify run (5 tests, `localStorage.clear()` undefined — a Node 26 built-in `localStorage` global shadowing jsdom's implementation under Vitest's jsdom pool) was unrelated to this change (`theme-preference` capability) and has since been fixed at the source (a scoped in-memory `localStorage` polyfill added to that test file) so the full suite is green.

Isolated run of the 18 client-data-cache-relevant files (`app/_data/*`, `lib/actions/session.test.ts`, `DashboardClient.test.tsx`, dashboard widget tests) → 83/83 passed.

**Build**: ✅ `npm run build` exit 0 — compiled successfully, 16/16 routes generated.
**Typecheck**: ✅ clean (root, incl. `shared` via turbo).
**Lint**: ✅ `npm run lint:next` clean, 0 errors/warnings.

### Spec compliance matrix (`specs/client-data-cache/spec.md`, 6 requirements / 10 scenarios)

| Requirement | Status | Evidence |
|---|---|---|
| Cache-Served Navigation Within Staleness Window | ✅ COMPLIANT | `DashboardClient.test.tsx` cache-hit tests |
| Refetch Only on Remount/Refocus, Never Interval | ⚠️ PARTIAL | Remount + refocus covered; "idle tab, no refetch" scenario has no explicit covering assertion |
| Extended Staleness for the Group List (5min override) | ❌ CRITICAL | `GROUPS_STALE_TIME` config exists in `lib/query-client.ts` but `queryKeys.groups()` has zero live `useQuery` consumers — the groups list now renders via a Server Component (nextjs-migration). Dead configuration, no covering test. |
| Bounded Retry on Failed Queries (`retry: 1`) | ❌ CRITICAL | `BASE_QUERY_DEFAULTS` matches spec by static inspection only; no dedicated runtime test exists — the original tasks 1.5/1.7 RED tests were not carried over when `frontend/` was deleted |
| Full Cache Clear on Sign-Out | ⚠️ ARCHITECTURALLY SATISFIED, NOT DIRECTLY TESTED | No explicit `.clear()` call; `QueryClientProvider` is scoped to `app/(app)/layout.tsx`, so `signOut()` unmounting that route-group subtree destroys the client-side `QueryClient` instance. Legitimate design evolution, but no test proves it directly. |
| Mutations Invalidate Group-Scoped Queries by Key Prefix | ✅ COMPLIANT | `app/_data/invalidate.ts` + `invalidate.test.ts` (prefix invalidation, cross-group isolation) both pass |

**Scenario tally**: 5/10 scenarios directly proven by a passing test; 2/6 requirements fully compliant.

### Root cause

Both CRITICAL findings stem from the `nextjs-migration` rewrite dropping the two dedicated unit-test files that originally satisfied tasks 1.5/1.7 when it deleted `frontend/` — not from a deficiency in this change's own 48/48 task delivery at the time it merged (5 PRs: `caf4989`, `fa14e7f`, `5dfa56d`, `0a00d3f`, PR5).

### OpenSpec bookkeeping note

`openspec/specs/` has no `client-data-cache` directory — this change was archived without merging that spec base, while `openspec/changes/nextjs-migration/specs/client-data-cache/spec.md` already writes a delta (`ADDED`/`MODIFIED Requirements`) against it. Flagged for whoever next touches `nextjs-migration`'s specs.

### Disposition

**User decision (2026-08-18)**: do not open follow-up remediation work for the untested/dead-code findings above; archive this change as-is. The 2 CRITICAL findings are carried forward into the archive report as known, accepted gaps — ownership of any future fix belongs to `nextjs-migration`, which owns the current file layout, not to this (superseded) change.
