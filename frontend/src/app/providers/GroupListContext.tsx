import { createContext, useCallback, useContext, ReactNode } from "react";
import { groupApi, type Group } from "../../entities/group";
import { useApiQuery } from "../../shared/api/useApiQuery";
import { useAuth } from "./AuthContext";

interface GroupListContextValue {
  groups: Group[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const GroupListContext = createContext<GroupListContextValue | null>(null);

const EMPTY_GROUPS: Group[] = [];

/**
 * Owns the fetched group list, separate from `ActiveGroupContext` (D1 — the
 * "which group" list and "which group is active" concerns stay
 * independent). Keyed on the signed-in user's id via `useApiQuery` (A1) so
 * a re-login refetches.
 */
export function GroupListProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const fetchGroups = useCallback(
    (_userId: string, signal: AbortSignal) => groupApi.list(signal),
    [],
  );

  const { data, loading, error, refresh } = useApiQuery<Group[]>(
    user?.id ?? null,
    fetchGroups,
    EMPTY_GROUPS,
  );

  return (
    <GroupListContext.Provider
      value={{ groups: data, loading, error, refresh }}
    >
      {children}
    </GroupListContext.Provider>
  );
}

export function useGroupList(): GroupListContextValue {
  const ctx = useContext(GroupListContext);
  if (!ctx)
    throw new Error("useGroupList must be used within GroupListProvider");
  return ctx;
}
