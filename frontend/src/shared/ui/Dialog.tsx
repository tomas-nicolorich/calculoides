import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
