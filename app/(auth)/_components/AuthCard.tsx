import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card, Input, IconButton } from "../../_ui";

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
    <Card className="w-full max-w-md mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {subtitle}
        </p>
      </div>
      {children}
    </Card>
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
        <Input
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
          className={endAdornment ? "pr-10" : undefined}
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
    <IconButton
      type="button"
      size="sm"
      hover="neutral"
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      onClick={onToggle}
      className="absolute right-1 top-1/2 -translate-y-1/2"
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </IconButton>
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
