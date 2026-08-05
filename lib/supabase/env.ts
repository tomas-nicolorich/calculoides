/**
 * Server-only Supabase env resolution shared by `server.ts` and
 * `middleware.ts`. Throws loudly instead of using a non-null assertion —
 * a missing server env var should fail the request, not silently pass an
 * empty string to `createServerClient`.
 */
export function getSupabaseServerEnv(): {
  url: string;
  anonKey: string;
} {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase server configuration is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}
