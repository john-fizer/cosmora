"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { GuideModeToggle } from "@/components/ui/GuideModeToggle";
import { useSubscription } from "@/lib/useSubscription";
import { useCosmicShell, CHAPTERS } from "@/components/layout/CosmicShell";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 26 };

const NAV_ITEMS = [
  {
    label: "Home",
    hint: "overview",
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
        <line x1="12" y1="3" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="21" />
        <line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    label: "Briefing",
    hint: "daily intel",
    href: "/dashboard/briefing",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        <path d="M19 3v4M21 5h-4" />
      </svg>
    ),
  },
  {
    label: "Chart",
    hint: "natal wheel",
    href: "/dashboard/chart",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" />
        <line x1="12" y1="3" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="21" />
        <line x1="3" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    label: "Transits",
    hint: "live sky",
    href: "/dashboard/transits",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M12 2L12 6M12 18L12 22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    label: "Insights",
    hint: "synthesis",
    href: "/dashboard/insights",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    label: "Timeline",
    hint: "life arc",
    href: "/dashboard/timeline",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12,7 12,12 16,14" />
      </svg>
    ),
  },
  {
    label: "Timing",
    hint: "elections",
    href: "/dashboard/electional",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
        <path d="M16.5 3.5l1 1.5M7.5 3.5l-1 1.5" />
      </svg>
    ),
  },
  {
    label: "Windows",
    hint: "pressure & timing",
    href: "/dashboard/pressure",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 5v3M12 16v3M5 12h3M16 12h3" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    label: "Unions",
    hint: "marriage patterns",
    href: "/dashboard/marriages",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="9" cy="12" r="5.5" />
        <circle cx="15" cy="12" r="5.5" />
      </svg>
    ),
  },
  {
    label: "Match",
    hint: "synastry",
    href: "/dashboard/compatibility",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: "Solar Rtn",
    hint: "year ahead",
    href: "/dashboard/solar-return",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    label: "Firdaria",
    hint: "persian periods",
    href: "/dashboard/firdaria",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.7" />
        <path d="M8 9.5C9 8 11 7.5 12 7.5" strokeOpacity="0.5" />
        <path d="M16 9.5C15 8 13 7.5 12 7.5" strokeOpacity="0.5" />
        <path d="M7 14h10" strokeOpacity="0.4" />
      </svg>
    ),
  },
  {
    label: "Progressions",
    hint: "secondary prog",
    href: "/dashboard/progressions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" strokeOpacity="0.4" />
        <path d="M12 3 L12 7M12 17 L12 21" strokeOpacity="0.6" />
        <path d="M7 12 L12 12 L16 9" />
      </svg>
    ),
  },
  {
    label: "Vedic",
    hint: "jyotish / nakshatra",
    href: "/dashboard/vedic",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M12 3 L14.5 9 L21 9 L16 13.5 L18 20 L12 16 L6 20 L8 13.5 L3 9 L9.5 9 Z" />
      </svg>
    ),
  },
  {
    label: "Releasing",
    hint: "zodiacal releasing",
    href: "/dashboard/releasing",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 C12 3 16 7 16 12 C16 17 12 21 12 21" />
        <path d="M12 3 C12 3 8 7 8 12 C8 17 12 21 12 21" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6" />
        <path d="M3 12 h18" strokeOpacity="0.4" />
      </svg>
    ),
  },
  {
    label: "Prism",
    hint: "derived houses",
    href: "/dashboard/prism",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M12 3 L21 19 H3 Z" />
        <path d="M12 3 L5 19" strokeOpacity="0.5" />
        <path d="M12 3 L8 19" strokeOpacity="0.35" />
        <path d="M12 3 L15 19" strokeOpacity="0.35" />
        <path d="M12 3 L19 19" strokeOpacity="0.5" />
      </svg>
    ),
  },
  {
    label: "Map",
    hint: "astrocartography",
    href: "/dashboard/map",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12 C6 8 10 6 12 12 C14 18 18 16 21 12" />
        <path d="M12 3 C10 7 10 9 12 12 C14 15 14 17 12 21" />
        <ellipse cx="12" cy="12" rx="9" ry="4" />
      </svg>
    ),
  },
  {
    label: "Temporal",
    hint: "time oracle",
    href: "/dashboard/temporal",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
        <path d="M5 5l1.5 1.5M19 5l-1.5 1.5" strokeOpacity="0.5" />
        <path d="M7 3.5C8.5 2.5 10.2 2 12 2" strokeOpacity="0.4" />
        <path d="M17 3.5C15.5 2.5 13.8 2 12 2" strokeOpacity="0.4" />
      </svg>
    ),
  },
  {
    label: "Oracle",
    hint: "ai readings",
    href: "/dashboard/oracle",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
        <path d="M8.5 8.5c1-1.5 5-1.5 6 0M8 15.5c1 1.5 6 1.5 7 0" />
      </svg>
    ),
  },
  {
    label: "Reports",
    hint: "intelligence",
    href: "/dashboard/reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M9 12h6M9 16h4M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
        <path d="M9 8h6" />
      </svg>
    ),
  },
  {
    label: "Settings",
    hint: "profile",
    href: "/dashboard/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

// ─── Journey Mode Sidebar (home page) ────────────────────────────────────────

function JourneySidebar({ pathname }: { pathname: string }) {
  const { activeChapter } = useCosmicShell();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { isPro, loading: subLoading } = useSubscription();

  return (
    <motion.aside
      initial={{ x: -44, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 h-full z-50 hidden md:flex flex-col items-center liquid-glass-strong"
      style={{ width: 44, padding: "20px 0" }}
    >
      {/* Logo mark */}
      <Link href="/">
        <motion.div
          whileHover={{ scale: 1.1 }}
          style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: "var(--logo-gradient)",
            boxShadow: "0 2px 12px rgba(200,165,91,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="#08080F" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
            <line x1="12" y1="3" x2="12" y2="8" /><line x1="12" y1="16" x2="12" y2="21" />
            <line x1="3" y1="12" x2="8" y2="12" /><line x1="16" y1="12" x2="21" y2="12" />
          </svg>
        </motion.div>
      </Link>

      {/* Top hairline */}
      <div style={{ height: 1, width: 20, background: "var(--border)", margin: "14px 0" }} />

      {/* Chapter dots */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        {CHAPTERS.map((chapter, i) => {
          const isActive = activeChapter === i;
          const isHovered = hoveredIdx === i;

          return (
            <Link key={chapter.href} href={chapter.href} style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <motion.div
                onHoverStart={() => setHoveredIdx(i)}
                onHoverEnd={() => setHoveredIdx(null)}
                style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, cursor: "pointer" }}
              >
                {/* Glow ring for active */}
                {isActive && (
                  <motion.div
                    layoutId="journey-active-ring"
                    style={{
                      position: "absolute",
                      width: 20, height: 20,
                      borderRadius: "50%",
                      border: `1.5px solid ${chapter.color}`,
                      boxShadow: `0 0 10px ${chapter.color}60, 0 0 20px ${chapter.color}30`,
                    }}
                  />
                )}

                {/* Dot */}
                <motion.div
                  animate={{
                    width: isActive ? 8 : isHovered ? 7 : 6,
                    height: isActive ? 8 : isHovered ? 7 : 6,
                    background: isActive ? chapter.color : isHovered ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)",
                    boxShadow: isActive ? `0 0 8px ${chapter.color}` : "none",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  style={{ borderRadius: "50%", flexShrink: 0 }}
                />

                {/* Tooltip flyout */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: "absolute",
                        left: 28,
                        top: "50%", transform: "translateY(-50%)",
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                        background: "rgba(4,4,28,0.95)",
                        border: `1px solid ${chapter.color}30`,
                        borderRadius: 8,
                        padding: "5px 10px",
                        backdropFilter: "blur(16px)",
                        zIndex: 100,
                      }}
                    >
                      <p style={{
                        fontFamily: "'Fragment Mono', monospace",
                        fontSize: 11, letterSpacing: "0.14em",
                        color: chapter.color, textTransform: "uppercase",
                        marginBottom: 2,
                      }}>
                        {chapter.label}
                      </p>
                      <p style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 12, fontStyle: "italic",
                        color: "rgba(200,190,178,0.5)",
                      }}>
                        {chapter.hint}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div style={{ height: 1, width: 20, background: "var(--border)", margin: "14px 0" }} />

      {/* Upgrade dot */}
      {!subLoading && !isPro && (
        <Link href="/dashboard/upgrade" style={{ marginBottom: 10 }}>
          <motion.div
            whileHover={{ scale: 1.15 }}
            style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "rgba(123,111,212,0.15)",
              border: "1.5px solid rgba(123,111,212,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
            title="Upgrade to Pro"
          >
            <span style={{ fontSize: 9, color: "rgba(168,140,255,0.85)" }}>✦</span>
          </motion.div>
        </Link>
      )}

      <ThemeSwitcher />
    </motion.aside>
  );
}

// ─── Focus Mode Sidebar (tool pages) ─────────────────────────────────────────

function FocusSidebar({ pathname }: { pathname: string }) {
  const [expanded, setExpanded] = useState(false);
  const { isPro, loading: subLoading } = useSubscription();

  return (
    <motion.aside
      animate={{ width: expanded ? 196 : 56 }}
      transition={SPRING}
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
      className="fixed left-0 top-0 h-full z-50 hidden md:flex flex-col liquid-glass-strong"
      style={{ overflow: "hidden" }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 12px 14px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <motion.div
            animate={{ scale: expanded ? 1 : 0.9 }}
            transition={SPRING}
            style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: "var(--logo-gradient)",
              boxShadow: expanded ? "0 4px 20px rgba(200,165,91,0.28)" : "0 2px 8px rgba(200,165,91,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "box-shadow 0.3s",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="#08080F" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="3" x2="12" y2="8" /><line x1="12" y1="16" x2="12" y2="21" />
              <line x1="3" y1="12" x2="8" y2="12" /><line x1="16" y1="12" x2="21" y2="12" />
            </svg>
          </motion.div>
          <motion.span
            animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -6 }}
            transition={{ ...SPRING, delay: expanded ? 0.06 : 0 }}
            style={{
              fontFamily: "'Fragment Mono', monospace",
              fontSize: 14, letterSpacing: "0.18em",
              color: "var(--solar)", textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Cosmora
          </motion.span>
        </Link>
      </div>

      {/* Top hairline */}
      <div style={{ height: 1, background: "var(--border)", margin: "0 10px 6px", flexShrink: 0 }} />

      {/* Nav */}
      <nav
        style={{
          flex: 1, padding: "2px 6px",
          overflowY: "auto", overflowX: "hidden",
          scrollbarWidth: "none",
        }}
      >
        {NAV_ITEMS.map((item, i) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none", display: "block" }}>
              <motion.div
                animate={{
                  opacity: active ? 1 : expanded ? 0.72 : 0.36,
                  paddingLeft: expanded ? 10 : 0,
                  paddingRight: expanded ? 10 : 0,
                  justifyContent: expanded ? "flex-start" : "center",
                }}
                whileHover={{ opacity: 1 }}
                transition={SPRING}
                className={active ? "liquid-glass-cosmos" : ""}
                style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 10,
                  paddingTop: 7, paddingBottom: 7,
                  borderRadius: 9, cursor: "pointer", marginBottom: 1,
                  background: active ? undefined : "transparent",
                }}
              >
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }}
                      style={{
                        position: "absolute", left: 0,
                        top: "20%", bottom: "20%", width: 2,
                        borderRadius: 2, background: "var(--solar)",
                        transformOrigin: "center",
                      }}
                    />
                  )}
                </AnimatePresence>

                <motion.div
                  animate={{ scale: expanded ? 1 : 0.86 }}
                  transition={SPRING}
                  style={{
                    color: active ? "var(--nav-active-text)" : "var(--nav-inactive-text)",
                    flexShrink: 0, display: "flex", alignItems: "center",
                  }}
                >
                  {item.icon}
                </motion.div>

                <motion.div
                  animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -5 }}
                  transition={{ ...SPRING, delay: expanded ? i * 0.016 : 0 }}
                  style={{ overflow: "hidden", whiteSpace: "nowrap", lineHeight: 1.1 }}
                >
                  <div style={{
                    fontFamily: "'Fragment Mono', monospace",
                    fontSize: 13, letterSpacing: "0.10em",
                    color: active ? "var(--solar)" : "rgba(240,237,232,0.88)",
                    textTransform: "uppercase", marginBottom: 2,
                  }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 14, letterSpacing: "0.02em",
                    color: "rgba(200,190,178,0.38)", fontStyle: "italic",
                  }}>
                    {item.hint}
                  </div>
                </motion.div>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ height: 1, background: "var(--border)", margin: "6px 10px 10px" }} />

        {!subLoading && !isPro && (
          <Link href="/dashboard/upgrade" style={{ textDecoration: "none", display: "block", padding: "0 8px 8px" }}>
            <motion.div
              animate={{ opacity: expanded ? 1 : 0.5 }}
              whileHover={{ opacity: 1 }}
              transition={SPRING}
              style={{
                borderRadius: 9, padding: expanded ? "8px 10px" : "7px 0",
                display: "flex", alignItems: "center", gap: 8,
                justifyContent: expanded ? "flex-start" : "center",
                background: "rgba(123,111,212,0.08)",
                border: "1px solid rgba(123,111,212,0.22)",
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>✦</span>
              <motion.span
                animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
                transition={{ ...SPRING, delay: expanded ? 0.06 : 0 }}
                style={{
                  fontFamily: "'Fragment Mono', monospace",
                  fontSize: 10, letterSpacing: "0.18em",
                  color: "rgba(168,140,255,0.85)",
                  textTransform: "uppercase", whiteSpace: "nowrap",
                }}
              >
                Upgrade to Pro
              </motion.span>
            </motion.div>
          </Link>
        )}

        {/* Guide mode — visible when expanded */}
        <motion.div
          animate={{ opacity: expanded ? 1 : 0, height: expanded ? "auto" : 0 }}
          transition={SPRING}
          style={{ padding: expanded ? "0 12px 10px" : "0 12px", overflow: "hidden" }}
        >
          <GuideModeToggle compact />
        </motion.div>

        <div style={{ padding: "0 12px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeSwitcher />
          <motion.kbd
            animate={{ opacity: expanded ? 0.5 : 0, x: expanded ? 0 : -4 }}
            transition={{ ...SPRING, delay: expanded ? 0.08 : 0 }}
            style={{
              fontSize: 14, letterSpacing: 0.5,
              color: "var(--text-3)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              borderRadius: 5, padding: "3px 5px",
              fontFamily: "'Fragment Mono', monospace",
              cursor: "default", whiteSpace: "nowrap",
            }}
          >
            ⌘K
          </motion.kbd>
        </div>
      </div>
    </motion.aside>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 z-50 md:hidden liquid-glass-strong"
      style={{
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        paddingTop: 6,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className="flex-1">
            <motion.div
              whileTap={{ scale: 0.88 }}
              className="flex flex-col items-center gap-0.5 py-1 rounded-xl cursor-pointer"
              style={{ color: active ? "var(--solar)" : "var(--nav-inactive-text)" }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-xl"
                style={{
                  background: active ? "rgba(200,165,91,0.10)" : "transparent",
                  border: active ? "1px solid rgba(200,165,91,0.22)" : "1px solid transparent",
                  transition: "all 0.18s",
                }}
              >
                {item.icon}
              </div>
              <span
                style={{
                  fontFamily: "'Fragment Mono', monospace",
                  fontSize: 13, letterSpacing: "0.10em",
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", maxWidth: 52,
                }}
                className="uppercase"
              >
                {item.label}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </motion.nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { mode } = useCosmicShell();

  return (
    <>
      <AnimatePresence mode="wait">
        {mode === "journey" ? (
          <JourneySidebar key="journey" pathname={pathname} />
        ) : (
          <FocusSidebar key="focus" pathname={pathname} />
        )}
      </AnimatePresence>
      <MobileNav pathname={pathname} />
    </>
  );
}
