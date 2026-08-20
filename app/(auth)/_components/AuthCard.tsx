import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

// Shared by every app/(auth)/** page: the card shell, header, a labeled
// input, and the inline error message. Extracted from the original
// per-form JSX (see PR history) both to remove duplication across the five
// auth forms and to keep each form's own complexity below fallow's CRAP
// threshold - the error/field markup no longer lives inline in the form
// component's branching logic.

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}

export function FormField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  required = true,
  autoComplete,
  autoFocus,
  endAdornment,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  endAdornment?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={`w-full rounded-md px-3 py-2 text-sm ${endAdornment ? "pr-10" : ""}`}
        />
        {endAdornment}
      </div>
    </div>
  );
}

export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      onClick={onToggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-brand-expense text-center">
      {message}
    </p>
  );
}
