import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { Providers } from "../providers";
import { AppShell } from "./AppShell";

// TODO(1b.12): once `api/_src/services/**` moves to `lib/server/services/**`
// unchanged, replace this with a direct service call for the signed-in
// user's group list (GroupListContext data), per design.md's
// "Server Component (no endpoint)" row for `groups list`.
function getGroupNames(): Promise<string[]> {
  return Promise.resolve([]);
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  // server-session-auth: "Protected Segments Require a Verified Session" —
  // `getUser()`, never `getSession()`, so a tampered cookie that doesn't
  // correspond to a real Supabase session is rejected regardless of
  // whether a cookie is present at all.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const groupNames = await getGroupNames();

  return (
    <Providers>
      <AppShell groupNames={groupNames}>{children}</AppShell>
    </Providers>
  );
}
