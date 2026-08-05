import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseServerEnv } from "./env";

/**
 * Server-side Supabase client for Server Components, Server Actions, and
 * Route Handlers. Reads/writes the `@supabase/ssr` cookie session via
 * `next/headers`. Server Components cannot set cookies (Next.js throws),
 * so `setAll` swallows that specific case — `middleware.ts` is what keeps
 * the session cookie refreshed on navigation.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseServerEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — cookies are read-only there.
          // Safe to ignore because `middleware.ts` refreshes the session
          // on every matched request.
        }
      },
    },
  });
}
