import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

export const ACTIVE_GROUP_STORAGE_KEY = "calculoides.activeGroupId";

interface ActiveGroupContextType {
  groupId: string | null;
  setGroupId: (id: string | null) => void;
}

const ActiveGroupContext = createContext<ActiveGroupContextType | null>(null);

function readStoredGroupId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY);
}

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Optimistic restore (A2): read the persisted id synchronously in the
  // initializer so there is no render where `groupId` is `null` before the
  // real value is known — this is what avoids the gated Savings item
  // flickering on every login/reload. `ActiveGroupSync` (A3) validates this
  // value against the fetched group list once it settles.
  const [groupId, setGroupId] = useState<string | null>(readStoredGroupId);

  useEffect(() => {
    if (groupId) {
      localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, groupId);
    } else {
      localStorage.removeItem(ACTIVE_GROUP_STORAGE_KEY);
    }
  }, [groupId]);

  // Clear when the user transitions to signed-out (A4) — covers the
  // explicit Sign Out button as well as token expiry / a `SIGNED_OUT`
  // event arriving from another tab, not just one code path.
  useEffect(() => {
    if (user === null) {
      // External auth state (Supabase session), not derived from React
      // state; there is no non-effect place to react to "user became null".
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGroupId(null);
    }
  }, [user]);

  return (
    <ActiveGroupContext.Provider value={{ groupId, setGroupId }}>
      {children}
    </ActiveGroupContext.Provider>
  );
}

export function useActiveGroup() {
  const ctx = useContext(ActiveGroupContext);
  if (!ctx)
    throw new Error("useActiveGroup must be used within ActiveGroupProvider");
  return ctx.groupId;
}

export function useSetActiveGroup(groupId: string | undefined) {
  const ctx = useContext(ActiveGroupContext);
  if (!ctx)
    throw new Error(
      "useSetActiveGroup must be used within ActiveGroupProvider",
    );
  const { setGroupId } = ctx;
  // D4: no longer nulls `groupId` on unmount — switching between
  // group-scoped routes (or elsewhere and back) must not drop the active
  // group. Persistence + sign-out clearing now own the "when does the
  // active group go away" question instead.
  useEffect(() => {
    if (groupId) setGroupId(groupId);
  }, [groupId, setGroupId]);
}

/** Direct setter for the group switcher and `ActiveGroupSync`. */
export function useActiveGroupSetter() {
  const ctx = useContext(ActiveGroupContext);
  if (!ctx)
    throw new Error(
      "useActiveGroupSetter must be used within ActiveGroupProvider",
    );
  return ctx.setGroupId;
}
