import { useState, useEffect } from 'react';
import { apiClient } from './client';

interface ContributionBreakdown {
  memberId: string;
  proportionalAmount: number;
  actualAmount: number;
  isOverridden: boolean;
  user?: {
    name: string | null;
    email: string;
  };
}

interface SavingsGoal {
  id: string;
  groupId: string;
  name: string;
  targetAmount: number;
  startingAmount: number;
  targetDate: string;
  projectedDate: string;
  varianceMonths: number;
  breakdown: ContributionBreakdown[];
}

export function useSavingsGoals(groupId: string | null) {
  const [data, setData] = useState<SavingsGoal[]>([]);
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
        const result = await apiClient.savings.list(groupId);
        // Note: apiClient.savings.list currently doesn't take signal, 
        // but we'll use it if we update apiClient later.
        // For now, it uses apiClient.fetch which does take signal.
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
