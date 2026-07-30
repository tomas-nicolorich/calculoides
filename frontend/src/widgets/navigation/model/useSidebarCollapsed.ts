import { useCallback, useState } from "react";

const STORAGE_KEY = "calculoides.sidebarCollapsed";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Desktop sidebar collapse state (68px collapsed / 232px expanded),
 * persisted under `calculoides.sidebarCollapsed`.
 */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(readStored);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return [collapsed, toggle];
}
