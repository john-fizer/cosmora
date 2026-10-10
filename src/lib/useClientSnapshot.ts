"use client";

import { useRef, useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

export interface ClientSnapshot<T> {
  value: T;
  /** True until the client-only read has happened once (i.e. during SSR and the first paint). */
  loading: boolean;
}

/**
 * Reads a value that only exists client-side (localStorage, etc.) without
 * the `useState(initial) + useEffect(() => setState(read()))` pattern,
 * which calls setState synchronously inside an effect body.
 *
 * Returns `{ value: fallback, loading: true }` on the server and on the
 * client's first paint (so hydration always has something to agree on),
 * then calls `read()` once, caching the result for the lifetime of this
 * hook instance — matching the read-once-on-mount behavior the
 * effect-based pattern had, without ever calling setState from an effect.
 */
export function useClientSnapshot<T>(read: () => T, fallback: T): ClientSnapshot<T> {
  const cache = useRef<ClientSnapshot<T> | null>(null);
  const serverSnapshot = useRef<ClientSnapshot<T>>({ value: fallback, loading: true });
  return useSyncExternalStore(
    subscribeNever,
    () => {
      if (cache.current === null) cache.current = { value: read(), loading: false };
      return cache.current;
    },
    () => serverSnapshot.current,
  );
}
