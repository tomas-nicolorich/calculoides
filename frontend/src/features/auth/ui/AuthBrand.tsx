import type { ReactNode } from "react";

interface AuthBrandProps {
  mark?: ReactNode;
}

export function AuthBrand({ mark }: AuthBrandProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-brand-balance shadow-[0_0_12px_color-mix(in_srgb,var(--color-brand-balance)_40%,transparent)] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
        {mark ?? "C"}
      </div>
      <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Calculoides
      </span>
    </div>
  );
}
