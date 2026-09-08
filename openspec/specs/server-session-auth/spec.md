# Server Session Auth Specification

## Purpose

Defines cookie-based session establishment, middleware refresh, and server-side verification using `@supabase/ssr`, replacing the bearer-token `Authorization` header flow for all Next.js-served routes. During the migration, legacy `api/*` bearer-token routes remained valid in parallel via the strangler approach (see `resource-authorization`); that coexistence window is now permanently closed — `api/` was deleted at migration completion (commit `b1f4a7e`) — and this spec governs only the single cookie-based path that remains.

## Requirements

### Requirement: Middleware Refreshes the Session on Every Matched Request

The system MUST refresh the Supabase session cookies, via the `@supabase/ssr` middleware client, on every request matched by `middleware.ts`, before the request reaches a Server Component, Server Action, or Route Handler. The matcher MUST exclude static-asset requests — the `/fonts` path prefix first, then the font/image file extensions (`woff`, `woff2`, `ttf`, `otf`, plus the existing `svg`, `png`, `jpg`, `webp` set) — so those requests never receive a session refresh or an auth redirect.

#### Scenario: Valid session is refreshed transparently
- GIVEN a signed-in user with a soon-to-expire session cookie
- WHEN they navigate to any matched route
- THEN middleware refreshes the cookie before the page renders, with no visible interruption

#### Scenario: `/api/*` route handlers are excluded from the redirect branch
- GIVEN a request targets an `/api/*` route
- WHEN it reaches the middleware
- THEN the middleware's redirect branch does not apply, and the request reaches the route handler, which owns its own response

#### Scenario: Font asset request bypasses the matcher entirely
- GIVEN an unauthenticated request for `/fonts/geist-variable.woff2`
- WHEN it is evaluated against the matcher configuration
- THEN the path is excluded by the `/fonts` prefix rule, no session refresh or redirect occurs, and the request reaches the static file directly, returning `200` with the font's binary body — never a `307` to `/login`

#### Scenario: A font-shaped path is excluded by prefix regardless of exact extension
- GIVEN a request path begins with `/fonts/`
- WHEN it is evaluated against the matcher configuration
- THEN it is excluded by the `/fonts` prefix rule alone, independent of the extension-suffix rule

### Requirement: Protected Segments Require a Verified Session

The system MUST verify the caller's identity server-side via `getUser()` — not merely by checking for cookie presence — before rendering any protected route segment, Server Action, or Route Handler that returns or mutates user- or group-scoped data. This check is independent of, and unaffected by, matcher exclusions: a request that skips the middleware's redirect branch because its path is shaped like a static asset still reaches the protected segment's own `getUser()` gate.

#### Scenario: Authenticated user reaches protected content
- GIVEN a user with a valid, verified Supabase session
- WHEN they request a protected page
- THEN the page renders with their data

#### Scenario: Missing or invalid session is redirected
- GIVEN a request with no session cookie, or an invalid/expired one
- WHEN it targets a protected segment
- THEN the system redirects to the sign-in page without rendering protected content

#### Scenario: Tampered cookie without a valid Supabase session
- GIVEN a request carrying a cookie that does not correspond to a verified session
- WHEN `getUser()` is called server-side
- THEN it MUST return no user, and the request is treated as unauthenticated regardless of cookie presence

#### Scenario: A protected route shaped like a static asset still fails closed
- GIVEN an unauthenticated request to `/dashboard/x.woff2` — a protected route path that happens to look like a font asset
- WHEN the matcher's exclusion causes the middleware to skip its redirect branch for that path
- THEN `app/(app)/layout.tsx`'s own `getUser()` check still rejects the request and redirects to `/login` — matcher exclusion is a performance optimization, not an authorization weakening

### Requirement: Sign-Out Clears the Session Server-Side

The system MUST invalidate the Supabase session and clear its cookies when a user signs out, so subsequent requests are treated as unauthenticated.

#### Scenario: Sign-out then request protected content
- GIVEN a signed-in user signs out
- WHEN they subsequently request a previously protected page
- THEN they are redirected to sign-in, and no previously valid session cookie is accepted

### Retired Requirement: Both Auth Paths Derived From the Same Supabase Session During the Migration Window

**Status**: Retired 2026-08-18. This requirement applied only while `api/` legacy routes and Next.js routes coexisted during the migration. `api/` was deleted at migration completion (commit `b1f4a7e`), permanently closing the coexistence window it described. No code path exercises dual-auth today, so no test can — or should — cover it. Kept here, retired rather than deleted, for historical traceability of a decision this change's design record (`design.md`) documents in more detail.

Original text, no longer in force: while `api/` legacy routes and Next.js routes coexisted, the system had to accept both the `@supabase/ssr` cookie session and the legacy `Authorization: Bearer` header, provided both derived from the same underlying Supabase session, without requiring the user to sign in twice.
