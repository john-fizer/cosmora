"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

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

function DesktopSidebar({ pathname }: { pathname: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.aside
      animate={{ width: expanded ? 196 : 56 }}
      transition={SPRING}
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
      className="fixed left-0 top-0 h-full z-50 hidden md:flex flex-col"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        backdropFilter: "blur(32px)",
        overflow: "hidden",
      }}
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
              fontSize: 10, letterSpacing: "0.22em",
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
                  backgroundColor: active ? "var(--nav-active-bg)" : "transparent",
                }}
                whileHover={{ opacity: 1 }}
                transition={SPRING}
                style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 10,
                  paddingTop: 7, paddingBottom: 7,
                  borderRadius: 9, cursor: "pointer", marginBottom: 1,
                  border: active ? "1px solid var(--nav-active-border)" : "1px solid transparent",
                  boxShadow: active ? "var(--nav-active-shadow)" : "none",
                }}
              >
                {/* Active indicator */}
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

                {/* Icon */}
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

                {/* Label + hint (derivative layer) */}
                <motion.div
                  animate={{
                    opacity: expanded ? 1 : 0,
                    x: expanded ? 0 : -5,
                  }}
                  transition={{ ...SPRING, delay: expanded ? i * 0.016 : 0 }}
                  style={{ overflow: "hidden", whiteSpace: "nowrap", lineHeight: 1.1 }}
                >
                  <div style={{
                    fontFamily: "'Fragment Mono', monospace",
                    fontSize: 9, letterSpacing: "0.12em",
                    color: active ? "var(--solar)" : "rgba(240,237,232,0.88)",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 9.5, letterSpacing: "0.02em",
                    color: "rgba(200,190,178,0.38)",
                    fontStyle: "italic",
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
        <div style={{ padding: "0 12px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeSwitcher />
          <motion.kbd
            animate={{ opacity: expanded ? 0.5 : 0, x: expanded ? 0 : -4 }}
            transition={{ ...SPRING, delay: expanded ? 0.08 : 0 }}
            style={{
              fontSize: 7, letterSpacing: 0.5,
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
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 z-50 md:hidden"
      style={{
        background: "rgba(8,8,15,0.96)",
        borderTop: "1px solid var(--border)",
        backdropFilter: "blur(32px)",
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
                  fontSize: 6, letterSpacing: "0.10em",
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
  return (
    <>
      <DesktopSidebar pathname={pathname} />
      <MobileNav pathname={pathname} />
    </>
  );
}
