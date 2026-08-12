import { cn } from "../../lib/cn";

/**
 * Ported from `main`'s `shared/ui/Dialog.tsx` (see the deviation note in
 * `Dialog.test.tsx`): `main` never wraps Base UI's Dialog primitive in a
 * shared `Dialog` component, only this footer layout helper.
 */
export function DialogFooter({
  className,
  destructive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Keep Cancel first on mobile instead of reversing above the destructive action. */
  destructive?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-2 sm:flex-row sm:justify-end mt-6",
        destructive ? "flex-col" : "flex-col-reverse",
        className,
      )}
      {...props}
    />
  );
}
