import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "./env";

export interface SessionUpdate {
  response: NextResponse;
  user: User | null;
}

/**
 * Refreshes the `@supabase/ssr` session cookie for a matched request and
 * verifies the caller via `getUser()` — never `getSession()`, which trusts
 * the cookie payload without revalidating it against Supabase and is
 * spoofable from a tampered cookie (server-session-auth: "Tampered cookie
 * without a valid Supabase session").
 *
 * Cookie writes must land on a *fresh* `NextResponse.next({ request })`
 * (not the original `request` object) so the refreshed `Set-Cookie` headers
 * actually reach the browser — this is the documented `@supabase/ssr`
 * middleware pattern.
 */
export async function updateSession(
  request: NextRequest,
): Promise<SessionUpdate> {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseServerEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
}
