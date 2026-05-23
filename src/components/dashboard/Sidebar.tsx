"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
        <line x1="12" y1="3" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="21" />
        <line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    label: "Briefing",
    href: "/dashboard/briefing",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        <path d="M19 3v4M21 5h-4" />
      </svg>
    ),
  },
  {
    label: "Chart",
    href: "/dashboard/chart",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" />
        <line x1="12" y1="3" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="21" />
        <line x1="3" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    label: "Transits",
    href: "/dashboard/transits",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M12 2L12 6M12 18L12 22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    label: "Timeline",
    href: "/dashboard/timeline",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12,7 12,12 16,14" />
      </svg>
    ),
  },
  {
    label: "Timing",
    href: "/dashboard/electional",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
        <path d="M16.5 3.5l1 1.5M7.5 3.5l-1 1.5" />
      </svg>
    ),
  },
  {
    label: "Match",
    href: "/dashboard/compatibility",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: "Solar Rtn",
    href: "/dashboard/solar-return",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    label: "Oracle",
    href: "/dashboard/oracle",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
        <path d="M8.5 8.5c1-1.5 5-1.5 6 0M8 15.5c1 1.5 6 1.5 7 0" />
      </svg>
    ),
  },
  {
    label: "Report",
    href: "/dashboard/report",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M9 12h6M9 16h4M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
        <path d="M9 8h6" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

// ─── Desktop: vertical sidebar ────────────────────────────────────────────────

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed left-0 top-0 h-full flex-col items-center py-5 z-50 hidden md:flex overflow-hidden"
      style={{
        width: 68,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        backdropFilter: "blur(28px)",
      }}
    >
      {/* Animated scan line on right border */}
      <motion.div
        animate={{ y: ["0%", "100%"] }}
        transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1.2, ease: "linear" }}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 1,
          height: "18%",
          background: "var(--scan-gradient)",
          opacity: 0.7,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <Link href="/" className="flex flex-col items-center gap-1 mb-6 cursor-pointer">
        <motion.div
          whileHover={{ scale: 1.1 }}
          animate={{ boxShadow: [
            "0 0 20px rgba(124,58,237,0.5), 0 0 50px rgba(124,58,237,0.15)",
            "0 0 32px rgba(6,182,212,0.6), 0 0 70px rgba(6,182,212,0.2)",
            "0 0 20px rgba(124,58,237,0.5), 0 0 50px rgba(124,58,237,0.15)",
          ]}}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "var(--logo-gradient)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="white" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
          </svg>
        </motion.div>
      </Link>

      {/* Divider */}
      <div style={{ width: 32, height: 1, background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)", marginBottom: 12 }} />

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1 w-full px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 3, background: "rgba(124,58,237,0.12)" }}
                whileTap={{ scale: 0.94 }}
                className="relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  background: active ? "var(--nav-active-bg)" : "transparent",
                  color: active ? "var(--nav-active-text)" : "var(--nav-inactive-text)",
                  border: active ? "1px solid var(--nav-active-border)" : "1px solid transparent",
                  boxShadow: active ? "var(--nav-active-shadow)" : "none",
                }}
              >
                {/* Active indicator — left glow bar */}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    style={{
                      position: "absolute",
                      left: -9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: "60%",
                      borderRadius: 2,
                      background: "var(--scan-gradient)",
                      boxShadow: "0 0 8px var(--hud-corner-b)",
                    }}
                  />
                )}
                {item.icon}
                <span className="text-[7px] font-bold tracking-wider uppercase">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom divider */}
      <div style={{ width: 32, height: 1, background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.2), transparent)", marginTop: 8 }} />

      {/* Skin switcher */}
      <div style={{ marginTop: 10 }}>
        <ThemeSwitcher />
      </div>

      {/* ⌘K hint */}
      <div
        title="Command Palette (⌘K)"
        style={{
          marginTop: 8, marginBottom: 4,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        }}
      >
        <kbd style={{
          fontSize: 8, letterSpacing: 0.5, color: "#334155",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 5, padding: "3px 6px",
          fontFamily: "inherit",
        }}>
          ⌘K
        </kbd>
      </div>
    </motion.aside>
  );
}

// ─── Mobile: bottom nav bar ───────────────────────────────────────────────────

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 z-50 md:hidden"
      style={{
        background: "rgba(1,1,14,0.92)",
        borderTop: "1px solid rgba(6,182,212,0.15)",
        backdropFilter: "blur(24px)",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className="flex-1">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl cursor-pointer transition-all duration-200"
              style={{ color: active ? "#a78bfa" : "rgba(100,116,139,0.7)" }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-xl"
                style={{
                  background: active ? "rgba(124,58,237,0.2)" : "transparent",
                  border: active ? "1px solid rgba(124,58,237,0.35)" : "1px solid transparent",
                }}
              >
                {item.icon}
              </div>
              <span className="text-[7px] font-bold tracking-wider uppercase">{item.label}</span>
            </motion.div>
          </Link>
        );
      })}
    </motion.nav>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      <DesktopSidebar pathname={pathname} />
      <MobileNav pathname={pathname} />
    </>
  );
}
