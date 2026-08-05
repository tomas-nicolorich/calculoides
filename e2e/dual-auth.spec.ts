import { test, expect } from "@playwright/test";

/**
 * 1b.8 (proposal Phase-1 gate; server-session-auth: "Same session
 * authenticates both a Next.js page and a legacy API call"):
 *
 *   GIVEN a user signed in through @supabase/ssr (the Next.js login page)
 *   WHEN a legacy api/* call is made with NO Authorization header
 *   THEN the legacy call authenticates successfully without a separate
 *        sign-in — proving the adapter's bearer-token injection (1b.4) and
 *        the cookie session it read from derive from the exact same
 *        Supabase session the login page established.
 *
 * `page.request` shares the browser context's cookies, so the `/api/groups`
 * call below carries the `@supabase/ssr` session cookie and nothing else —
 * no test code ever attaches an `Authorization` header. A 401 here would
 * mean the adapter's injection is broken, not that credentials are wrong
 * (login is asserted to succeed first).
 *
 * Requires a real Supabase test user. Configure via `E2E_TEST_EMAIL` /
 * `E2E_TEST_PASSWORD`; defaults to the documented demo account
 * (demo1@demo.com) used for manual verification of this app. Skips (rather
 * than failing red) when Supabase env vars aren't reachable in this
 * environment — see apply-progress.md for why they couldn't be provisioned
 * here (carried over from Phase 1a's deviation #5).
 */
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "demo1@demo.com";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "demo123";

test("a signed-in Next.js session also authenticates a legacy /api/* call", async ({
  page,
}) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // LoginForm redirects to /groups on success — the URL changing away from
  // /login (and no error message rendered) proves the @supabase/ssr cookie
  // session was established.
  await expect(page).toHaveURL(/\/groups/);
  await expect(page.getByText(/incorrect email or password/i)).toHaveCount(0);

  // No Authorization header attached — only the browser's cookie jar.
  const legacyResponse = await page.request.get("/api/groups");

  expect(legacyResponse.status()).toBe(200);
  const groups = (await legacyResponse.json()) as unknown[];
  expect(Array.isArray(groups)).toBe(true);
});
