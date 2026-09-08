import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-merge helper shared by every `app/_ui/**` primitive (ADR-1).
 * `clsx` collapses conditional/falsy class inputs; `twMerge` then resolves
 * conflicting Tailwind utility classes, last one wins.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
