"use client";

import type { ReactNode } from "react";
import { SidebarNav } from "./_nav/SidebarNav";

export interface ShellGroup {
  id: string;
  name: string;
}

export interface ShellUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * app-navigation-shell: "`children` Reaches the Shell as a Prop, Never an
 * Import" (ADR-4) — `children` arrives as a prop from the Server Component
 * `app/(app)/layout.tsx`, so every route below the shell keeps
 * server-rendering independently of `AppShell`'s client bundle. The
 * desktop tree is gated with Tailwind (`hidden md:flex`), never a JS
 * `useIsMobile()` branch (ADR-3) — the mobile top/tab bar tree lands in
 * PR 10 and is intentionally omitted here rather than built as dead
 * markup ahead of its own components.
 */
export function AppShell({
  // TODO(PR10): threaded into `GroupSwitcher`/`AccountMenu` once they land.
  groups: _groups,
  user: _user,
  children,
}: {
  groups: ShellGroup[];
  user: ShellUser;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
      <SidebarNav />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
