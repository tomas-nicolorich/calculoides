import React from "react";
import { HamburgerMenu } from "../../widgets/navigation/ui/HamburgerMenu";
import { Link } from "react-router-dom";
import { Logo } from "../../shared/ui";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              Calculoides
            </span>
          </Link>

          <HamburgerMenu />
        </div>
      </header>

      <main className="animate-in fade-in duration-500">{children}</main>
    </div>
  );
}
