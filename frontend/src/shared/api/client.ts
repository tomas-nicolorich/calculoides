import { supabase } from "./supabase";

const pendingRequests = new Map<
  string,
  { promise: Promise<unknown>; timestamp: number }
>();

export const apiClient = {
  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { signal, ...fetchOptions } = options;
    const cacheKey = `${fetchOptions.method ?? "GET"}:${endpoint}:${(fetchOptions.body as string | undefined) ?? ""}`;
    const now = Date.now();
    const pending = pendingRequests.get(cacheKey);

    let promise: Promise<unknown>;

    if (pending && now - pending.timestamp < 100) {
      promise = pending.promise;
    } else {
      promise = (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;

          const res = await fetch(`/api${endpoint}`, {
            ...fetchOptions,
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...Object.fromEntries(
                new Headers(fetchOptions.headers).entries(),
              ),
            },
          });

          if (!res.ok) {
            const error = await (
              res.json() as Promise<{ error: string }>
            ).catch(() => ({ error: "Unknown error" }));
            throw new Error(error.error || "API request failed");
          }

          if (res.status === 204) return null;
          return await (res.json() as Promise<T>);
        } catch (err) {
          // Remove from pending immediately if it fails so subsequent retries don't get the error
          pendingRequests.delete(cacheKey);
          throw err;
        } finally {
          // Remove from pending after some time to allow deduplication of rapid successive calls
          // but not keep it forever.
          setTimeout(() => {
            pendingRequests.delete(cacheKey);
          }, 100);
        }
      })();
      pendingRequests.set(cacheKey, { promise, timestamp: now });
    }

    if (!signal) return promise as Promise<T>;

    return Promise.race([
      promise as Promise<T>,
      new Promise<T>((_, reject) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal.addEventListener(
          "abort",
          () => {
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      }),
    ]);
  },

  /** Only for testing purposes */
  clearPendingRequests() {
    pendingRequests.clear();
  },
};
