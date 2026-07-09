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
            options.find((o) => o.value === (val ?? ""))?.label
          }
        </BaseSelect.Value>
        <BaseSelect.Icon className="h-4 w-4 opacity-50 flex items-center justify-center">
          <ChevronDown size={16} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          // positionMethod="fixed" keeps the popup out of the document scroll
          // region. base-ui's default is "absolute" (see SelectPositioner), which
          // makes the popup part of document scrollWidth; on first open, before
          // floating-ui measures, it transiently overflows and expands the mobile
          // layout viewport, re-centering the fixed Dialog off-screen (the flash).
          positionMethod="fixed"
          // Width comes from base-ui's measured CSS vars, never a viewport unit.
          // The old `min(var(--anchor-width,100%), calc(100vw-2rem))` used `100vw`
          // (the layout viewport). On first open, before base-ui sets --anchor-width,
          // the fallback made this fixed-positioned popup viewport-wide; on mobile a
          // fixed element wider than the visual viewport expands the layout viewport,
          // which re-centers any fixed Dialog off-screen. --available-width is
          // collision-aware and never exceeds the space to the viewport edge; the
          // 16rem fallback keeps the first paint (before vars resolve) sanely sized.
          className="z-50 w-[var(--anchor-width,16rem)] max-w-[var(--available-width)]"
          sideOffset={4}
          collisionPadding={16}
          alignItemWithTrigger={false}
        >
          <BaseSelect.Popup className="max-h-60 overflow-y-auto w-full max-w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1 animate-in fade-in-50 zoom-in-95 duration-100">
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
