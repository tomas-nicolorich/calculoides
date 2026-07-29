import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Input } from "../../../shared/ui";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  autoComplete: string;
  toggle: ReactNode;
  hint?: string;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  showPassword,
  autoComplete,
  toggle,
  hint,
}: PasswordFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="relative">
        <Lock
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          className="pl-10 pr-10"
        />
        {toggle}
      </div>
    </div>
  );
}
