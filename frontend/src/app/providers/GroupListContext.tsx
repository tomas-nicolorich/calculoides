import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { groupApi, type Group } from "../../entities/group";
import { queryKeys } from "../../shared/api/queryKeys";
import { toApiQueryResult } from "../../shared/api/apiQueryResult";
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
 * independent). Keyed on `["groups"]` (D6), which gets a 5-minute
 * `staleTime` override from `createQueryClient` (D2); enabled only for a
 * signed-in user (A9). The cache is cleared on sign-out/owner change by
 * `AuthProvider` (D5/A7), so the flat key doesn't need to carry the user id
 * itself.
 */
export function GroupListProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const q = useQuery({
    queryKey: queryKeys.groups(),
    queryFn: ({ signal }) => groupApi.list(signal),
    enabled: !!user?.id,
  });
  const { data, loading, error, refresh } = toApiQueryResult<Group[]>(
    q,
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
