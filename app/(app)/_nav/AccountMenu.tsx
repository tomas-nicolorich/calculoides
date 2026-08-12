"use client";

import { Menu } from "@base-ui/react/menu";
import { LogOut, User as UserIcon } from "lucide-react";
import { IconButton } from "../../_ui/IconButton";
import { signOut } from "../../../lib/actions/session";
import type { ShellUser } from "../AppShell";

/**
 * app-navigation-shell: "Account Menu Exposes Identity and Sign-Out" —
 * renders `user.name`/`user.email` from props (never a client-side auth
 * fetch) and wires PR 8's `signOut()` Server Action. This component only
 * asserts the action is called — `signOut()`'s own session-invalidation
 * behaviour is covered by PR 8's `lib/actions/session.test.ts`.
 */
export function AccountMenu({ user }: { user: ShellUser }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <IconButton hover="neutral" bordered aria-label="Open account menu" />
        }
      >
        <UserIcon size={20} aria-hidden="true" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none"
          sideOffset={8}
          align="end"
        >
          <Menu.Popup className="w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-0.5 px-3 py-2">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {user.name ?? "Signed in"}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            </div>

            <Menu.Separator className="my-2 h-px bg-slate-100 dark:bg-slate-800" />

            <Menu.Item
              onClick={() => void signOut()}
              className="flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-200 dark:hover:bg-red-900/20"
            >
              <LogOut size={18} aria-hidden="true" />
              <span>Sign out</span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
