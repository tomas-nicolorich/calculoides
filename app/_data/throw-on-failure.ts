import type { ActionResult } from "../../lib/actions/result";

/**
 * Server Actions return `{ ok: false }` and never throw. Wrap an action with
 * this for a mutation whose callers rely on TanStack Query's own failure
 * path (`mutation.error`, a rejected `mutateAsync`); without it a failed
 * action resolves like a success and the caller's error UI never shows.
 */
export function throwOnFailure<Input, T>(
  action: (input: Input) => Promise<ActionResult<T>>,
) {
  return async (input: Input): Promise<ActionResult<T>> => {
    const result = await action(input);
    if (!result.ok) throw new Error(result.error);
    return result;
  };
}
