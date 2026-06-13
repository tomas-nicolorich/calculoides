import { Select as BaseSelect } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  value,
  defaultValue,
  onChange,
  onValueChange,
  options,
  placeholder = "Select...",
  className,
  disabled,
}: SelectProps) {
  const handleValueChange = (newValue: string | null) => {
    const val = newValue ?? "";
    onValueChange?.(val);
    if (onChange) {
      onChange(val);
    }
  };

  return (
    <BaseSelect.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <BaseSelect.Trigger
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-brand-balance focus:ring-1 focus:ring-brand-balance disabled:cursor-not-allowed disabled:opacity-60 text-left cursor-pointer",
          className,
        )}
      >
        <BaseSelect.Value placeholder={placeholder}>
          {(val: string | null) =>
            val
              ? (options.find((o) => o.value === val)?.label ?? val)
              : undefined
          }
        </BaseSelect.Value>
        <BaseSelect.Icon className="h-4 w-4 opacity-50 flex items-center justify-center">
          <ChevronDown size={16} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className="z-50 min-w-(--anchor-width)"
          sideOffset={4}
        >
          <BaseSelect.Popup className="max-h-60 overflow-y-auto w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1 animate-in fade-in-50 zoom-in-95 duration-100">
            <BaseSelect.List className="space-y-0.5">
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="flex cursor-pointer select-none items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 data-highlighted:bg-slate-100 dark:data-highlighted:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="flex items-center justify-center">
                    <Check size={16} className="text-brand-balance" />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
