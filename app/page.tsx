import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

/**
 * app-navigation-shell: "Root Route Redirects Based on Session State" —
 * `/` never renders content itself; it hands off to the signed-in or
 * signed-out landing route based on session state. Uses `getUser()`
 * (never `getSession()`) so a tampered cookie without a real Supabase
 * session is treated as signed-out, matching `app/(app)/layout.tsx`'s
 * convention.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/groups");
  }

  redirect("/login");
}
