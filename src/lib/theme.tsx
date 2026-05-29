"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "cosmic" | "matrix" | "cyberpunk" | "alien" | "blood-moon" | "solar";

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "cosmic", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("cosmic");

  useEffect(() => {
    const stored = localStorage.getItem("cosmora-theme") as ThemeId | null;
    if (stored) apply(stored);
  }, []);

  function apply(t: ThemeId) {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("cosmora-theme", t);
  }

  return <Ctx.Provider value={{ theme, setTheme: apply }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
