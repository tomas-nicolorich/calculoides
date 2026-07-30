import { Link } from "react-router-dom";
import { Logo } from "../../../shared/ui";
import { AccountMenu } from "./AccountMenu";
import { GroupSwitcher } from "./GroupSwitcher";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="px-4 h-16 flex items-center gap-3">
        <Link
          to="/groups"
          className="flex shrink-0 items-center gap-2 outline-none"
        >
          <Logo className="w-8 h-8" />
        </Link>

        <div className="min-w-0 flex-1">
          <GroupSwitcher variant="pill" />
        </div>

        <AccountMenu />
      </div>
    </header>
  );
}
