"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "calculoides.sidebarCollapsed";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Desktop sidebar collapse state (68px collapsed / 232px expanded),
 * persisted under `calculoides.sidebarCollapsed`. Direct port of `main`'s
 * `frontend/src/widgets/navigation/model/useSidebarCollapsed.ts`.
 */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(readStored);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return [collapsed, toggle];
}
