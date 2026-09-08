"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
  mql.addEventListener("change", callback);
  return () => {
    mql.removeEventListener("change", callback);
  };
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
}

/** SSR-safe default: `false` until mounted, per ADR-3's "narrower scope" decision. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * `matchMedia`-backed mobile breakpoint hook, scoped to `ResponsiveDialog`
 * only per ADR-3 — the shell itself branches with CSS (`hidden md:flex` /
 * `md:hidden`) to avoid an SSR-first-paint flash. `useSyncExternalStore`
 * subscribes to the browser API without a set-state-in-effect anti-pattern
 * and keeps the server/client first-render snapshot consistent.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
