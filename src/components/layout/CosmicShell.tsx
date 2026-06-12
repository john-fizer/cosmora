"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export const CHAPTERS = [
  { label: "COSMOS",    hint: "home base",        href: "/dashboard",          color: "#7B6FD4" },
  { label: "CHART",     hint: "natal wheel",       href: "/dashboard/chart",    color: "#06b6d4" },
  { label: "ORACLE",    hint: "ai readings",       href: "/dashboard/oracle",   color: "#a78bfa" },
  { label: "TRANSITS",  hint: "live sky",          href: "/dashboard/transits", color: "#f59e0b" },
  { label: "MAP",       hint: "astrocartography",  href: "/dashboard/map",      color: "#22c55e" },
] as const;

interface CosmicShellCtx {
  mode: "journey" | "focus";
  activeChapter: number;
  setScrollChapter: (n: number) => void;
}

const CosmicShellContext = createContext<CosmicShellCtx>({
  mode: "focus",
  activeChapter: 0,
  setScrollChapter: () => {},
});

export function useCosmicShell() {
  return useContext(CosmicShellContext);
}

export function CosmicShellProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [scrollChapter, setScrollChapter] = useState(0);

  const isHome = pathname === "/dashboard";
  const mode: "journey" | "focus" = isHome ? "journey" : "focus";

  // On tool pages, find which chapter matches
  const navChapter = (() => {
    if (isHome) return scrollChapter;
    for (let i = CHAPTERS.length - 1; i >= 1; i--) {
      if (pathname.startsWith(CHAPTERS[i].href)) return i;
    }
    return -1;
  })();

  // Reset scroll chapter when leaving home
  useEffect(() => {
    if (!isHome) setScrollChapter(0);
  }, [isHome]);

  // Track scroll on home page to determine active chapter
  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => {
      const vh = window.innerHeight;
      const scrollY = window.scrollY;
      const chapter = Math.min(4, Math.floor((scrollY + vh * 0.3) / vh));
      setScrollChapter(chapter);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  return (
    <CosmicShellContext.Provider value={{ mode, activeChapter: navChapter, setScrollChapter }}>
      {children}
    </CosmicShellContext.Provider>
  );
}
