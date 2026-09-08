import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { GroupService } from "../../lib/server/services/group";
import { UserService } from "../../lib/server/services/user";
import { Providers } from "../providers";
import { AppShell } from "./AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // server-session-auth: "Protected Segments Require a Verified Session" —
  // `getUser()`, never `getSession()`, so a tampered cookie that doesn't
  // correspond to a real Supabase session is rejected regardless of
  // whether a cookie is present at all.
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // app-navigation-shell: "Group Switcher Lists the User's Real Groups" —
  // replaces the former `getGroupNames()` stub that always resolved `[]`.
  const [groups, profile] = await Promise.all([
    GroupService.getGroupsForUser(authUser.id),
    UserService.getUser(authUser.id),
  ]);

  if (!profile) {
    redirect("/complete-profile");
  }

  return (
    <Providers>
      <AppShell
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
      >
        {children}
      </AppShell>
    </Providers>
  );
}
