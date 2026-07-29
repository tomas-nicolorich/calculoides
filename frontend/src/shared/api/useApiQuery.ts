import { useState, useEffect } from "react";

export function useApiQuery<T>(
  groupId: string | null,
  fetcher: (groupId: string, signal: AbortSignal) => Promise<T>,
  initialData: T,
) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(!!groupId);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [settledGroupId, setSettledGroupId] = useState<string | null>(null);

  const refresh = () => {
    setRefreshCount((c) => c + 1);
  };

  useEffect(() => {
    if (!groupId) return;
    const controller = new AbortController();
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher(groupId, controller.signal);
        if (!cancelled) setData(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSettledGroupId(groupId);
        }
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // fetcher is stable when wrapped in useCallback at the call site
  }, [groupId, fetcher, refreshCount]);

  // `loading` is true for every fetch (initial + refresh) so existing
  // consumers keep their current behavior unchanged. `isInitialLoading` is
  // only true until the first fetch for the *current* groupId has settled,
  // for consumers that want full-surface loading UI reserved for the initial
  // mount (and for a group switch) but not for a same-group refresh.
  const isInitialLoading = loading && settledGroupId !== groupId;

  return { data, loading, error, refresh, isInitialLoading };
}
