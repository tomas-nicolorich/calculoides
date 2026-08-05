/**
 * lib/actions/result.ts — replaces `withErrorHandling` for Server Actions.
 * Thrown errors are opaque in production builds, so every Server Action
 * under `lib/actions/**` returns `ActionResult<T>` and never throws.
 * Ported from design.md's Interfaces / Contracts section.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: 400 | 403 | 404 | 500 };

/** Wraps a successful Server Action result. */
export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** Wraps a failed Server Action result with its mapped HTTP-equivalent status. */
export function fail<T = never>(
  error: string,
  status: 400 | 403 | 404 | 500,
): ActionResult<T> {
  return { ok: false, error, status };
}
