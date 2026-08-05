import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client for `"use client"` components. Mirrors the
// graceful-degrade pattern of the legacy `frontend/src/shared/api/supabase.ts`
// (log instead of throw) since a misconfigured env should not white-screen
// the whole app. Requires `NEXT_PUBLIC_SUPABASE_URL` and
// `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` — the existing
// non-prefixed `SUPABASE_URL`/`SUPABASE_ANON_KEY` are server-only and are
// NOT visible to this bundle.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase configuration is missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment.",
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
}
