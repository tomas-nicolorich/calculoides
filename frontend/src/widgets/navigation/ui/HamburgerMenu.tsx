import { Menu } from '@base-ui/react';
import { Menu as MenuIcon, User, Users, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';

import { ThemeToggle } from '../../../features/theme-toggle/ui/ThemeToggle';

export function HamburgerMenu() {
  const { signOut } = useAuth();

  return (
    <Menu.Root>
      <Menu.Trigger className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 transition-colors">
        <MenuIcon size={24} className="text-slate-600 dark:text-slate-300" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" sideOffset={8} align="end">
          <Menu.Popup className="w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 animate-in slide-in-from-top-2 duration-200 focus:outline-none">
            <div className="p-3 mb-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white">Menu</span>
            </div>

            <div className="space-y-1">
              <Menu.Item render={<Link to="/groups" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none group" />}>
                <Users size={18} className="text-slate-400 group-hover:text-brand-balance" />
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">My Groups</span>
              </Menu.Item>

              <Menu.Item render={<Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none group" />}>
                <User size={18} className="text-slate-400 group-hover:text-brand-balance" />
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">Profile</span>
              </Menu.Item>

              <div className="px-1">
                <ThemeToggle />
              </div>

              <Menu.Separator className="h-px bg-slate-100 dark:border-slate-800 my-2" />

              <Menu.Item 
                onClick={() => void signOut()}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer outline-none group"
              >
                <LogOut size={18} className="text-slate-400 group-hover:text-red-500" />
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-red-600">Sign Out</span>
              </Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
