"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HolographicCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  delay?: number;
  scanLine?: boolean;
  style?: React.CSSProperties;
}

export function HolographicCard({
  children,
  className,
  glowColor = "rgba(123,111,212,0.28)",
  delay = 0,
  scanLine = false,
  style,
}: HolographicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -5 }}
      className={className}
      style={{
        position: "relative",
        background: "rgba(4, 4, 28, 0.80)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: 16,
        // No overflow:hidden here — prevents text clipping at rounded corners
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(123,111,212,0.38)";
        e.currentTarget.style.boxShadow = `0 0 48px ${glowColor}, inset 0 0 24px rgba(123,111,212,0.04)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Decorative layer — owns overflow:hidden so only decorations are clipped, not text */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {/* HUD grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: [
              "linear-gradient(rgba(123,111,212,0.035) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(123,111,212,0.035) 1px, transparent 1px)",
            ].join(","),
            backgroundSize: "28px 28px",
          }}
        />

        {/* Scan line */}
        {scanLine && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg,transparent 0%,rgba(34,211,238,0.0) 38%,rgba(34,211,238,0.07) 50%,rgba(168,85,247,0.0) 62%,transparent 100%)",
              animation: "scanMove 4.5s linear infinite",
            }}
          />
        )}
      </div>

      {/* Corner brackets — outside overflow:hidden so they sit on the border */}
      {(["tl","tr","bl","br"] as const).map((c) => (
        <div
          key={c}
          aria-hidden
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            top: c.startsWith("t") ? 0 : undefined,
            bottom: c.startsWith("b") ? 0 : undefined,
            left: c.endsWith("l") ? 0 : undefined,
            right: c.endsWith("r") ? 0 : undefined,
            borderTop: c.startsWith("t") ? "1px solid rgba(6,182,212,0.55)" : undefined,
            borderBottom: c.startsWith("b") ? "1px solid rgba(6,182,212,0.55)" : undefined,
            borderLeft: c.endsWith("l") ? "1px solid rgba(6,182,212,0.55)" : undefined,
            borderRight: c.endsWith("r") ? "1px solid rgba(6,182,212,0.55)" : undefined,
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      ))}

      {/* Children — no overflow constraint so text is never clipped */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}
