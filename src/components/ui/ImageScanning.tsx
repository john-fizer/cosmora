"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ImageScanningProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

export function ImageScanning({
  children,
  active = true,
  className,
  style,
  color = "rgba(34,211,238,0.7)",
}: ImageScanningProps) {
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", ...style }}>
      {children}
      {active && (
        <motion.div
          aria-hidden
          initial={{ y: "-100%" }}
          animate={{ y: "110%" }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear", repeatDelay: 0.8 }}
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg,transparent 0%,rgba(34,211,238,0.0) 38%,${color} 50%,rgba(168,85,247,0.0) 62%,transparent 100%)`,
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
