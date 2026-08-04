/**
 * Normalizes a TanStack Query `error` (typed `unknown`) into the
 * `string | null` shape the existing hook consumers expect (A3).
 */
export function toErrorMessage(error: unknown): string | null {
  if (error === null || error === undefined) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "number" || typeof error === "boolean") {
    return String(error);
  }
  return "Unknown error";
}
