import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Input } from "../../../_ui";

/**
 * Ported from `frontend/src/pages/profile/ui/PasswordField.tsx`. Used for
 * all three password inputs on the Security card, each sharing the same
 * `toggle` element instance so a single click flips visibility everywhere
 * at once (matches prod's one `showPasswords` boolean).
 */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  showPassword,
  autoComplete,
  hint,
  toggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  autoComplete: string;
  hint?: string;
  toggle: ReactNode;
}) {
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
          onChange={(event) => {
            onChange(event.target.value);
          }}
          autoComplete={autoComplete}
          className="pl-10 pr-10"
        />
        {toggle}
      </div>
    </div>
  );
}
