import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface ActiveGroupContextType {
  groupId: string | null;
  setGroupId: (id: string | null) => void;
}

const ActiveGroupContext = createContext<ActiveGroupContextType | null>(null);

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const [groupId, setGroupId] = useState<string | null>(null);
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
  useEffect(() => {
    if (groupId) setGroupId(groupId);
    return () => {
      setGroupId(null);
    };
  }, [groupId, setGroupId]);
}
