import { Link } from "react-router-dom";
import { Logo } from "../../../shared/ui";
import { AccountMenu } from "./AccountMenu";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="px-4 h-16 flex items-center justify-between">
        <Link to="/groups" className="flex items-center gap-2 outline-none">
          <Logo className="w-8 h-8" />
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            Calculoides
          </span>
        </Link>

        <AccountMenu />
      </div>
    </header>
  );
}
