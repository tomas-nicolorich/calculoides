import { useState, useEffect } from "react";

export function useApiQuery<T>(
  groupId: string | null,
  fetcher: (groupId: string, signal: AbortSignal) => Promise<T>,
  initialData: T,
) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

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
        if (!cancelled) setLoading(false);
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // fetcher is stable when wrapped in useCallback at the call site
  }, [groupId, fetcher, refreshCount]);

  return { data, loading, error, refresh };
}
