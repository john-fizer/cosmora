"use client";

import { useRef, useCallback, useSyncExternalStore } from "react";

/**
 * A live-ticking Date, safe for SSR: null on the server and on the client's
 * first paint (so hydration always has something to agree on), then a real
 * Date updated every `intervalMs`.
 *
 * Replaces `useState(new Date()) + useEffect(() => setInterval(...))`, which
 * evaluates a fresh instant during both the server render and the client's
 * first render — two different instants, so anything rendered from it
 * (a formatted time/date string) hydration-mismatches.
 */
export function useTickingClock(intervalMs: number): Date | null {
  const tickRef = useRef<Date | null>(null);
  const subscribe = useCallback(
    (onChange: () => void) => {
      tickRef.current = new Date();
      const id = setInterval(() => {
        tickRef.current = new Date();
        onChange();
      }, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs],
  );
  const getSnapshot = useCallback(() => tickRef.current, []);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
