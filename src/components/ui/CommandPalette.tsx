"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { PLANET_META, PLANET_ORDER } from "@/lib/astrology/planetMeta";
import { useWarpTo } from "@/components/ui/WarpTransition";
import type { PlanetName } from "@/lib/astrology/types";

// ─── Command registry ─────────────────────────────────────────────────────────

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: string;
  category: "Navigate" | "Planets" | "Actions";
  color?: string;
  action: (router: ReturnType<typeof useRouter>, warpTo: (h: string) => void) => void;
  keywords?: string[];
}

const PAGE_COMMANDS: Command[] = [
  {
    id: "nav-home",
    label: "Dashboard",
    description: "Your cosmic home base",
    icon: "◎",
    category: "Navigate",
    color: "#a78bfa",
    action: (r) => r.push("/dashboard"),
    keywords: ["home", "overview", "dashboard"],
  },
  {
    id: "nav-chart",
    label: "Birth Chart",
    description: "Wheel, positions, patterns",
    icon: "◉",
    category: "Navigate",
    color: "#06b6d4",
    action: (r) => r.push("/dashboard/chart"),
    keywords: ["chart", "wheel", "natal", "birth"],
  },
  {
    id: "nav-transits",
    label: "Live Transits",
    description: "Real-time sky to natal aspects",
    icon: "✷",
    category: "Navigate",
    color: "#22c55e",
    action: (r) => r.push("/dashboard/transits"),
    keywords: ["transits", "live", "aspects", "current"],
  },
  {
    id: "nav-insights",
    label: "Insights",
    description: "Progressions, timing, synastry",
    icon: "◈",
    category: "Navigate",
    color: "#f59e0b",
    action: (r) => r.push("/dashboard/insights"),
    keywords: ["insights", "progressions", "timing"],
  },
  {
    id: "nav-timeline",
    label: "Timeline",
    description: "Profection year & upcoming events",
    icon: "◷",
    category: "Navigate",
    color: "#f472b6",
    action: (r) => r.push("/dashboard/timeline"),
    keywords: ["timeline", "profection", "year", "events"],
  },
  {
    id: "nav-compatibility",
    label: "Compatibility",
    description: "Synastry & composite charts",
    icon: "⟡",
    category: "Navigate",
    color: "#fb923c",
    action: (r) => r.push("/dashboard/compatibility"),
    keywords: ["compatibility", "synastry", "composite", "match"],
  },
  {
    id: "nav-solar-return",
    label: "Solar Return",
    description: "Your year-ahead chart",
    icon: "☀",
    category: "Navigate",
    color: "#ffd700",
    action: (r) => r.push("/dashboard/solar-return"),
    keywords: ["solar", "return", "birthday", "year ahead"],
  },
  {
    id: "nav-oracle",
    label: "Oracle",
    description: "AI astrology Q&A",
    icon: "◬",
    category: "Navigate",
    color: "#7B6FD4",
    action: (r) => r.push("/dashboard/oracle"),
    keywords: ["oracle", "ai", "chat", "ask", "question"],
  },
  {
    id: "nav-electional",
    label: "Electional Timing",
    description: "Find the best planetary hours for any activity",
    icon: "◷",
    category: "Navigate",
    color: "#22c55e",
    action: (r) => r.push("/dashboard/electional"),
    keywords: ["electional", "timing", "best time", "planetary hours", "schedule"],
  },
  {
    id: "nav-briefing",
    label: "Daily Briefing",
    description: "Morning cosmic weather & planetary hours",
    icon: "✦",
    category: "Navigate",
    color: "#f59e0b",
    action: (r) => r.push("/dashboard/briefing"),
    keywords: ["briefing", "daily", "morning", "planetary hours", "today"],
  },
  {
    id: "nav-report",
    label: "Natal Report",
    description: "AI-generated 8-chapter natal chart interpretation",
    icon: "✦",
    category: "Navigate",
    color: "#BFB6E8",
    action: (r) => r.push("/dashboard/report"),
    keywords: ["report", "natal report", "interpretation", "reading", "chapters", "generate"],
  },
  {
    id: "nav-settings",
    label: "Settings",
    description: "Profile & preferences",
    icon: "⊙",
    category: "Navigate",
    color: "#64748b",
    action: (r) => r.push("/dashboard/settings"),
    keywords: ["settings", "profile", "preferences"],
  },
];

const ACTION_COMMANDS: Command[] = [
  {
    id: "action-ask-oracle",
    label: "Ask Oracle",
    description: "Open AI oracle chat",
    icon: "✶",
    category: "Actions",
    color: "#9C8AC4",
    action: (r) => r.push("/dashboard/oracle"),
    keywords: ["ask", "oracle", "ai", "question", "reading"],
  },
  {
    id: "action-view-transits",
    label: "Live Transits",
    description: "See real-time sky aspects",
    icon: "◉",
    category: "Actions",
    color: "#22c55e",
    action: (r) => r.push("/dashboard/transits"),
    keywords: ["transits", "live", "today", "sky"],
  },
  {
    id: "action-profection-year",
    label: "My Profection Year",
    description: "Annual timing & lord of year",
    icon: "✦",
    category: "Actions",
    color: "#f59e0b",
    action: (r) => r.push("/dashboard/timeline"),
    keywords: ["profection", "year", "lord", "timing", "annual"],
  },
];

const HOUSE_THEMES = ["Self","Wealth","Mind","Home","Creativity","Health","Partners","Transformation","Philosophy","Career","Networks","Undoing"];

const HOUSE_COMMANDS: Command[] = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  return {
    id: `house-${n}`,
    label: `House ${n}`,
    description: HOUSE_THEMES[i],
    icon: `${n}`,
    category: "Navigate" as const,
    color: "#7B6FD4",
    action: (_r, warpTo) => warpTo(`/dashboard/chart/house/${n}`),
    keywords: ["house", `house ${n}`, `h${n}`, HOUSE_THEMES[i].toLowerCase()],
  };
});

const PLANET_COMMANDS: Command[] = PLANET_ORDER.map((name) => {
  const meta = PLANET_META[name as PlanetName]!;
  return {
    id: `planet-${name.toLowerCase()}`,
    label: `${name}`,
    description: `${meta.archetype} · ${meta.keywords.slice(0, 2).join(", ")}`,
    icon: meta.glyph,
    category: "Planets",
    color: meta.color,
    action: (_, warpTo) => warpTo(`/dashboard/chart/${name.toLowerCase()}`),
    keywords: [name.toLowerCase(), meta.archetype.toLowerCase(), ...meta.keywords.map(k => k.toLowerCase())],
  };
});

const ALL_COMMANDS: Command[] = [...PAGE_COMMANDS, ...PLANET_COMMANDS, ...HOUSE_COMMANDS, ...ACTION_COMMANDS];

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

function score(cmd: Command, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const label = cmd.label.toLowerCase();
  const desc = (cmd.description ?? "").toLowerCase();
  const kws = (cmd.keywords ?? []).join(" ");

  if (label.startsWith(q)) return 100;
  if (label.includes(q)) return 80;
  if (desc.includes(q)) return 60;
  if (kws.includes(q)) return 40;

  // char-by-char fuzzy
  let ci = 0;
  for (const ch of label + " " + desc) {
    if (ch === q[ci]) ci++;
    if (ci === q.length) return 20;
  }
  return 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const warpTo = useWarpTo();

  const results = useMemo(() => {
    const scored = ALL_COMMANDS
      .map(cmd => ({ cmd, s: score(cmd, query) }))
      .filter(x => x.s > 0)
      .sort((a, b) => {
        if (b.s !== a.s) return b.s - a.s;
        // Keep category order
        const catOrder = ["Navigate", "Planets", "Actions"];
        return catOrder.indexOf(a.cmd.category) - catOrder.indexOf(b.cmd.category);
      });
    return scored.map(x => x.cmd);
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected(0);
  }, []);

  const runSelected = useCallback(() => {
    const cmd = results[selected];
    if (!cmd) return;
    close();
    cmd.action(router, warpTo);
  }, [results, selected, close, router, warpTo]);

  // Global keydown listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Open: Cmd+K or Ctrl+K, or "/" when not in a text field
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
        return;
      }
      if (e.key === "/" && !open) {
        const tag = (e.target as HTMLElement).tagName.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && !(e.target as HTMLElement).isContentEditable) {
          e.preventDefault();
          setOpen(true);
          return;
        }
      }
      if (!open) return;

      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        runSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close, results.length, runSelected]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelected(0);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // Reset selection when results change
  useEffect(() => { setSelected(0); }, [results.length]);

  // Group visible results by category for rendering
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of results) {
      const arr = map.get(cmd.category) ?? [];
      arr.push(cmd);
      map.set(cmd.category, arr);
    }
    return map;
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            style={{
              position: "fixed", inset: 0, zIndex: 900,
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />

          {/* Palette */}
          <motion.div
            key="cp-panel"
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              top: "18%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(640px, calc(100vw - 32px))",
              zIndex: 901,
              background: "rgba(4, 4, 24, 0.96)",
              border: "1px solid rgba(123,111,212,0.32)",
              borderRadius: 18,
              boxShadow: "0 0 0 1px rgba(6,182,212,0.08), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(123,111,212,0.12)",
              overflow: "hidden",
            }}
          >
            {/* HUD corner brackets */}
            {(["tl","tr","bl","br"] as const).map(c => (
              <div
                key={c}
                aria-hidden
                style={{
                  position: "absolute",
                  width: 12, height: 12,
                  top: c.startsWith("t") ? 0 : undefined,
                  bottom: c.startsWith("b") ? 0 : undefined,
                  left: c.endsWith("l") ? 0 : undefined,
                  right: c.endsWith("r") ? 0 : undefined,
                  borderTop: c.startsWith("t") ? "1px solid rgba(6,182,212,0.5)" : undefined,
                  borderBottom: c.startsWith("b") ? "1px solid rgba(6,182,212,0.5)" : undefined,
                  borderLeft: c.endsWith("l") ? "1px solid rgba(6,182,212,0.5)" : undefined,
                  borderRight: c.endsWith("r") ? "1px solid rgba(6,182,212,0.5)" : undefined,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            ))}

            {/* Search input */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ fontSize: 16, color: "#475569", flexShrink: 0 }}>⌘</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search pages, planets, actions…"
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "#f1f5f9", fontSize: 15, fontFamily: "inherit",
                  caretColor: "#a78bfa",
                }}
              />
              <kbd style={{
                fontSize: 13, letterSpacing: 1, color: "#334155",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 5, padding: "3px 7px", flexShrink: 0,
              }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              style={{ maxHeight: 380, overflowY: "auto", padding: "8px 0" }}
            >
              {results.length === 0 ? (
                <div style={{ padding: "24px 20px", color: "#334155", fontSize: 13, textAlign: "center" }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                Array.from(grouped.entries()).map(([category, cmds]) => (
                  <div key={category}>
                    <div style={{
                      padding: "8px 18px 4px",
                      fontSize: 13, letterSpacing: 3,
                      color: "#334155", textTransform: "uppercase",
                    }}>
                      {category}
                    </div>
                    {cmds.map(cmd => {
                      const globalIdx = results.indexOf(cmd);
                      const isSelected = globalIdx === selected;
                      return (
                        <div
                          key={cmd.id}
                          onClick={() => { close(); cmd.action(router, warpTo); }}
                          onMouseEnter={() => setSelected(globalIdx)}
                          style={{
                            display: "flex", alignItems: "center", gap: 14,
                            padding: "9px 18px", cursor: "pointer",
                            background: isSelected ? "rgba(123,111,212,0.15)" : "transparent",
                            borderLeft: isSelected ? `2px solid ${cmd.color ?? "#a78bfa"}` : "2px solid transparent",
                            transition: "background 0.12s",
                          }}
                        >
                          <span style={{
                            fontSize: 18, width: 28, textAlign: "center",
                            color: cmd.color ?? "#94a3b8",
                            filter: isSelected ? `drop-shadow(0 0 6px ${cmd.color})` : "none",
                            transition: "filter 0.15s",
                            flexShrink: 0,
                          }}>
                            {cmd.icon}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600,
                              color: isSelected ? "#f1f5f9" : "#94a3b8",
                              transition: "color 0.12s",
                            }}>
                              {cmd.label}
                            </div>
                            {cmd.description && (
                              <div style={{ fontSize: 13, color: "#334155", marginTop: 1 }}>
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <kbd style={{
                              fontSize: 13, letterSpacing: 1, color: "#475569",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 5, padding: "3px 7px", flexShrink: 0,
                            }}>
                              ↵
                            </kbd>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: "8px 18px",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", gap: 12,
              fontSize: 13, letterSpacing: 1.5, color: "#1e293b",
            }}>
              <span>↑↓ Navigate</span>
              <span style={{ color: "#0f172a" }}>·</span>
              <span>↵ Open</span>
              <span style={{ color: "#0f172a" }}>·</span>
              <span>Esc Close</span>
              <span style={{ marginLeft: "auto" }}>⌘K or /</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
