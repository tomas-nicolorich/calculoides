## Agent skills

### Issue tracker

Issues live in GitHub Issues (`tomas-nicolorich/calculoides`). See `docs/agents/issue-tracker.md`.

### Triage labels

Uses default mattpocock/skills label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context monorepo — `CONTEXT-MAP.md` at root points to per-package `CONTEXT.md` files. See `docs/agents/domain.md`.

## Agent dispatch rule

**Dispatch to a background agent when**: reading 3+ files, OR a single file >200 lines, OR the work is self-contained (clear inputs → output file, no back-and-forth needed).
**Inline when**: 1-2 small files, tight back-and-forth needed, or the result directly drives the next tool call.
