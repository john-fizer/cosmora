"use client";

import { useSyncExternalStore } from "react";
import { getGuideMode, type GuideMode } from "@/lib/storage";

function subscribe(onChange: () => void) {
  window.addEventListener("cosmora-guide-mode", onChange);
  return () => window.removeEventListener("cosmora-guide-mode", onChange);
}

/**
 * The global Star/Spirit guide-mode preference, live-updating whenever any
 * open tab calls setGuideMode (which dispatches `cosmora-guide-mode`).
 * Replaces the useState(() => "star") + useEffect(setMode(getGuideMode());
 * addEventListener(...)) pattern duplicated across several components.
 */
export function useGuideMode(): GuideMode {
  return useSyncExternalStore(subscribe, getGuideMode, () => "star");
}
