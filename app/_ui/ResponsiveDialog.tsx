import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { useIsMobile } from "../../lib/hooks/use-is-mobile";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  hideCloseButton?: boolean;
}

/**
 * Mobile-aware dialog primitive: centered modal at >=768px, bottom sheet
 * below that. Use for any dialog reachable from a primary mobile flow
 * (Dialog.tsx stays desktop-only positioning).
 *
 * Ported from `main`'s `shared/ui/ResponsiveDialog.tsx`. DEVIATION
 * (documented, tasks.md 6.13): `main` sources `isDesktop` from its own
 * `useMediaQuery("(min-width: 768px)")` hook, not present in this repo.
 * This port uses `useIsMobile()` (PR 2, ADR-3's one sanctioned non-shell
 * consumer) and derives `isDesktop` as `!useIsMobile()` — the 767px/768px
 * breakpoint boundary and resulting layout are unchanged.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  hideCloseButton,
}: ResponsiveDialogProps) {
  const isDesktop = !useIsMobile();

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <BaseDialog.Trigger>{trigger}</BaseDialog.Trigger>}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <BaseDialog.Popup
          className={cn(
            "fixed z-50 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-y-auto",
            isDesktop
              ? cn(
                  "left-1/2 top-1/2 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6",
                  "transition-[transform,opacity,scale] duration-200 ease-out data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95",
                )
              : cn(
                  "left-0 right-0 bottom-0 max-h-[90vh] rounded-t-2xl p-6",
                  "transition-transform duration-200 ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full",
                ),
          )}
        >
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <BaseDialog.Title className="text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-white">
              {title}
            </BaseDialog.Title>
            {description && (
              <BaseDialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                {description}
              </BaseDialog.Description>
            )}
          </div>
          <div className="mt-4">{children}</div>
          {!hideCloseButton && (
            <BaseDialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none dark:ring-offset-slate-950 dark:focus:ring-slate-300">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </BaseDialog.Close>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
