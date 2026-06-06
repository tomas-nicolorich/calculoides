# Version Guard Report

Generated: 2026-06-06

## Version Status

| Package | Locked | Latest Stable | Status |
|---------|--------|---------------|--------|
| react | 19.2.6 | 19.2.7 | ⚠️ Behind (patch) |
| react-dom | 19.2.6 | 19.2.7 | ⚠️ Behind (patch) |
| typescript | 6.0.3 | 6.0.3 | ✅ Current |
| vite | 8.0.12 | 8.0.16 | ⚠️ Behind (patch) |
| vitest | 4.1.6 | 4.1.8 | ⚠️ Behind (patch) |
| @vitejs/plugin-react | 6.0.1 | (not checked) | — |
| tailwindcss | 4.3.0 | 4.3.0 | ✅ Current |
| express | 5.2.1 | 5.2.1 | ✅ Current |
| prisma | 7.8.0 | 7.8.0 | ✅ Current |
| @prisma/client | 7.8.0 | 7.8.0 | ✅ Current |
| zod | 4.4.3 | 4.4.3 | ✅ Current |
| react-router | 7.15.0 | 7.17.0 | ⚠️ Behind (minor) |
| react-router-dom | 7.15.0 | 7.17.0 | ⚠️ Behind (minor) |

## Known Issues

No known critical CVEs found for any locked versions at the time of report generation.

Patch-level gaps (react 19.2.6→19.2.7, vite 8.0.12→8.0.16, vitest 4.1.6→4.1.8) are low severity and do not block planning or implementation.

Minor version gap on react-router (7.15.0→7.17.0): no breaking changes documented in 7.16/7.17 release notes; treat as low-risk for code generation targeting 7.15.x APIs.

## Compatibility Rules for Code Generation

### React 19.2.x (locked: 19.2.6)

- Use `ref` as a regular prop — `forwardRef` is removed in React 19. Do NOT use `React.forwardRef`.
- Use `useActionState` (React 19+) instead of the removed `useFormState`.
- `use(Context)` hook is available; prefer it over `useContext` where it reads more clearly.
- JSX transform is automatic — no `import React from 'react'` needed.
- No `act()` warnings differ from React 18; testing patterns remain stable.

### TypeScript 6.0.3 (locked: 6.0.3 = latest)

- `isolatedModules` is now stricter; ensure all exports are value-or-type explicit.
- `moduleResolution: "bundler"` is the recommended setting for Vite projects (already configured in this repo if using Vite 6+).
- Decorator metadata via `experimentalDecorators` is superseded by TC39 stage-3 decorators if needed — avoid `experimentalDecorators` in new code.

### Tailwind CSS 4.3.0 (locked: 4.3.0 = latest)

- **CSS-first configuration only** — no `tailwind.config.js`/`tailwind.config.ts`. Use `@import "tailwindcss"` and `@theme` in CSS.
- Arbitrary values still use `[value]` syntax: `text-[10px]`, `border-l-2` etc — unchanged.
- `@apply` directives work but are discouraged in component files; prefer utility classes directly.
- Dark mode via `dark:` variant with the `class` strategy (set `class="dark"` on `<html>`).
- `bg-slate-900/50` opacity slash syntax is fully supported.

### Vite 8.0.x (locked: 8.0.12)

- Plugin API is stable from v6+; `@vitejs/plugin-react` 6.x is the correct peer.
- `import.meta.env` variables prefixed with `VITE_` are exposed to client bundles as before.
- `resolve.alias` syntax is unchanged.

### Prisma 7.8.0 (locked: 7.8.0 = latest)

- `@prisma/client` is now a generated client installed separately — pattern unchanged in this repo.
- All CLI commands must run from repo root (`prisma/schema.prisma` is at root).
- `--from-schema-datamodel` flag was removed; use `--from-schema prisma/schema.prisma`.

### Zod 4.4.3 (locked: 4.4.3 = latest)

- `z.object()`, `z.string()`, `z.number()` are stable and unchanged.
- `z.infer<typeof schema>` for type extraction is unchanged.
- `safeParse` / `parse` / `parseAsync` semantics are unchanged.

### React Router 7.15.0 (locked: 7.15.0)

- This project uses React Router in **library mode** (not framework/Remix mode) unless otherwise noted.
- `useNavigate`, `useParams`, `useSearchParams`, `useLocation` hooks are stable.
- Loader/action patterns from v7 library mode are available but not required for this feature.
- Do NOT use APIs introduced in 7.16.x or 7.17.x until the lock is updated.

## Documentation References

**react** (19.2.x): https://react.dev/blog/2024/12/05/react-19  
**typescript** (6.0.x): https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/  
**tailwindcss** (4.x): https://tailwindcss.com/docs/upgrade-guide  
**vite** (8.x): https://vite.dev/blog/announcing-vite8  
**prisma** (7.x): https://www.prisma.io/docs  
**zod** (4.x): https://zod.dev  
**react-router** (7.x): https://reactrouter.com/home  
