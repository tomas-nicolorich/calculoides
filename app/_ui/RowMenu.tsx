import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { IconButton } from "./IconButton";

interface RowMenuProps {
  onEdit?: () => void;
  /**
   * Optional so a caller with a non-owner-gated delete permission (e.g.
   * `BudgetCategories`' owner-only category delete) can omit it entirely
   * rather than rendering a Delete option that would only fail server-side.
   */
  onDelete?: () => void;
}

/** Ported from `main`'s `shared/ui/RowMenu.tsx`; `onDelete` made optional
 * here to support permission-gated callers `main` didn't have. */
export function RowMenu({ onEdit, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <IconButton size="sm" hover="balance" aria-label="Row options" />
        }
      >
        <MoreVertical size={16} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          positionMethod="fixed"
          className="z-50 outline-none"
          sideOffset={4}
          align="end"
          collisionPadding={16}
        >
          <Popover.Popup
            role="menu"
            aria-label="Row options"
            className="w-32 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-1 animate-in fade-in-50 zoom-in-95 duration-100 focus:outline-none"
          >
            {onEdit && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left outline-none cursor-pointer"
              >
                <Edit2 size={14} />
                <span>Edit</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-expense hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left outline-none cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
