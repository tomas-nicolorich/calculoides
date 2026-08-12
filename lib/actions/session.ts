"use server";

import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";

/** Resolves the current Supabase-authenticated user's id, or null if signed out. */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * app-navigation-shell: "Account Menu Exposes Identity and Sign-Out" —
 * invalidates the *server* session via `supabase.auth.signOut()`, not a
 * client-only `createClient().auth.signOut()` (which would clear the
 * browser store but leave the httpOnly cookie valid for the proxy to
 * refresh — design.md ADR-6), then redirects to `/login`.
 */
export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
