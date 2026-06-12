"use client";

/**
 * Cosmora UI primitives — the ONLY chrome components pages compose.
 * Every panel, heading, readout, button, and chip in the product
 * comes from here, so every page speaks one visual language.
 * See src/lib/design/tokens.ts for the constitution.
 */

import { motion } from "framer-motion";
import {
  COLOR, FONT, SOLAR, ORACLE, EASE_CELESTIAL, DURATION, GLOW, RADIUS,
} from "@/lib/design/tokens";

// ─── Panel — the standard surface ─────────────────────────────────────────────

export function Panel({
  children, className = "", glow = false, pad = 28, style,
}: {
  children: React.ReactNode; className?: string;
  glow?: boolean; pad?: number; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: DURATION.slow, ease: [...EASE_CELESTIAL] }}
      className={className}
      style={{
        background: `linear-gradient(160deg, rgba(20,20,36,0.55), rgba(8,8,15,0.75))`,
        border: `1px solid ${glow ? COLOR.borderGold : COLOR.border}`,
        borderRadius: RADIUS.lg,
        padding: pad,
        backdropFilter: "blur(18px)",
        boxShadow: glow ? GLOW.solarSoft : "0 12px 40px rgba(0,0,0,0.35)",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── SectionHeading — kicker + display title ──────────────────────────────────

export function SectionHeading({
  kicker, title, sub, align = "left",
}: {
  kicker: string; title: React.ReactNode; sub?: string; align?: "left" | "center";
}) {
  return (
    <div style={{ textAlign: align }} className="mb-8">
      <p style={{
        fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.3em",
        color: SOLAR(0.65), textTransform: "uppercase", marginBottom: 14,
      }}>
        {kicker}
      </p>
      <h2 style={{
        fontFamily: FONT.body, fontWeight: 400, letterSpacing: "-0.02em",
        fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)", color: COLOR.text1, lineHeight: 1.12,
      }}>
        {title}
      </h2>
      {sub && (
        <p style={{
          fontFamily: FONT.body, fontSize: 14, lineHeight: 1.7,
          color: COLOR.text2, marginTop: 12, maxWidth: 560,
          marginLeft: align === "center" ? "auto" : 0,
          marginRight: align === "center" ? "auto" : 0,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// Italic display accent for headlines: <Em>architecture</Em>
export function Em({ children }: { children: React.ReactNode }) {
  return (
    <em style={{ fontFamily: FONT.display, fontStyle: "italic", color: COLOR.text2 }}>
      {children}
    </em>
  );
}

// ─── DataReadout — the HUD voice ──────────────────────────────────────────────

export function DataReadout({
  items, color = "solar", size = 10,
}: {
  items: (string | { label: string; value: string })[];
  color?: "solar" | "oracle" | "muted"; size?: number;
}) {
  const c = color === "solar" ? SOLAR(0.7) : color === "oracle" ? ORACLE(0.8) : COLOR.text3;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1"
      style={{ fontFamily: FONT.data, fontSize: size, letterSpacing: "0.16em", color: c, textTransform: "uppercase" }}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-3">
          {i > 0 && <span style={{ opacity: 0.35 }}>·</span>}
          {typeof it === "string" ? it : (
            <span>{it.label} <span style={{ color: COLOR.text1 }}>{it.value}</span></span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── GlowButton — the action ──────────────────────────────────────────────────

export function GlowButton({
  children, onClick, variant = "primary", size = "md", type = "button", disabled,
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "ghost"; size?: "sm" | "md" | "lg";
  type?: "button" | "submit"; disabled?: boolean;
}) {
  const pad = size === "lg" ? "14px 32px" : size === "sm" ? "7px 16px" : "11px 24px";
  const fs = size === "lg" ? 13 : size === "sm" ? 10 : 11;
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: DURATION.fast }}
      style={{
        fontFamily: FONT.data, fontSize: fs, letterSpacing: "0.2em",
        textTransform: "uppercase", padding: pad, borderRadius: 999,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        ...(variant === "primary" ? {
          color: COLOR.void,
          background: `linear-gradient(135deg, #D9BC7A, ${COLOR.solar})`,
          border: "1px solid transparent",
          boxShadow: GLOW.solarStrong,
        } : {
          color: COLOR.text1,
          background: COLOR.glass,
          border: `1px solid ${COLOR.border}`,
        }),
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── HoloChip — small labeled state ───────────────────────────────────────────

export function HoloChip({
  children, tone = "solar", active = false,
}: {
  children: React.ReactNode; tone?: "solar" | "oracle" | "muted"; active?: boolean;
}) {
  const c = tone === "solar" ? COLOR.solar : tone === "oracle" ? COLOR.oracle : COLOR.text3;
  return (
    <span style={{
      fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.16em",
      textTransform: "uppercase", padding: "4px 12px", borderRadius: 999,
      color: active ? c : COLOR.text3,
      background: active ? `${c}14` : COLOR.glass,
      border: `1px solid ${active ? `${c}55` : COLOR.border}`,
      boxShadow: active ? `0 0 10px ${c}33` : "none",
      transition: "all 0.25s",
    }}>
      {children}
    </span>
  );
}

// ─── CornerFrame — instrument corner brackets for feature surfaces ────────────

export function CornerFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const corner = (pos: React.CSSProperties, flip: string) => (
    <svg width="20" height="20" viewBox="0 0 20 20"
      style={{ position: "absolute", ...pos, transform: flip, opacity: 0.45, pointerEvents: "none" }}>
      <path d="M 1 9 L 1 1 L 9 1" fill="none" stroke={COLOR.solar} strokeWidth="1.4" />
    </svg>
  );
  return (
    <div className={`relative ${className}`}>
      {corner({ top: 0, left: 0 }, "none")}
      {corner({ top: 0, right: 0 }, "scaleX(-1)")}
      {corner({ bottom: 0, left: 0 }, "scaleY(-1)")}
      {corner({ bottom: 0, right: 0 }, "scale(-1)")}
      {children}
    </div>
  );
}
