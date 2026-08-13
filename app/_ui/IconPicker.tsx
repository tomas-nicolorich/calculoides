import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/cn";
import { CategoryIconTile, CATEGORY_ICON_GROUPS } from "./categoryIcons";

type IconPickerTone = "balance" | "category";

interface IconPickerProps {
  icon: string;
  onChange: (key: string) => void;
  label?: string;
  disabled?: boolean;
  /** Selection-ring colour; match the surrounding domain (default `balance`). */
  tone?: IconPickerTone;
}

const ringTone: Record<IconPickerTone, string> = {
  balance: "ring-brand-balance",
  category: "ring-brand-category",
};

/** "paint-roller" -> "Paint roller" */
function keyToLabel(key: string) {
  const spaced = key.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Searchable, grouped icon picker (replaces the flat button-wrap selector).
 * Backed entirely by the lucide-react set in `categoryIcons.tsx`.
 *
 * Ported verbatim from `main`'s `shared/ui/IconPicker.tsx` (PR 15, task
 * 15.0 — moved here from PR 6's original scope since this widget is
 * IconPicker's actual consumer). Only the `cn`/`categoryIcons` import paths
 * differ, per the same porting convention PR 3-7 established.
 */
export function IconPicker({
  icon,
  onChange,
  label = "Icon",
  disabled,
  tone = "balance",
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = normalizedQuery
    ? CATEGORY_ICON_GROUPS.map((group) => ({
        label: group.label,
        icons: Object.fromEntries(
          Object.entries(group.icons).filter(([key]) =>
            key.replace(/-/g, " ").includes(normalizedQuery),
          ),
        ),
      })).filter((group) => Object.keys(group.icons).length > 0)
    : CATEGORY_ICON_GROUPS;

  const hasResults = filteredGroups.length > 0;

  const selectIcon = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <Popover.Trigger
          disabled={disabled}
          aria-label="Choose icon"
          className="flex h-11 w-full items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-left shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700 focus-visible:outline-none focus-visible:border-brand-balance focus-visible:ring-1 focus-visible:ring-brand-balance disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          <CategoryIconTile icon={icon} size="sm" />
          <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
            {keyToLabel(icon)}
          </span>
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            positionMethod="fixed"
            className="z-50 w-[var(--anchor-width,20rem)] max-w-[var(--available-width)]"
            sideOffset={4}
            collisionPadding={16}
          >
            <Popover.Popup className="w-80 max-w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
                  placeholder="Search icons..."
                  aria-label="Search icons"
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-balance focus:ring-1 focus:ring-brand-balance"
                />
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto space-y-3 pr-1">
                {!hasResults && (
                  <p className="py-6 text-center text-sm text-slate-400">
                    No icons found
                  </p>
                )}
                {filteredGroups.map((group) => (
                  <div key={group.label} className="space-y-1.5">
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest px-0.5">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-6 gap-1">
                      {Object.keys(group.icons).map((key) => {
                        const selected = icon === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              selectIcon(key);
                            }}
                            aria-pressed={selected}
                            aria-label={`Icon: ${keyToLabel(key)}`}
                            title={keyToLabel(key)}
                            className={cn(
                              "rounded-xl p-0.5 transition-all",
                              selected
                                ? cn(
                                    "ring-2 ring-offset-1 ring-offset-card",
                                    ringTone[tone],
                                  )
                                : "opacity-70 hover:opacity-100",
                            )}
                          >
                            <CategoryIconTile icon={key} size="sm" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
