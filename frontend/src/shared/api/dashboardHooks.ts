import { useState, useEffect } from 'react';
import { apiClient } from './client';
import { 
  DashboardSummary, 
  CategoryWithBalances, 
  ExpensesList,
  TransfersList
} from '../../../../shared/src/types/redesign';

export function useDashboardSummary(groupId: string | null) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = () => { setRefreshCount(c => c + 1); };

  useEffect(() => {
    if (!groupId) return;
    
    const controller = new AbortController();
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiClient.fetch<DashboardSummary>(`/summary?groupId=${groupId}`, {
          signal: controller.signal
        });
        setData(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();

    return () => {
      controller.abort();
    };
  }, [groupId, refreshCount]);

  return { data, loading, error, refresh };
}

export function useCategoriesList(groupId: string | null) {
  const [data, setData] = useState<CategoryWithBalances[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = () => { setRefreshCount(c => c + 1); };

  useEffect(() => {
    if (!groupId) return;
    
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await apiClient.fetch<CategoryWithBalances[]>(`/categories?groupId=${groupId}`, {
          signal: controller.signal
        });
        setData(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();

    return () => {
      controller.abort();
    };
  }, [groupId, refreshCount]);

  return { data, loading, error, refresh };
}

export function useExpensesList(groupId: string | null, categoryId?: string, memberId?: string, limit = 20, offset = 0) {
  const [data, setData] = useState<ExpensesList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = () => { setRefreshCount(c => c + 1); };

  useEffect(() => {
    if (!groupId) return;
    
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ groupId, limit: limit.toString(), offset: offset.toString() });
        if (categoryId) params.append('categoryId', categoryId);
        if (memberId) params.append('memberId', memberId);

        const result = await apiClient.fetch<ExpensesList>(`/expenses?${params.toString()}`, {
          signal: controller.signal
        });
        setData(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();

    return () => {
      controller.abort();
    };
  }, [groupId, categoryId, memberId, limit, offset, refreshCount]);

  return { data, loading, error, refresh };
}

export function useTransfersList(groupId: string | null, limit = 20, offset = 0) {
  const [data, setData] = useState<TransfersList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = () => { setRefreshCount(c => c + 1); };

  useEffect(() => {
    if (!groupId) return;
    
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ groupId, limit: limit.toString(), offset: offset.toString() });
        const result = await apiClient.fetch<TransfersList>(`/transfers?${params.toString()}`, {
          signal: controller.signal
        });
        setData(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchData();

    return () => {
      controller.abort();
    };
  }, [groupId, limit, offset, refreshCount]);

  return { data, loading, error, refresh };
}
