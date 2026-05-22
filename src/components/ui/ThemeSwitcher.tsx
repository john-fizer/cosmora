"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTheme, type ThemeId } from "@/lib/theme";

const THEMES: {
  id: ThemeId;
  label: string;
  primary: string;
  secondary: string;
  bg: string;
}[] = [
  { id: "cosmic",     label: "Cosmic",     primary: "#7c3aed", secondary: "#06b6d4", bg: "#00000f" },
  { id: "matrix",     label: "Matrix",     primary: "#00ff41", secondary: "#00cc33", bg: "#000000" },
  { id: "cyberpunk",  label: "Cyberpunk",  primary: "#ff0090", secondary: "#f7df1e", bg: "#0a0014" },
  { id: "alien",      label: "Alien",      primary: "#39ff14", secondary: "#00ffcc", bg: "#000a03" },
  { id: "blood-moon", label: "Blood Moon", primary: "#dc2626", secondary: "#ff4444", bg: "#0a0000" },
  { id: "solar",      label: "Solar",      primary: "#f97316", secondary: "#fbbf24", bg: "#0a0500" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.94 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 12px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(1,1,14,0.97)",
              border: "1px solid rgba(6,182,212,0.18)",
              borderRadius: 14,
              padding: "10px 8px",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 60px rgba(124,58,237,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              width: 158,
              zIndex: 200,
            }}
          >
            {/* Header */}
            <div style={{
              fontSize: 7,
              letterSpacing: 2.5,
              color: "rgba(100,116,139,0.5)",
              textAlign: "center",
              marginBottom: 4,
              fontFamily: "'Share Tech Mono', monospace",
              textTransform: "uppercase",
            }}>
              Skin System
            </div>

            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <motion.button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setOpen(false); }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 8px",
                    borderRadius: 8,
                    background: active ? `${t.primary}18` : "transparent",
                    border: active ? `1px solid ${t.primary}44` : "1px solid transparent",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {/* Swatch */}
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    background: t.bg,
                    border: `1.5px solid ${t.primary}`,
                    flexShrink: 0,
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(135deg, ${t.primary}88, ${t.secondary}55)`,
                    }} />
                  </div>

                  <span style={{
                    fontSize: 10,
                    letterSpacing: 0.3,
                    fontWeight: 600,
                    color: active ? t.primary : "rgba(148,163,184,0.8)",
                    fontFamily: "'Share Tech Mono', monospace",
                    flex: 1,
                    textAlign: "left",
                  }}>
                    {t.label}
                  </span>

                  {active && (
                    <div style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: t.primary,
                      boxShadow: `0 0 6px ${t.primary}`,
                      flexShrink: 0,
                    }} />
                  )}
                </motion.button>
              );
            })}

            {/* Arrow tip */}
            <div style={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: 9,
              height: 9,
              background: "rgba(1,1,14,0.97)",
              borderRight: "1px solid rgba(6,182,212,0.18)",
              borderBottom: "1px solid rgba(6,182,212,0.18)",
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Change Skin"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: open ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
          border: open
            ? `1px solid ${current.primary}66`
            : "1px solid rgba(255,255,255,0.07)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: open ? current.primary : "rgba(100,116,139,0.7)",
          boxShadow: open ? `0 0 14px ${current.primary}33` : "none",
          transition: "box-shadow 0.2s, border-color 0.2s",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Active skin color dot */}
        <div style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: current.primary,
          boxShadow: `0 0 5px ${current.primary}`,
        }} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 13, height: 13 }}>
          <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm9 11v-1a7 7 0 0 0-7-7h-4a7 7 0 0 0-7 7v1" />
        </svg>
      </motion.button>

      <span style={{
        fontSize: 7,
        letterSpacing: 0.5,
        color: "#334155",
        fontWeight: "bold",
        marginTop: 2,
        textTransform: "uppercase",
      }}>
        Skin
      </span>
    </div>
  );
}
