# Server Session Auth Specification

## Purpose

Defines cookie-based session establishment, middleware refresh, and server-side verification using `@supabase/ssr`, replacing the bearer-token `Authorization` header flow for all Next.js-served routes. During the migration, legacy `api/*` bearer-token routes remained valid in parallel via the strangler approach (see `resource-authorization`); that coexistence window is now permanently closed — `api/` was deleted at migration completion (commit `b1f4a7e`) — and this spec governs only the single cookie-based path that remains.

## Requirements

### Requirement: Middleware Refreshes the Session on Every Matched Request

The system MUST refresh the Supabase session cookies, via the `@supabase/ssr` middleware client, on every request matched by `middleware.ts`, before the request reaches a Server Component, Server Action, or Route Handler.

#### Scenario: Valid session is refreshed transparently
- GIVEN a signed-in user with a soon-to-expire session cookie
- WHEN they navigate to any matched route
- THEN middleware refreshes the cookie before the page renders, with no visible interruption

#### Scenario: Legacy API paths are excluded from the matcher
- GIVEN the middleware matcher configuration
- WHEN a request targets a legacy `/api/*` route still served by the old dispatcher
- THEN middleware MUST NOT intercept or block it, so the existing bearer-token flow keeps working unchanged

### Requirement: Protected Segments Require a Verified Session

The system MUST verify the caller's identity server-side via `getUser()` — not merely by checking for cookie presence — before rendering any protected route segment, Server Action, or Route Handler that returns or mutates user- or group-scoped data.

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

### Requirement: Sign-Out Clears the Session Server-Side

The system MUST invalidate the Supabase session and clear its cookies when a user signs out, so subsequent requests are treated as unauthenticated.

#### Scenario: Sign-out then request protected content
- GIVEN a signed-in user signs out
- WHEN they subsequently request a previously protected page
- THEN they are redirected to sign-in, and no previously valid session cookie is accepted

### Retired Requirement: Both Auth Paths Derived From the Same Supabase Session During the Migration Window

**Status**: Retired 2026-08-18. This requirement applied only while `api/` legacy routes and Next.js routes coexisted during the migration. `api/` was deleted at migration completion (commit `b1f4a7e`), permanently closing the coexistence window it described. No code path exercises dual-auth today, so no test can — or should — cover it. Kept here, retired rather than deleted, for historical traceability of a decision this change's design record (`design.md`) documents in more detail.

Original text, no longer in force: while `api/` legacy routes and Next.js routes coexisted, the system had to accept both the `@supabase/ssr` cookie session and the legacy `Authorization: Bearer` header, provided both derived from the same underlying Supabase session, without requiring the user to sign in twice.
