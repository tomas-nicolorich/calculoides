import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { X } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  hideCloseButton?: boolean;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  hideCloseButton,
}: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <BaseDialog.Trigger>{trigger}</BaseDialog.Trigger>}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <BaseDialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
            "transition-[transform,opacity,scale] duration-200 ease-out data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95",
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

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6",
        className,
      )}
      {...props}
    />
  );
}
