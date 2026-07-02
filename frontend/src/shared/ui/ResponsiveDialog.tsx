import * as React from "react";
import { Dialog } from "@base-ui/react";
import { X } from "lucide-react";
import { useMediaQuery } from "../lib/hooks/useMediaQuery";

interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  title: string;
  description?: string;
  children: React.ReactNode;
  hideCloseButton?: boolean;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  hideCloseButton,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const handle = React.useMemo(() => Dialog.createHandle(), []);

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange} handle={handle}>
      {trigger && <Dialog.Trigger render={trigger} handle={handle} />}
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" />
        <Dialog.Popup
          className={`
            fixed z-50 bg-white dark:bg-slate-900 shadow-xl overflow-hidden
            animate-in duration-300
            ${
              isDesktop
                ? "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rounded-2xl w-full max-w-md zoom-in-95 fade-in"
                : "left-0 bottom-0 right-0 rounded-t-2xl max-h-[90vh] slide-in-from-bottom flex flex-col"
            }
          `}
        >
          <div className="flex flex-col h-full max-h-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-sm text-slate-500 mt-1">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              {!hideCloseButton && (
                <Dialog.Close className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                  <X size={20} />
                </Dialog.Close>
              )}
            </div>
            <div className="p-4 overflow-y-auto">{children}</div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
