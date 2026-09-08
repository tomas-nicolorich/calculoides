"use client";

import type { ReactNode } from "react";
import { SidebarNav } from "./_nav/SidebarNav";
import { MobileTopBar } from "./_nav/MobileTopBar";
import { MobileTabBar } from "./_nav/MobileTabBar";

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
 * server-rendering independently of `AppShell`'s client bundle. Desktop
 * (`SidebarNav`, `hidden md:flex`) and mobile (`MobileTopBar` +
 * `MobileTabBar`, `md:hidden`) trees both render on every request, gated
 * with Tailwind classes only — never a JS `useIsMobile()` branch (ADR-3) —
 * so there is no first-frame mismatch before hydration.
 */
export function AppShell({
  groups,
  children,
}: {
  groups: ShellGroup[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
      <SidebarNav groups={groups} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar groups={groups} />
        <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  );
}
