/**
 * Shared `fetch` + JSON-parse helper (ADR-2), deduped out of four
 * route-local `queries.ts` copies (dashboard, expenses, transfers, savings).
 * `apiClient.fetch` is not reused here — it imports a Vite-only
 * `import.meta.env.VITE_SUPABASE_URL` read that Next's bundler never
 * evaluates the same way (see the pre-hoist `queries.ts` files' own doc
 * comments for the same precedent).
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(body.error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}
