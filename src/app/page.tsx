"use client";

import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MetalFx } from "metal-fx";
import { InteractiveThermal } from "@/components/ui/InteractiveThermal";
import { HolographicCard } from "@/components/ui/HolographicCard";
import { ScrollWarpTunnel } from "@/components/ui/ScrollWarpTunnel";

const OrreryBackdrop = dynamic(
  () => import("@/components/three/SolarSystemOrrery").then(m => m.SolarSystemOrrery),
  { ssr: false, loading: () => null }
);

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
        <line x1="12" y1="3" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="21" />
        <line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
      </svg>
    ),
    title: "Precision Chart Engine",
    desc: "Swiss Ephemeris-powered calculations for Whole Sign, Placidus, and 6+ house systems. Deterministic, testable, accurate.",
    color: "#7c3aed",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M12 6V12L16 14" /><circle cx="12" cy="12" r="9" />
      </svg>
    ),
    title: "Ancient Timing Techniques",
    desc: "Annual profections, zodiacal releasing, solar returns, Firdaria, and secondary progressions — all unified in one system.",
    color: "#f59e0b",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "AI Delineation Engine",
    desc: "Structured skill-based LLM interpretation — not free association. Rules-constrained, sect-aware, dignity-sensitive readings.",
    color: "#06b6d4",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /><circle cx="12" cy="12" r="9" />
      </svg>
    ),
    title: "Convergence Intelligence",
    desc: "When profection year, zodiacal releasing, and transits align — Cosmora quantifies and explains the convergence score.",
    color: "#a855f7",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    title: "Essential Dignity System",
    desc: "Egyptian terms, Ptolemaic bounds, Chaldean decans, triplicity rulers. Planet condition scores guide — not replace — interpretation.",
    color: "#22c55e",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Synastry & Compatibility",
    desc: "Two-chart overlay with traditional and modern analysis. Relationship timing through composite and solar return overlays.",
    color: "#ec4899",
  },
];

const HOUSE_SYSTEMS = ["Whole Sign", "Placidus", "Equal", "Porphyry", "Regiomontanus", "Alcabitius", "Campanus", "Koch"];
const TIMING_SYSTEMS = ["Annual Profections", "Zodiacal Releasing", "Solar Returns", "Firdaria", "Secondary Progressions", "Solar Arc Directions"];

const STATS = [
  { value: 6200,  suffix: "+", label: "Charts Calculated",   color: "#7B6FD4" },
  { value: 12,    suffix: "",  label: "Timing Systems",       color: "#4ECDC4" },
  { value: 98,    suffix: "%", label: "Calculation Accuracy", color: "#C8A55B" },
  { value: 2070,  suffix: "",  label: "Version Year",         color: "#A8B4D0" },
];

const PRICING = [
  {
    name: "EXPLORER",
    price: "Free",
    desc: "Decode your chart. Understand your timing.",
    color: "#06b6d4",
    features: [
      "Full natal chart (Whole Sign & Placidus)",
      "Annual profection year",
      "Essential dignities & sect",
      "AI Oracle — 10 queries/day",
      "Current transits",
    ],
    cta: "Start Free",
    href: "/dashboard",
    accent: false,
  },
  {
    name: "ASTROLOGER",
    price: "$14",
    priceSuffix: "/mo",
    desc: "Every technique. Unlimited AI. Living intelligence.",
    color: "#a855f7",
    features: [
      "Everything in Explorer",
      "Zodiacal releasing + Firdaria",
      "Solar return & progressions",
      "Synastry & compatibility overlay",
      "AI Oracle — unlimited",
      "Convergence scoring",
      "Multi-profile library",
    ],
    cta: "Begin Your Reading",
    href: "/dashboard",
    accent: true,
  },
];

function AnimatedStat({ value, suffix, label, color, delay }: {
  value: number; suffix: string; label: string; color: string; delay: number;
}) {
  const [count, setCount] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const duration = 1400;
    const raf = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * value));
      if (progress < 1) requestAnimationFrame(raf);
    };
    const id = setTimeout(() => requestAnimationFrame(raf), delay * 1000);
    return () => clearTimeout(id);
  }, [inView, value, delay]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <span className="tabular-nums" style={{
        fontFamily: "'Fragment Mono', monospace",
        fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
        color,
        fontWeight: 400,
        letterSpacing: "-0.01em",
      }}>
        {count.toLocaleString()}{suffix}
      </span>
      <span style={{ fontSize: 8, letterSpacing: "0.18em", color: "var(--text-3)", fontFamily: "'Fragment Mono', monospace", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "How accurate is Cosmora's chart calculation?",
    a: "Cosmora uses Swiss Ephemeris — the same library trusted by professional astrologers and astronomical institutions worldwide. Planetary positions are accurate to sub-arcminute precision. House cusps use your exact birth time, latitude, and longitude.",
  },
  {
    q: "What astrology tradition does Cosmora follow?",
    a: "Primarily Hellenistic/traditional: whole-sign houses (default), sect, essential dignities, and timing techniques like annual profections and zodiacal releasing. You can switch to Placidus, Equal House, or 6 other systems. The AI Oracle is constrained by the same ruleset — it interprets, not guesses.",
  },
  {
    q: "Is my birth data stored on a server?",
    a: "No. All chart data is stored locally in your browser's localStorage. Nothing is sent to a server until you explicitly ask the Oracle a question — at which point only the chart context is used to generate a response. No account required to use the full natal chart.",
  },
  {
    q: "What AI powers the Oracle?",
    a: "Claude Sonnet by Anthropic. Unlike generic chatbots, Cosmora's Oracle receives your full natal chart context, current transits, annual profection year, and dignity scores with every query — so responses are anchored in your actual chart, not generic horoscopes.",
  },
  {
    q: "What is Zodiacal Releasing and why should I care?",
    a: "It's a Hellenistic timing technique derived from the Lots of Spirit and Fortune. It divides life into chapters (Level 1) and sub-chapters (Level 2), each with a distinct zodiac sign flavoring the themes of that period. When multiple timing systems converge — profections, releasing peaks, and outer planet transits — Cosmora identifies and scores the overlap.",
  },
  {
    q: "Can I compare two charts for synastry?",
    a: "Yes. Add any number of profiles (family, friends, partners). The Compatibility page computes full synastry aspects with harmony/tension scoring, a composite midpoint chart, relationship archetype analysis, and an AI-generated interpretation of the connection.",
  },
];

function ZodiacRing() {
  const SIGNS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
  const OUTER = 420;
  const GLYPH_R = 355;
  const TICK_INNER = 398;
  const glyphAngles = SIGNS.map((_, i) => ((i * 30 + 15 - 90) * Math.PI) / 180);
  const ticks = Array.from({ length: 72 }, (_, i) => ({
    rad: ((i * 5 - 90) * Math.PI) / 180,
    major: i % 6 === 0,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 1 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", width: OUTER * 2, height: OUTER * 2 }}
      >
        <svg width={OUTER * 2} height={OUTER * 2} viewBox={`0 0 ${OUTER * 2} ${OUTER * 2}`}>
          <circle cx={OUTER} cy={OUTER} r={OUTER} fill="none" stroke="rgba(200,165,91,0.12)" strokeWidth="0.75"/>
          {ticks.map(({ rad, major }, i) => (
            <line key={i}
              x1={OUTER + Math.cos(rad) * TICK_INNER} y1={OUTER + Math.sin(rad) * TICK_INNER}
              x2={OUTER + Math.cos(rad) * OUTER} y2={OUTER + Math.sin(rad) * OUTER}
              stroke={major ? "rgba(200,165,91,0.38)" : "rgba(200,165,91,0.12)"}
              strokeWidth={major ? 0.75 : 0.4}
            />
          ))}
        </svg>
      </motion.div>

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", width: GLYPH_R * 2, height: GLYPH_R * 2 }}
      >
        <svg width={GLYPH_R * 2} height={GLYPH_R * 2} viewBox={`0 0 ${GLYPH_R * 2} ${GLYPH_R * 2}`}>
          <circle cx={GLYPH_R} cy={GLYPH_R} r={GLYPH_R} fill="none" stroke="rgba(123,111,212,0.07)" strokeWidth="0.5"/>
          {SIGNS.map((g, i) => {
            const rad = glyphAngles[i];
            const gR = GLYPH_R - 28;
            return (
              <text key={i}
                x={GLYPH_R + Math.cos(rad) * gR} y={GLYPH_R + Math.sin(rad) * gR}
                textAnchor="middle" dominantBaseline="central"
                fontSize="15" fill="rgba(123,111,212,0.35)"
              >{g}</text>
            );
          })}
        </svg>
      </motion.div>
    </div>
  );
}

function HudViewportOverlay() {
  const [utc, setUtc] = useState(() => new Date().toUTCString().slice(17, 25));
  useEffect(() => {
    const id = setInterval(() => setUtc(new Date().toUTCString().slice(17, 25)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 72, left: 20 }}>
        <div style={{ width: 24, height: 24, borderTop: "1px solid rgba(200,165,91,0.30)", borderLeft: "1px solid rgba(200,165,91,0.30)" }} />
      </div>
      <div style={{ position: "absolute", top: 76, left: 48 }}>
        <p style={{ fontSize: 8, color: "rgba(200,165,91,0.45)", fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em", margin: 0 }}>COSMORA OS</p>
        <p style={{ fontSize: 7, color: "rgba(122,118,144,0.45)", fontFamily: "'Fragment Mono', monospace", margin: 0 }}>v2070.01</p>
      </div>
      <div style={{ position: "absolute", top: 72, right: 20 }}>
        <div style={{ width: 24, height: 24, borderTop: "1px solid rgba(200,165,91,0.30)", borderRight: "1px solid rgba(200,165,91,0.30)" }} />
      </div>
      <div style={{ position: "absolute", top: 76, right: 48, textAlign: "right" }}>
        <p style={{ fontSize: 8, color: "rgba(200,165,91,0.45)", fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em", margin: 0 }}>{utc} UTC</p>
        <p style={{ fontSize: 7, color: "rgba(122,118,144,0.45)", fontFamily: "'Fragment Mono', monospace", margin: 0 }}>SYSTEM ACTIVE</p>
      </div>
      <div style={{ position: "absolute", bottom: 24, left: 20 }}>
        <div style={{ width: 24, height: 24, borderBottom: "1px solid rgba(123,111,212,0.18)", borderLeft: "1px solid rgba(123,111,212,0.18)" }} />
      </div>
      <div style={{ position: "absolute", bottom: 24, right: 20 }}>
        <div style={{ width: 24, height: 24, borderBottom: "1px solid rgba(123,111,212,0.18)", borderRight: "1px solid rgba(123,111,212,0.18)" }} />
      </div>
    </div>
  );
}

function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: open === i ? "rgba(123,111,212,0.06)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${open === i ? "rgba(123,111,212,0.20)" : "var(--border)"}`,
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left cursor-pointer"
          >
            <span className="text-sm" style={{ color: open === i ? "var(--text-1)" : "var(--text-2)", fontFamily: "'Outfit', sans-serif", fontWeight: open === i ? 500 : 400 }}>
              {item.q}
            </span>
            <motion.span
              animate={{ rotate: open === i ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 text-lg font-light"
              style={{ color: open === i ? "var(--solar)" : "var(--text-3)", lineHeight: 1 }}
            >
              +
            </motion.span>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="px-6 pb-5">
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{item.a}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const textOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.45], [0, -40]);

  return (
    <div className="min-h-screen relative" style={{ background: "var(--void-black)" }}>

      <HudViewportOverlay />

      {/* ── Full-screen thermal background ── */}
      <div className="fixed inset-0 z-0" style={{ pointerEvents: "none" }}>
        <InteractiveThermal style={{ width: "100%", height: "100%" }} />
      </div>

      {/* ── Scroll warp tunnel overlay ── */}
      <ScrollWarpTunnel triggerSelector=".warp-trigger" />

      {/* ── Nebula orbs ── */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="fixed pointer-events-none rounded-full"
        style={{
          width: 900, height: 900, left: "25%", top: "-25%",
          background: "radial-gradient(ellipse, rgba(123,111,212,0.08), transparent 70%)",
          filter: "blur(50px)", zIndex: 1,
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.09, 1], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="fixed pointer-events-none rounded-full"
        style={{
          width: 700, height: 700, right: "-12%", top: "15%",
          background: "radial-gradient(ellipse, rgba(78,205,196,0.06), transparent 70%)",
          filter: "blur(50px)", zIndex: 1,
        }}
      />

      {/* ── Nav ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{
          background: "rgba(3,4,10,0.72)",
          borderBottom: "1px solid rgba(99,102,241,0.1)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #C8A55B, #A8852B)",
              boxShadow: "0 4px 16px rgba(200,165,91,0.22)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#08080F" strokeWidth="1.8" className="w-5 h-5">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="3" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="21" />
              <line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" />
            </svg>
          </div>
          <span
          className="font-semibold tracking-[0.22em] uppercase"
          style={{ fontFamily: "'Fragment Mono', monospace", fontSize: 12, color: "var(--solar)" }}
        >
          COSMORA
        </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "Techniques", "Pricing"].map((item) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase()}`}
              whileHover={{ color: "var(--text-1)" }}
              className="text-sm tracking-wide cursor-pointer"
              style={{ color: "var(--text-2)", fontFamily: "'Outfit', sans-serif", fontWeight: 400, transition: "color 0.2s" }}
            >
              {item}
            </motion.a>
          ))}
        </div>

        <Link href="/dashboard">
          <motion.button
            whileHover={{ opacity: 0.88, y: -1 }}
            whileTap={{ scale: 0.96 }}
            className="px-5 py-2 rounded-xl text-sm font-semibold tracking-wider cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #C8A55B, #A8852B)",
              color: "#08080F",
              border: "none",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Enter App
          </motion.button>
        </Link>
      </motion.nav>

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        style={{ zIndex: 2, minHeight: "100svh" }}
      >
        {/* Full-bleed 3D orrery backdrop */}
        <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
          <OrreryBackdrop autoRotate style={{ width: "100%", height: "100%" }} />
          <ZodiacRing />
          {/* Top + bottom vignettes for text readability */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, rgba(0,0,15,0.72) 0%, rgba(0,0,9,0.0) 32%, rgba(0,0,9,0.0) 68%, rgba(0,0,15,0.80) 100%)",
            zIndex: 1,
          }} />
          {/* Radial center vignette to keep center dark enough for text */}
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 42%, rgba(0,0,15,0.45) 0%, transparent 70%)",
            zIndex: 1,
          }} />
        </div>

        {/* Floating planetary glyphs */}
        {[
          { g: "☉", x: "11%", y: "26%", size: 30, op: 0.08, dur: 8 },
          { g: "☽", x: "84%", y: "30%", size: 24, op: 0.07, dur: 11 },
          { g: "♃", x: "6%",  y: "66%", size: 20, op: 0.07, dur: 9 },
          { g: "♄", x: "90%", y: "62%", size: 18, op: 0.06, dur: 13 },
          { g: "♂", x: "19%", y: "80%", size: 17, op: 0.06, dur: 7 },
          { g: "♀", x: "77%", y: "16%", size: 17, op: 0.06, dur: 10 },
          { g: "♅", x: "55%", y: "85%", size: 14, op: 0.05, dur: 14 },
        ].map((item, i) => (
          <motion.div
            key={i}
            style={{ position: "absolute", left: item.x, top: item.y, fontSize: item.size, color: `rgba(168,85,247,${item.op})`, zIndex: 1, pointerEvents: "none", userSelect: "none", fontFamily: "serif" }}
            animate={{ y: [0, -14, 0], opacity: [item.op, item.op * 2, item.op] }}
            transition={{ duration: item.dur, repeat: Infinity, ease: "easeInOut", delay: i * 1.3 }}
          >
            {item.g}
          </motion.div>
        ))}

        {/* Text content — centered in upper 55% of hero */}
        <motion.div
          style={{ opacity: textOpacity, y: textY, position: "relative", zIndex: 2 }}
          className="flex flex-col items-center justify-center px-6 pt-32 pb-24 w-full max-w-full overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 px-4 py-1.5 rounded-full text-[9px] tracking-[0.22em] uppercase"
            style={{
              background: "rgba(200,165,91,0.08)",
              border: "1px solid rgba(200,165,91,0.24)",
              color: "var(--solar)",
              fontFamily: "'Fragment Mono', monospace",
            }}
          >
            The Cosmic Intelligence System
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.9, ease: [0.25,0.1,0.25,1] as [number,number,number,number] }}
            className="text-center mb-6 px-4"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 500,
              fontSize: "clamp(2.4rem, 6vw, 5.5rem)",
              lineHeight: 1.12,
              letterSpacing: "-0.01em",
              textShadow: "0 2px 60px rgba(0,0,0,0.9)",
              color: "var(--text-1)",
              overflowWrap: "break-word",
              wordBreak: "break-word",
              maxWidth: "100%",
            }}
          >
            The cosmos has always held the map.
            <br />
            <em style={{ color: "var(--solar)", fontStyle: "italic", fontWeight: 400 }}>Cosmora reads it.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center max-w-xl mb-12 leading-relaxed"
            style={{ color: "var(--text-2)", textShadow: "0 1px 20px rgba(0,0,0,0.9)", fontSize: "1.05rem", fontFamily: "'Outfit', sans-serif", fontWeight: 300 }}
          >
            A professional-grade astrology instrument. Ancient Hellenistic techniques,
            modern AI reasoning, and a precision chart engine — unified.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex items-center gap-2 mb-8"
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--data)", boxShadow: "0 0 6px rgba(78,205,196,0.6)", flexShrink: 0 }}
            />
            <span style={{ fontSize: 8, color: "rgba(78,205,196,0.55)", fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em" }}>
              CHART ENGINE READY · SWISS EPHEMERIS v2.10
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link href="/dashboard">
              <motion.button
                whileHover={{ opacity: 0.88, y: -2 }}
                whileTap={{ scale: 0.96 }}
                className="px-8 py-3.5 rounded-2xl text-sm font-semibold tracking-wider cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #C8A55B, #A8852B)",
                  color: "#08080F",
                  border: "none",
                  fontFamily: "'Outfit', sans-serif",
                  whiteSpace: "nowrap",
                  boxShadow: "0 8px 32px rgba(200,165,91,0.25)",
                }}
              >
                Begin →
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ borderColor: "var(--border-md)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-3.5 rounded-2xl text-sm font-medium tracking-wide cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                whiteSpace: "nowrap",
                backdropFilter: "blur(12px)",
                fontFamily: "'Outfit', sans-serif",
                transition: "all 0.2s",
              }}
            >
              See Features
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ zIndex: 2, pointerEvents: "none" }}
        >
          <span className="text-[9px] font-bold tracking-widest" style={{ color: "#334155" }}>SCROLL</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-8 rounded-full"
            style={{ background: "linear-gradient(to bottom, #334155, transparent)" }}
          />
        </motion.div>
      </section>

      {/* ── Stats bar ── */}
      <section className="relative py-16 px-6 flex flex-col items-center" style={{ zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: "56rem" }}>
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 rounded-2xl px-8 py-10"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              backdropFilter: "blur(24px)",
            }}
          >
            {STATS.map((s, i) => (
              <AnimatedStat key={s.label} {...s} delay={i * 0.12} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="relative py-24 px-6 flex flex-col items-center" style={{ zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: "56rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: "var(--solar)", fontFamily: "'Fragment Mono', monospace" }}>HOW IT WORKS</p>
            <h2
              className="font-bold"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              Three steps to your
              <br />
              <span className="gradient-text">cosmic operating system.</span>
            </h2>
          </motion.div>

          <div className="relative">
            <div
              className="hidden md:block absolute"
              style={{
                top: "2.5rem",
                left: "calc(16.66% + 2.5rem)",
                right: "calc(16.66% + 2.5rem)",
                height: "1px",
                background: "linear-gradient(to right, rgba(124,58,237,0.0), rgba(124,58,237,0.4) 30%, rgba(124,58,237,0.4) 70%, rgba(124,58,237,0.0))",
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                {
                  num: "01",
                  title: "Enter Your Birth Data",
                  desc: "Date, time, and place of birth. Cosmora calculates your natal chart using Swiss Ephemeris precision — accurate to the arc minute.",
                  color: "#C8A55B",
                  icon: "⊕",
                },
                {
                  num: "02",
                  title: "Cosmos Calculates",
                  desc: "Planets, houses, aspects, dignities, fixed stars, Arabic lots, sect, annual profections — every layer of the tradition, computed instantly.",
                  color: "#7B6FD4",
                  icon: "◎",
                },
                {
                  num: "03",
                  title: "Explore & Understand",
                  desc: "3D orrery, AI oracle, timing dashboards, live transit alerts — your chart becomes an interactive living system, not a static PDF.",
                  color: "#4ECDC4",
                  icon: "✦",
                },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6 relative"
                    style={{ background: `${step.color}12`, border: `1px solid ${step.color}30` }}
                  >
                    <span className="text-3xl" style={{ color: step.color }}>{step.icon}</span>
                    <div
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: `${step.color}22`, border: `1px solid ${step.color}50` }}
                    >
                      <span className="text-[9px] font-bold" style={{ color: step.color }}>{step.num}</span>
                    </div>
                  </div>
                  <h3
                    className="font-bold text-base mb-3"
                    style={{ color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Preview ── */}
      <section className="relative py-24 px-6 flex flex-col items-center" style={{ zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: "72rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: "var(--solar)", fontFamily: "'Fragment Mono', monospace" }}>LIVE INTERFACE</p>
            <h2
              className="font-bold mb-4"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              Your cosmos, rendered in real time.
            </h2>
            <p className="text-base" style={{ color: "#64748b", maxWidth: "38rem", margin: "0 auto" }}>
              Every placement, transit, and cycle — live, interactive, and uniquely yours.
            </p>
          </motion.div>

          {/* Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              borderRadius: "1rem",
              border: "1px solid var(--border-md)",
              background: "var(--bg-card)",
              overflow: "hidden",
              boxShadow: "0 0 80px rgba(123,111,212,0.08)",
              backdropFilter: "blur(24px)",
            }}
          >
            {/* Top Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1.25rem",
                borderBottom: "1px solid rgba(99,102,241,0.15)",
                background: "rgba(15,15,35,0.8)",
              }}
            >
              <div style={{ display: "flex", gap: "0.375rem" }}>
                {["#ef4444", "#f59e0b", "#22c55e"].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
                ))}
              </div>
              <div style={{ flex: 1, height: 20, borderRadius: 6, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "10px", color: "#475569", fontFamily: "monospace" }}>cosmora.app/dashboard</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {["☿", "♀", "♂"].map(g => (
                  <div key={g} style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#a5b4fc" }}>{g}</div>
                ))}
              </div>
            </div>

            {/* Main layout */}
            <div style={{ display: "flex", height: "420px" }}>
              {/* Sidebar */}
              <div style={{ width: 52, borderRight: "1px solid rgba(99,102,241,0.1)", background: "rgba(10,10,25,0.6)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1rem", gap: "1rem" }}>
                {[
                  { label: "⊙", active: true },
                  { label: "◉", active: false },
                  { label: "≈", active: false },
                  { label: "⟳", active: false },
                  { label: "⌘", active: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: item.active ? "rgba(99,102,241,0.2)" : "transparent",
                      border: item.active ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, color: item.active ? "#a5b4fc" : "#334155",
                    }}
                  >{item.label}</div>
                ))}
              </div>

              {/* Left panel — planet positions */}
              <div style={{ width: 200, borderRight: "1px solid rgba(99,102,241,0.1)", padding: "0.75rem 0.625rem", display: "flex", flexDirection: "column", gap: "0.375rem", overflow: "hidden" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", marginBottom: "0.25rem" }}>NATAL POSITIONS</div>
                {[
                  { name: "Sun", glyph: "☉", sign: "Scorpio", color: "#fbbf24", deg: "14°" },
                  { name: "Moon", glyph: "☽", sign: "Pisces", color: "#c4b5fd", deg: "28°" },
                  { name: "Mercury", glyph: "☿", sign: "Scorpio", color: "#a78bfa", deg: "02°" },
                  { name: "Venus", glyph: "♀", sign: "Libra", color: "#f472b6", deg: "19°" },
                  { name: "Mars", glyph: "♂", sign: "Capricorn", color: "#ef4444", deg: "07°" },
                  { name: "Jupiter", glyph: "♃", sign: "Sagittarius", color: "#f59e0b", deg: "11°" },
                  { name: "Saturn", glyph: "♄", sign: "Aquarius", color: "#94a3b8", deg: "23°" },
                  { name: "Uranus", glyph: "♅", sign: "Capricorn", color: "#06b6d4", deg: "05°" },
                  { name: "Neptune", glyph: "♆", sign: "Capricorn", color: "#3b82f6", deg: "16°" },
                  { name: "Pluto", glyph: "♇", sign: "Scorpio", color: "#8b5cf6", deg: "22°" },
                ].map(p => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.25rem 0.375rem", borderRadius: 6, background: "rgba(99,102,241,0.04)" }}>
                    <span style={{ fontSize: 11, color: p.color, width: 14, textAlign: "center" }}>{p.glyph}</span>
                    <span style={{ fontSize: 9, color: "#64748b", flex: 1 }}>{p.name}</span>
                    <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace" }}>{p.deg}</span>
                    <span style={{ fontSize: 9, color: "#475569" }}>{p.sign.slice(0, 3)}</span>
                  </div>
                ))}
              </div>

              {/* Center — 3D Orrery placeholder */}
              <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {/* Orbit rings */}
                {[80, 120, 160, 200, 240].map((r, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    width: r * 2, height: r * 2,
                    borderRadius: "50%",
                    border: `1px solid rgba(99,102,241,${0.06 + i * 0.02})`,
                    animation: `rotate-slow ${20 + i * 8}s linear infinite`,
                  }} />
                ))}
                {/* Sun */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #fde68a, #f59e0b, #92400e)",
                  boxShadow: "0 0 24px rgba(251,191,36,0.5)",
                  zIndex: 2,
                }} />
                {/* Planet dots on orbits */}
                {[
                  { orbit: 80, angle: 45, color: "#c4b5fd", size: 8 },
                  { orbit: 120, angle: 200, color: "#a78bfa", size: 6 },
                  { orbit: 160, angle: 310, color: "#f472b6", size: 7 },
                  { orbit: 200, angle: 130, color: "#ef4444", size: 6 },
                ].map((p, i) => {
                  const rad = (p.angle * Math.PI) / 180;
                  return (
                    <div key={i} style={{
                      position: "absolute",
                      width: p.size, height: p.size,
                      borderRadius: "50%",
                      background: p.color,
                      boxShadow: `0 0 8px ${p.color}`,
                      left: `calc(50% + ${Math.cos(rad) * p.orbit}px - ${p.size / 2}px)`,
                      top: `calc(50% + ${Math.sin(rad) * p.orbit}px - ${p.size / 2}px)`,
                      zIndex: 2,
                    }} />
                  );
                })}
                {/* Scan line */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, transparent 48%, rgba(99,102,241,0.06) 50%, transparent 52%)",
                  animation: "scanMove 3s linear infinite",
                  zIndex: 3,
                  pointerEvents: "none",
                }} />
              </div>

              {/* Right panel */}
              <div style={{ width: 220, borderLeft: "1px solid rgba(99,102,241,0.1)", padding: "0.75rem 0.625rem", display: "flex", flexDirection: "column", gap: "0.5rem", overflow: "hidden" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", marginBottom: "0.125rem" }}>LIVE TRANSITS</div>
                {[
                  { transit: "♃", natal: "☉", type: "△", label: "Jup △ Sun", applying: true, color: "#f59e0b" },
                  { transit: "♄", natal: "☽", type: "□", label: "Sat □ Moon", applying: false, color: "#94a3b8" },
                  { transit: "♇", natal: "☿", type: "⚹", label: "Plu ⚹ Merc", applying: true, color: "#8b5cf6" },
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.5rem", borderRadius: 6, border: `1px solid ${t.color}20`, background: `${t.color}08` }}>
                    <span style={{ fontSize: 11, color: t.color }}>{t.transit}</span>
                    <span style={{ fontSize: 10, color: t.color }}>{t.type}</span>
                    <span style={{ fontSize: 9, color: "#94a3b8", flex: 1 }}>{t.label}</span>
                    <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, background: t.applying ? "rgba(6,182,212,0.15)" : "transparent", color: t.applying ? "#06b6d4" : "#334155", border: `1px solid ${t.applying ? "rgba(6,182,212,0.3)" : "rgba(51,65,85,0.5)"}` }}>
                      {t.applying ? "appl" : "sep"}
                    </span>
                  </div>
                ))}

                <div style={{ marginTop: "0.25rem", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#475569" }}>ORACLE</div>
                <div style={{ borderRadius: 8, border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.05)", padding: "0.5rem 0.625rem" }}>
                  <p style={{ fontSize: 9, lineHeight: 1.6, color: "#64748b" }}>
                    Jupiter trines your natal Sun — a rare moment of expansion and alignment. The next 14 days carry unusual momentum for long-term decisions...
                  </p>
                  <div style={{ marginTop: "0.375rem", display: "flex", gap: "0.25rem" }}>
                    {["Identity", "Growth", "Timing"].map(k => (
                      <span key={k} style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>{k}</span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "0.125rem", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#475569" }}>ANNUAL PROFECTION</div>
                <div style={{ borderRadius: 8, border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)", padding: "0.375rem 0.5rem" }}>
                  <p style={{ fontSize: 9, color: "#fbbf24" }}>Year 32 · House IX · Jupiter rules</p>
                  <p style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>Travel, philosophy, expansion</p>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{ borderTop: "1px solid rgba(99,102,241,0.1)", background: "rgba(10,10,25,0.7)", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                {["Chart", "Transits", "Timeline", "Synastry"].map((tab, i) => (
                  <div key={tab} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: i === 0 ? "rgba(99,102,241,0.2)" : "transparent", border: i === 0 ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent", color: i === 0 ? "#a5b4fc" : "#334155" }}>{tab}</div>
                ))}
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(99,102,241,0.08)" }} />
              <span style={{ fontSize: 9, color: "#334155", fontFamily: "monospace" }}>Last updated: just now</span>
            </div>
          </motion.div>

          {/* Callout labels */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            style={{ display: "flex", justifyContent: "space-around", marginTop: "1.5rem", flexWrap: "wrap", gap: "1rem" }}
          >
            {[
              { label: "Natal Chart", desc: "Every planet, house & dignity", color: "#a5b4fc" },
              { label: "3D Solar System", desc: "Live orbital mechanics", color: "#06b6d4" },
              { label: "AI Oracle", desc: "Streams context-aware guidance", color: "#8b5cf6" },
            ].map(c => (
              <div key={c.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.color, marginBottom: 2 }}>↑ {c.label}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>{c.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-32 px-6 flex flex-col items-center" style={{ zIndex: 2 }}>
        <div className="warp-trigger" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, pointerEvents: "none" }} />
        <div style={{ width: "100%", maxWidth: "72rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: "var(--oracle)", fontFamily: "'Fragment Mono', monospace" }}>THE SYSTEM</p>
            <h2
              className="font-bold mb-4"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              Built like an aircraft control system,
              <br />
              <span className="gradient-text">not a horoscope blog.</span>
            </h2>
            <p className="text-lg" style={{ color: "#64748b", maxWidth: "42rem", margin: "0 auto" }}>
              Six independent layers: calculation, rules, interpretation, personalization, feedback, and UX — each one precise, each one testable.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <HolographicCard key={f.title} delay={i * 0.07} scanLine={i === 2} style={{ minWidth: 0 }}>
                <div className="p-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${f.color}15`, border: `1px solid ${f.color}30`, color: f.color }}
                  >
                    {f.icon}
                  </div>
                  <h3
                    className="font-bold text-base mb-2"
                    style={{ color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative py-24 px-6 flex flex-col items-center" style={{ zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: "72rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: "#22c55e" }}>WHAT PEOPLE SAY</p>
            <h2
              className="font-bold"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              Built for serious practitioners.
              <br />
              <span className="gradient-text">Loved by curious minds.</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: "Finally an app that takes traditional techniques seriously. The sect analysis and Firdaria alone are worth it — most apps don't even know what those are.",
                name: "R.K.",
                title: "Professional Astrologer, 14 years",
                planet: "☿ Mercury dominant",
                color: "#a78bfa",
              },
              {
                quote: "The convergence scoring changed how I read charts. When three timing systems hit the same window, I know to pay attention. It's like having a research assistant.",
                name: "M.T.",
                title: "Consulting Astrologer",
                planet: "♃ Jupiter rising",
                color: "#f59e0b",
              },
              {
                quote: "I've been studying astrology for 8 years and Cosmora taught me things about my own chart I'd never seen. The fixed stars tab alone floored me.",
                name: "S.L.",
                title: "Hellenistic Astrology Student",
                planet: "☽ Moon in Scorpio",
                color: "#06b6d4",
              },
            ].map((t, i) => (
              <HolographicCard key={i} delay={i * 0.1} style={{ minWidth: 0 }}>
                <div className="p-6 flex flex-col h-full">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} style={{ color: t.color, fontSize: "0.7rem" }}>✦</span>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed flex-1 mb-5 italic" style={{ color: "#94a3b8" }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div
                    className="flex items-center gap-3 pt-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: `${t.color}18`, border: `1px solid ${t.color}30`, color: t.color }}
                    >
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "#e2e8f0" }}>{t.name}</p>
                      <p className="text-[10px]" style={{ color: "#475569" }}>{t.title}</p>
                      <p className="text-[10px] font-medium" style={{ color: t.color }}>{t.planet}</p>
                    </div>
                  </div>
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Techniques ── */}
      <section id="techniques" className="relative py-24 px-6 flex flex-col items-center" style={{ zIndex: 2 }}>
        <div className="warp-trigger" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, pointerEvents: "none" }} />
        <div style={{ width: "100%", maxWidth: "72rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: "#f59e0b" }}>DEPTH</p>
            <h2
              className="font-bold mb-4"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              Every system. Every technique.
              <br />
              <span className="gradient-text-gold">Converged.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-8" style={{ minWidth: 0 }}>
              <div>
                <p className="text-xs font-bold tracking-widest mb-4" style={{ color: "#94a3b8" }}>HOUSE SYSTEMS</p>
                <div className="flex flex-wrap gap-2">
                  {HOUSE_SYSTEMS.map((hs, i) => (
                    <motion.span
                      key={hs}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{
                        background: "rgba(123,111,212,0.08)",
                        border: "1px solid rgba(123,111,212,0.18)",
                        color: "#9B91E0",
                        fontFamily: "'Fragment Mono', monospace",
                      }}
                    >
                      {hs}
                    </motion.span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold tracking-widest mb-4" style={{ color: "#94a3b8" }}>TIMING TECHNIQUES</p>
                <div className="flex flex-wrap gap-2">
                  {TIMING_SYSTEMS.map((ts, i) => (
                    <motion.span
                      key={ts}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 + 0.3 }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{
                        background: "rgba(200,165,91,0.08)",
                        border: "1px solid rgba(200,165,91,0.18)",
                        color: "#C8A55B",
                        fontFamily: "'Fragment Mono', monospace",
                      }}
                    >
                      {ts}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>

            {/* Convergence card */}
            <HolographicCard scanLine style={{ minWidth: 0 }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold tracking-widest" style={{ color: "#94a3b8" }}>CONVERGENCE EXAMPLE</p>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                  >
                    SCORE: 0.87
                  </span>
                </div>
                <h4
                  className="font-bold text-sm mb-4"
                  style={{ color: "#c4b5fd", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Career Transition Window
                </h4>
                <div className="space-y-2">
                  {[
                    { text: "Lot of Spirit zodiacal releasing peak period", color: "#f59e0b" },
                    { text: "10th house annual profection active", color: "#a855f7" },
                    { text: "Saturn transit to Midheaven", color: "#94a3b8" },
                    { text: "Solar return MC conjunct natal Mars", color: "#ef4444" },
                    { text: "User-reported: job instability confirmed", color: "#22c55e" },
                  ].map((signal, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: signal.color }} />
                      <span className="text-xs" style={{ color: "#94a3b8" }}>{signal.text}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-xs italic" style={{ color: "#64748b" }}>
                    "Multiple timing systems emphasize career restructuring and public role development."
                  </p>
                </div>
              </div>
            </HolographicCard>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative py-24 px-6 flex flex-col items-center" style={{ zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: "56rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold tracking-widest mb-4" style={{ color: "var(--solar)", fontFamily: "'Fragment Mono', monospace" }}>PRICING</p>
            <h2
              className="font-bold mb-4"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              Start free.
              <br />
              <span className="gradient-text">Go deeper when you&apos;re ready.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRICING.map((plan, i) => (
              <HolographicCard key={plan.name} delay={i * 0.12} scanLine={plan.accent} style={{ minWidth: 0 }}>
                <div className="p-7 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-[9px] font-bold tracking-widest mb-1" style={{ color: plan.color }}>{plan.name}</p>
                      <div className="flex items-end gap-1">
                        <span className="font-bold" style={{
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: "2.2rem",
                          color: "#f1f5f9",
                          lineHeight: 1,
                          letterSpacing: "-0.03em",
                        }}>
                          {plan.price}
                        </span>
                        {plan.priceSuffix && (
                          <span className="text-sm mb-1" style={{ color: "#475569" }}>{plan.priceSuffix}</span>
                        )}
                      </div>
                    </div>
                    {plan.accent && (
                      <span className="text-[8px] tracking-widest px-2.5 py-1 rounded-lg"
                        style={{ background: "rgba(200,165,91,0.12)", border: "1px solid rgba(200,165,91,0.28)", color: "var(--solar)", flexShrink: 0, whiteSpace: "nowrap", fontFamily: "'Fragment Mono', monospace" }}>
                        MOST DEPTH
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-6" style={{ color: "#64748b" }}>{plan.desc}</p>
                  <ul className="space-y-2.5 flex-1 mb-7">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#94a3b8" }}>
                        <span style={{ color: plan.color, fontSize: "0.75rem" }}>✦</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    {plan.accent ? (
                      <motion.button
                        whileHover={{ opacity: 0.88, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3.5 rounded-xl font-semibold tracking-wider cursor-pointer text-sm"
                        style={{
                          background: "linear-gradient(135deg, #C8A55B, #A8852B)",
                          color: "#08080F",
                          border: "none",
                          fontFamily: "'Outfit', sans-serif",
                          boxShadow: "0 6px 24px rgba(200,165,91,0.22)",
                        }}
                      >
                        {plan.cta} →
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.03, borderColor: `${plan.color}60` }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3.5 rounded-xl font-bold tracking-wider cursor-pointer text-sm"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid ${plan.color}25`,
                          color: plan.color,
                          transition: "all 0.2s",
                        }}
                      >
                        {plan.cta} →
                      </motion.button>
                    )}
                  </Link>
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="relative py-24 px-6 flex flex-col items-center" style={{ zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: "52rem" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs tracking-[0.22em] mb-4" style={{ color: "var(--text-2)", fontFamily: "'Fragment Mono', monospace" }}>FAQ</p>
            <h2
              className="font-bold"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              Common questions
            </h2>
          </motion.div>

          <FAQAccordion />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-32 px-6 flex flex-col items-center" style={{ zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: "48rem" }} className="text-center relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(200,165,91,0.08) 0%, transparent 70%)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <p className="text-xs tracking-[0.22em] mb-6" style={{ color: "var(--solar)", fontFamily: "'Fragment Mono', monospace" }}>BEGIN YOUR READING</p>
            <h2
              className="font-bold mb-6"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(2rem, 5vw, 4rem)",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              What chapter of life
              <br />
              <span className="gradient-text">are you in right now?</span>
            </h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: "#64748b" }}>
              Enter your birth data. Let Cosmora calculate, interpret, and illuminate the timing of your life — past, present, and future windows.
            </p>
            <Link href="/dashboard">
              <motion.button
                whileHover={{ opacity: 0.88, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 rounded-2xl text-base font-semibold tracking-wider cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #C8A55B, #A8852B)",
                  color: "#08080F",
                  border: "none",
                  fontFamily: "'Outfit', sans-serif",
                  boxShadow: "0 10px 48px rgba(200,165,91,0.28)",
                }}
              >
                Enter Cosmora →
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Tech Marquee ── */}
      <div
        className="relative py-5 overflow-hidden"
        style={{
          zIndex: 2,
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
        }}
      >
        <motion.div
          className="flex gap-8 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
          style={{ width: "max-content" }}
        >
          {[...Array(2)].map((_, copy) => (
            <div key={copy} className="flex gap-8 items-center">
              {[
                "Swiss Ephemeris", "Hellenistic Techniques", "Fixed Stars", "AI Delineation",
                "Annual Profections", "Zodiacal Releasing", "Solar Returns", "Firdaria",
                "Traditional Sect", "Arabic Lots", "Mutual Receptions", "Convergence Scoring",
                "Dignities & Debilities", "3D Orrery", "Aspect Patterns", "Dispositor Trees",
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-4">
                  <span style={{ fontSize: 9, letterSpacing: "0.16em", color: "var(--text-3)", fontFamily: "'Fragment Mono', monospace" }}>{item}</span>
                  <span style={{ color: "var(--text-3)", fontSize: "0.4rem", opacity: 0.5 }}>◆</span>
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 relative flex flex-col items-center" style={{ borderTop: "1px solid var(--border)", zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: "72rem" }} className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #C8A55B, #A8852B)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#08080F" strokeWidth="1.8" className="w-4 h-4">
                <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Fragment Mono', monospace", fontSize: 11, letterSpacing: "0.18em", color: "var(--solar)" }}>COSMORA</span>
          </div>
          <p className="text-xs text-center" style={{ color: "var(--text-3)", fontFamily: "'Outfit', sans-serif" }}>
            Astrology as symbolic intelligence — not prediction, not fate.
          </p>
          <p style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "'Fragment Mono', monospace" }}>© 2026 Cosmora</p>
        </div>
      </footer>
    </div>
  );
}
