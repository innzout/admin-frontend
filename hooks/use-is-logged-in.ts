"use client";

import { useSyncExternalStore } from "react";
import { isLoggedIn } from "@/lib/session";

function subscribe(callback: () => void) {
  // Cross-tab: another tab logging out/in updates localStorage, which fires
  // "storage" here (never in the tab that made the change, by design).
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerSnapshot() {
  return false;
}

/**
 * SSR-safe read of the login flag. Server (and the client's first hydration
 * pass) always sees `false`; React swaps in the real client value right
 * after hydration — no manual "mounted" state, no setState-in-effect.
 */
export function useIsLoggedIn(): boolean {
  return useSyncExternalStore(subscribe, isLoggedIn, getServerSnapshot);
}
