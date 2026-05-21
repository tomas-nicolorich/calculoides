# Version Guard Report

Generated: 2025-05-15T10:00:00Z

## Version Status

| Package | Locked | Latest Stable | Status |
|---------|--------|---------------|--------|
| react | 19.2.6 | 19.2.6 | ✅ Current |
| vite | 8.0.12 | 8.0.13 | ✅ Current |
| tailwindcss | 4.3.0 | 4.3.0 | ✅ Current |
| prisma | 7.8.0 | 7.8.0 | ✅ Current |
| express | 5.2.1 | 5.2.1 | ✅ Current |
| vitest | 4.1.6 | 4.1.7 | ✅ Current |
| typescript | 6.0.3 | 6.0.3 | ✅ Current |
| zod | 4.4.3 | 4.4.3 | ✅ Current |
| eslint | 10.3.0 | 10.4.0 | ✅ Current |
| @supabase/supabase-js | 2.105.4 | 2.106.0 | ✅ Current |

## Known Issues

⚠️ **Known issue lookups succeeded for all packages.**

| Package | Version | Severity | Type | Issue | Patched In |
|---------|---------|----------|------|-------|------------|
| prisma | 7.8.0 | High | Bug | Incompatibility with React 19 `use()` hook. | N/A |
| prisma | 7.8.0 | Moderate | Bug | `prisma migrate dev` fails with `CREATE INDEX CONCURRENTLY`. | N/A |
| vite | 8.0.12 | Low | Bug | Race condition with Tailwind v4 auto-discovery on first load. | N/A |
| tailwindcss | 4.3.0 | Moderate | Build | Linux ARM build failures (oxide module missing). | N/A |
| react | 19.2.6 | Moderate | Leak | Ref cleanup timing changes can cause leaks with Vite HMR. | N/A |

## Compatibility Rules (mandatory)

These rules ensure generated code works correctly with the **locked version**.

### prisma (locked 7.8.0)

| # | ❌ DON'T | ✅ DO instead |
|---|----------|--------------|
| 1 | Pass Prisma promises directly to React 19 `use()` | Wrap query in async function or call `.then()` explicitly |
| 2 | Use `CREATE INDEX CONCURRENTLY` in Prisma migrations | Use standard `CREATE INDEX` or run concurrently outside Prisma transactions |
| 3 | Use `url` in `PrismaPg` adapter config | Use `connectionString` property instead |

### tailwindcss (locked 4.3.0)

| # | ❌ DON'T | ✅ DO instead |
|---|----------|--------------|
| 1 | Use `@apply` for utilities defined in global CSS | Use `@reference` directive to avoid shadowing |
| 2 | Use Tailwind v4 as a standard PostCSS plugin | Use `@tailwindcss/postcss` plugin explicitly |

### typescript (locked 6.0.3)

| # | ❌ DON'T | ✅ DO instead |
|---|----------|--------------|
| 1 | Rely on `baseUrl` in `tsconfig.json` | Use `paths` mapping for absolute imports |
| 2 | Leave `compilerOptions.types` empty or undefined | Explicitly include `["node", "react", "react-dom"]` in `tsconfig.json` |

### react (locked 19.2.6)

| # | ❌ DON'T | ✅ DO instead |
|---|----------|--------------|
| 1 | Rely on automatic ref cleanup in Vite HMR | Use explicit cleanup logic or avoid complex ref cleanup in dev mode |
| 2 | Pass complex Prisma objects with circular relations to Client Components | Sanitize/flatten objects before passing from Server to Client |

## Upgrade Guidance (informational)

No major-version upgrades available for core stack. Minor updates available for `vite` (8.0.13), `vitest` (4.1.7), `eslint` (10.4.0), and `@supabase/supabase-js` (2.106.0).

## Migration References

- **react** (19.x): https://react.dev/blog/2024/04/25/react-19-upgrade-guide
- **vite** (8.x): https://vite.dev/blog
- **tailwindcss** (4.x): https://tailwindcss.com/docs/v4-beta
- **prisma** (7.x): https://www.prisma.io/blog/

### Current-Version References

- **react** (19.2.6): https://react.dev/reference/react
- **vite** (8.0.12): https://vite.dev/guide/
- **tailwindcss** (4.3.0): https://tailwindcss.com/docs/installation
- **typescript** (6.0.3): https://www.typescriptlang.org/docs/handbook/
- **prisma** (7.8.0): https://www.prisma.io/docs/
- **zod** (4.4.3): https://zod.dev
