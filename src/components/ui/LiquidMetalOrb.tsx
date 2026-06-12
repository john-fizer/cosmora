"use client";

import { motion } from "framer-motion";

type OrbState = "idle" | "thinking" | "speaking";

interface LiquidMetalOrbProps {
  state?: OrbState;
  size?: number;
}

export function LiquidMetalOrb({ state = "idle", size = 280 }: LiquidMetalOrbProps) {
  const isActive = state !== "idle";
  const isThinking = state === "thinking";

  const pulseDuration = isThinking ? 0.7 : 2.8;
  const pulseScale = isThinking ? [1, 1.06, 1] : [1, 1.025, 1];

  return (
    <div style={{ width: size, height: size, position: "relative" }}>

      {/* Outermost aura — ambient glow */}
      <motion.div
        animate={{ opacity: isActive ? [0.3, 0.6, 0.3] : [0.12, 0.22, 0.12] }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -size * 0.18,
          borderRadius: "50%",
          background: isThinking
            ? "radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)",
          filter: `blur(${size * 0.12}px)`,
        }}
      />

      {/* Outer orbit ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: isThinking ? 3 : 18, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          inset: -size * 0.06,
          borderRadius: "50%",
          border: `1px solid rgba(6,182,212,${isActive ? 0.4 : 0.18})`,
          boxShadow: `0 0 ${size * 0.05}px rgba(6,182,212,0.3)`,
        }}
      >
        {/* Orbit dot */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: -3,
          transform: "translateY(-50%)",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#06b6d4",
          boxShadow: "0 0 8px #06b6d4, 0 0 16px rgba(6,182,212,0.6)",
        }} />
      </motion.div>

      {/* Inner orbit ring — counter-rotate */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: isThinking ? 2 : 12, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          inset: size * 0.06,
          borderRadius: "50%",
          border: `1px dashed rgba(168,85,247,${isActive ? 0.5 : 0.22})`,
          boxShadow: `0 0 ${size * 0.04}px rgba(168,85,247,0.2)`,
        }}
      >
        <div style={{
          position: "absolute",
          top: -3,
          left: "50%",
          transform: "translateX(-50%)",
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#9C8AC4",
          boxShadow: "0 0 8px #9C8AC4, 0 0 14px rgba(168,85,247,0.6)",
        }} />
      </motion.div>

      {/* Orb body */}
      <motion.div
        animate={{ scale: pulseScale }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: size * 0.1,
          borderRadius: "50%",
          background: isThinking
            ? "radial-gradient(circle at 38% 36%, rgba(6,182,212,0.9) 0%, rgba(123,111,212,0.7) 45%, rgba(3,4,10,0.95) 80%)"
            : "radial-gradient(circle at 36% 34%, rgba(168,85,247,0.85) 0%, rgba(79,70,229,0.6) 40%, rgba(3,4,10,0.98) 78%)",
          boxShadow: isThinking
            ? `0 0 ${size * 0.15}px rgba(6,182,212,0.5), 0 0 ${size * 0.3}px rgba(6,182,212,0.2), inset 0 0 ${size * 0.08}px rgba(6,182,212,0.2)`
            : `0 0 ${size * 0.12}px rgba(123,111,212,0.5), 0 0 ${size * 0.25}px rgba(123,111,212,0.2), inset 0 0 ${size * 0.06}px rgba(168,85,247,0.15)`,
        }}
      >
        {/* Liquid surface highlight */}
        <motion.div
          animate={{ opacity: [0.6, 0.9, 0.6], x: [0, 4, 0], y: [0, -3, 0] }}
          transition={{ duration: isThinking ? 1.2 : 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: "14%",
            left: "20%",
            width: "35%",
            height: "22%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.22) 0%, transparent 70%)",
            filter: "blur(4px)",
          }}
        />

        {/* Scanning ring on active */}
        {isActive && (
          <motion.div
            animate={{ scaleY: [0, 1, 0], opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.4, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: "30%",
              borderRadius: "50%",
              border: `1px solid ${isThinking ? "rgba(6,182,212,0.7)" : "rgba(168,85,247,0.7)"}`,
              boxShadow: `0 0 12px ${isThinking ? "rgba(6,182,212,0.4)" : "rgba(168,85,247,0.4)"}`,
            }}
          />
        )}

        {/* Center core */}
        <motion.div
          animate={{ opacity: isThinking ? [0.7, 1, 0.7] : [0.5, 0.8, 0.5] }}
          transition={{ duration: pulseDuration * 0.7, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: "30%",
            borderRadius: "50%",
            background: isThinking
              ? "radial-gradient(circle, rgba(6,182,212,0.9) 0%, rgba(6,182,212,0.2) 60%, transparent 100%)"
              : "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(168,85,247,0.3) 50%, transparent 100%)",
            filter: `blur(${size * 0.015}px)`,
          }}
        />
      </motion.div>

      {/* Scan line sweep when speaking */}
      {state === "speaking" && (
        <motion.div
          animate={{ y: [`-${size * 0.45}px`, `${size * 0.45}px`] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          style={{
            position: "absolute",
            left: size * 0.1,
            right: size * 0.1,
            top: "50%",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.7), transparent)",
            filter: "blur(1px)",
            boxShadow: "0 0 6px rgba(6,182,212,0.5)",
            clipPath: "ellipse(50% 46% at 50% 50%)",
          }}
        />
      )}
    </div>
  );
}
