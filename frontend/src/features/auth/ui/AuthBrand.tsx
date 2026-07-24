import type { ReactNode } from "react";
import { Logo } from "../../../shared/ui";

interface AuthBrandProps {
  mark?: ReactNode;
}

export function AuthBrand({ mark }: AuthBrandProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 flex-shrink-0">
        {mark ?? <Logo className="w-full h-full" />}
      </div>
      <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Calculoides
      </span>
    </div>
  );
}
