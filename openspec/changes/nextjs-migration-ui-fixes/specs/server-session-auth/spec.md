# Delta for Server Session Auth

## MODIFIED Requirements

### Requirement: The Routing Proxy Refreshes the Session on Every Matched Request

The system MUST refresh the Supabase session cookies, via the
`@supabase/ssr` proxy client (`proxy.ts`), on every request matched by
`config.matcher`, before the request reaches a Server Component, Server
Action, or Route Handler. `config.matcher` MUST exclude static-asset
requests — the `/fonts` path prefix first, then the font/image file
extensions (`woff`, `woff2`, `ttf`, `otf`, plus the existing `svg`, `png`,
`jpg`, `webp` set) — so those requests never receive a session refresh or an
auth redirect.
(Previously: "Middleware Refreshes the Session on Every Matched Request" —
matched via `middleware.ts`'s matcher, which excluded only
`_next/static`, `_next/image`, `favicon.ico`, and a narrower image-extension
set, causing `/fonts/*.woff2` requests to 307-redirect to `/login` and serve
an HTML error page instead of the font.)

#### Scenario: Valid session is refreshed transparently
- GIVEN a signed-in user with a soon-to-expire session cookie
- WHEN they navigate to any matched route
- THEN the proxy refreshes the cookie before the page renders, with no visible interruption

#### Scenario: `/api/*` route handlers are excluded from the redirect branch
- GIVEN a request targets an `/api/*` route
- WHEN it reaches the proxy
- THEN the proxy's redirect branch does not apply, and the request reaches the route handler, which owns its own response

#### Scenario: Font asset request bypasses the matcher entirely
- GIVEN an unauthenticated request for `/fonts/geist-variable.woff2`
- WHEN it is evaluated against `config.matcher`
- THEN the path is excluded by the `/fonts` prefix rule, no session refresh or redirect occurs, and the request reaches the static file directly, returning `200` with the font's binary body — never a `307` to `/login`

#### Scenario: A font-shaped path is excluded by prefix regardless of exact extension
- GIVEN a request path begins with `/fonts/`
- WHEN it is evaluated against `config.matcher`
- THEN it is excluded by the `/fonts` prefix rule alone, independent of the extension-suffix rule

### Requirement: Protected Segments Require a Verified Session

The system MUST verify the caller's identity server-side via `getUser()` —
not merely by checking for cookie presence — before rendering any protected
route segment, Server Action, or Route Handler that returns or mutates user-
or group-scoped data. This check is independent of, and unaffected by,
`config.matcher` exclusions: a request that skips the proxy's redirect
branch because its path is shaped like a static asset still reaches the
protected segment's own `getUser()` gate.
(Previously: same requirement; adds the matcher-exclusion independence
guarantee below.)

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
- WHEN `config.matcher`'s exclusion causes the proxy to skip its redirect branch for that path
- THEN `app/(app)/layout.tsx`'s own `getUser()` check still rejects the request and redirects to `/login` — matcher exclusion is a performance optimization, not an authorization weakening
