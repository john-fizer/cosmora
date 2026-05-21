"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface HUDPanelProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  corner?: boolean;
}

// Corner bracket accent common in sci-fi HUDs
function CornerBrackets({ color = "rgba(6,182,212,0.6)" }: { color?: string }) {
  const size = 10;
  const s: React.CSSProperties = { position: "absolute", width: size, height: size, borderColor: color };
  return (
    <>
      <span style={{ ...s, top: 0, left: 0, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderStyle: "solid" }} />
      <span style={{ ...s, top: 0, right: 0, borderTopWidth: 1.5, borderRightWidth: 1.5, borderStyle: "solid" }} />
      <span style={{ ...s, bottom: 0, left: 0, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderStyle: "solid" }} />
      <span style={{ ...s, bottom: 0, right: 0, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderStyle: "solid" }} />
    </>
  );
}

export function HUDPanel({ children, className = "", style, corner = false }: HUDPanelProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: "rgba(2,2,20,0.75)",
        border: "1px solid rgba(99,102,241,0.2)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        ...style,
      }}
    >
      {corner && <CornerBrackets />}
      {children}
    </div>
  );
}

// Animated slide-in panel
export function HUDSlide({
  children,
  show,
  from = "left",
  className = "",
  style,
}: {
  children: ReactNode;
  show: boolean;
  from?: "left" | "right" | "bottom" | "top";
  className?: string;
  style?: React.CSSProperties;
}) {
  const variants = {
    left:   { hidden: { x: -40, opacity: 0 }, visible: { x: 0, opacity: 1 } },
    right:  { hidden: { x: 40, opacity: 0 },  visible: { x: 0, opacity: 1 } },
    bottom: { hidden: { y: 40, opacity: 0 },  visible: { y: 0, opacity: 1 } },
    top:    { hidden: { y: -40, opacity: 0 }, visible: { y: 0, opacity: 1 } },
  }[from];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className={className}
          style={style}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Data readout row with HUD styling
export function DataRow({
  label, value, color = "#06b6d4", mono = true,
}: {
  label: string; value: string; color?: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-[9px] tracking-widest uppercase" style={{ color: "rgba(148,163,184,0.6)" }}>
        {label}
      </span>
      <span
        className="text-[11px] font-semibold"
        style={{ color, fontFamily: mono ? "'Share Tech Mono', 'Fira Code', monospace" : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

// Glowing divider
export function HUDDivider({ color = "rgba(99,102,241,0.2)" }: { color?: string }) {
  return <div style={{ height: 1, background: color, margin: "6px 0" }} />;
}

// Scanning animation bar
export function ScanBar({ color = "#06b6d4" }: { color?: string }) {
  return (
    <motion.div
      style={{ height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, marginBottom: 4 }}
      animate={{ x: ["-100%", "100%"] }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    />
  );
}
