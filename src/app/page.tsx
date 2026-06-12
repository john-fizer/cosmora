"use client";

/**
 * Cosmora landing — one continuous journey: Cosmos → You.
 * A single WebGL camera descends from the galaxy to the moment of your birth.
 * Scroll is the only animator. No video. Constitution chrome only.
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  motion, useScroll, useTransform, useSpring, useMotionValueEvent,
  AnimatePresence, MotionValue,
} from "framer-motion";
import { COLOR, FONT, SOLAR, ORACLE, EASE_CELESTIAL, GLOW } from "@/lib/design/tokens";
import { GlowButton, Panel, SectionHeading, Em, DataReadout, HoloChip } from "@/components/ui/primitives";

const CosmicJourney = dynamic(() => import("@/components/landing/CosmicJourney"), { ssr: false });

// ─── Copy ─────────────────────────────────────────────────────────────────────

const STATIONS = [
  {
    range: [0.0, 0.13] as const,
    kicker: "COSMORA",
    title: <>Decoding the <Em>architecture</Em> of time</>,
    body: "A cosmic intelligence engine from 2070. It begins out here.",
    frame: "FRAME · GALACTIC",
    cta: true,
  },
  {
    range: [0.2, 0.38] as const,
    kicker: "01 · THE SYSTEM",
    title: <>Every world, computed to the <Em>arcsecond</Em></>,
    body: "These are the planets at their true positions — right now. Swiss-ephemeris precision, eight house systems, every dignity and lot. The geometry is real.",
    frame: "FRAME · HELIOCENTRIC",
  },
  {
    range: [0.46, 0.62] as const,
    kicker: "02 · THE APPROACH",
    title: <>Then the sky comes <Em>home</Em></>,
    body: "Transits, profections, zodiacal releasing — two thousand years of timing technique, aimed at one address: yours.",
    frame: "FRAME · GEOCENTRIC",
  },
  {
    range: [0.68, 0.84] as const,
    kicker: "03 · THE MOMENT",
    title: <>One moment. One <Em>sky</Em>. Never repeated.</>,
    body: "The instrument reads the heavens at the second you arrived — and an oracle fluent in the old techniques explains what it finds.",
    frame: "FRAME · LOCAL HORIZON",
  },
  {
    range: [0.88, 1.0] as const,
    kicker: "04 · YOU",
    title: <>The universe <Em>ends at you</Em></>,
    body: "Enter your birth data. The descent you just made — Cosmora makes it through your chart, every day.",
    frame: "FRAME · NATAL",
    cta: true,
  },
];

const FEATURES = [
  { glyph: "◉", title: "Natal Chart Engine", desc: "Every planet, dignity, decan, and Arabic lot computed instantly across 8 house systems." },
  { glyph: "◎", title: "Dual Zodiac Convergence", desc: "Tropical and sidereal read in parallel by independent agents — only what both skies agree on survives." },
  { glyph: "⟳", title: "Zodiacal Releasing", desc: "Hellenistic four-level timing. Life chapters decoded through Fortune and Spirit." },
  { glyph: "✦", title: "AI Oracle", desc: "Claude-powered readings constrained by traditional ruleset. Dignity-sensitive, sect-aware, chart-anchored." },
  { glyph: "◈", title: "Astrocartography", desc: "A living globe with real planetary lines. Find your power places on Earth." },
  { glyph: "☽", title: "Marriage Patterns", desc: "Moon-count significators, divorce indicators, and blended remedies — revealed one union at a time." },
];

const FAQ = [
  { q: "How accurate is the chart calculation?", a: "Astronomy-engine precision — the IAU-grade math professional astrologers rely on. Sub-arcminute on all placements." },
  { q: "What tradition does Cosmora follow?", a: "Hellenistic foundations — whole-sign houses, sect, essential dignities, Lot-based timing — layered with Vedic nakshatras and modern synthesis. Techniques are stacked, and convergence between them is scored." },
  { q: "Is my birth data stored on a server?", a: "No. Chart data lives in your browser. Nothing reaches a server until you ask the Oracle a question." },
  { q: "What is the Temporal Oracle?", a: "Type any time reference — “summer of '99” or “when I turned 30” — and Cosmora reads the full sky, transits, profection year, and releasing period for that window." },
  { q: "What AI powers the Oracle?", a: "Claude by Anthropic. Every query carries your full natal context, current transits, and dignity scores." },
];

// ─── Station overlay ──────────────────────────────────────────────────────────

function Station({ station, progress }: { station: typeof STATIONS[number]; progress: MotionValue<number> }) {
  const [lo, hi] = station.range;
  const fadeIn = (hi - lo) * 0.3;
  const isFirst = lo === 0;
  // First station must be fully visible at progress 0 — it fades OUT only
  const opacity = useTransform(progress, [lo, lo + fadeIn, hi - fadeIn * 0.7, hi], [isFirst ? 1 : 0, 1, 1, 0]);
  const y = useTransform(progress, [lo, lo + fadeIn], [isFirst ? 0 : 34, 0]);
  const isLast = hi >= 1;

  return (
    <motion.div
      style={{ opacity, y, position: "absolute", inset: 0, ...(isLast ? {} : { pointerEvents: "none" }) }}
      className="flex items-center"
    >
      <div className="px-7 lg:px-20 max-w-2xl">
        <p style={{ fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.34em", color: SOLAR(0.75), marginBottom: 18 }}>
          {station.kicker}
        </p>
        <h2 style={{
          fontFamily: FONT.body, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.08,
          fontSize: "clamp(2.2rem, 5.4vw, 4.2rem)", color: COLOR.text1,
          textShadow: "0 2px 40px rgba(8,8,15,0.9)",
        }}>
          {station.title}
        </h2>
        <p style={{
          fontFamily: FONT.body, fontSize: 15, lineHeight: 1.75, color: COLOR.text2,
          marginTop: 22, maxWidth: 460, textShadow: "0 1px 20px rgba(8,8,15,0.95)",
        }}>
          {station.body}
        </p>
        {station.cta && (
          <div className="mt-9 flex items-center gap-4" style={{ pointerEvents: "auto" }}>
            <Link href="/dashboard"><GlowButton size="lg">Begin your reading</GlowButton></Link>
            {lo === 0 && (
              <span style={{ fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.22em", color: COLOR.text3 }}>
                SCROLL TO DESCEND ↓
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── HUD overlay — the remote-viewing chrome ──────────────────────────────────

function JourneyHUD({ progress }: { progress: MotionValue<number> }) {
  const [frame, setFrame] = useState(STATIONS[0].frame);
  const [pct, setPct] = useState("000");
  useMotionValueEvent(progress, "change", v => {
    const s = STATIONS.findLast(st => v >= st.range[0]) ?? STATIONS[0];
    setFrame(s.frame);
    setPct(String(Math.round(Math.min(1, Math.max(0, v)) * 100)).padStart(3, "0"));
  });
  const barW = useTransform(progress, v => `${Math.min(100, Math.max(0, v * 100))}%`);

  return (
    <div className="absolute inset-x-0 bottom-0 px-7 lg:px-20 pb-7 pointer-events-none">
      <div className="flex items-end justify-between mb-3"
        style={{ fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.24em", color: SOLAR(0.55) }}>
        <span>{frame}</span>
        <span>DESCENT {pct} / 100</span>
      </div>
      <div className="h-px w-full" style={{ background: SOLAR(0.12) }}>
        <motion.div className="h-px" style={{ width: barW, background: COLOR.solar, boxShadow: GLOW.textSolar }} />
      </div>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: COLOR.glass, border: `1px solid ${open ? COLOR.borderGold : COLOR.border}` }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left cursor-pointer">
        <span style={{ fontFamily: FONT.body, fontSize: 14, color: COLOR.text1 }}>{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} style={{ color: SOLAR(0.6), fontSize: 18, flexShrink: 0 }}>+</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
            <p className="px-6 pb-5" style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 1.75, color: COLOR.text2 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: journeyRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 55, damping: 22, restDelta: 0.0004 });

  // Canvas fades as the journey hands off to the page content
  const canvasOpacity = useTransform(progress, [0.96, 1], [1, 0.25]);

  // Quality + reduced-motion detection
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (window.innerWidth < 768 || (nav.deviceMemory !== undefined && nav.deviceMemory <= 4)) setQuality("low");
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div style={{ background: COLOR.void, color: COLOR.text1, fontFamily: FONT.body }}>

      {/* Minimal fixed nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-7 lg:px-20 py-5"
        style={{ background: "linear-gradient(180deg, rgba(8,8,15,0.85), transparent)" }}>
        <Link href="/" className="flex items-center gap-3 no-underline">
          <svg viewBox="0 0 24 24" fill="none" stroke={COLOR.solar} strokeWidth="1.4" className="w-5 h-5">
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
            <line x1="12" y1="3" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="21" />
            <line x1="3" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="21" y2="12" />
          </svg>
          <span style={{ fontFamily: FONT.data, fontSize: 13, letterSpacing: "0.3em", color: COLOR.solar }}>COSMORA</span>
        </Link>
        <Link href="/dashboard" className="no-underline">
          <span style={{
            fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.22em", color: COLOR.text2,
            border: `1px solid ${COLOR.border}`, borderRadius: 999, padding: "8px 18px",
          }}>
            ENTER →
          </span>
        </Link>
      </nav>

      {/* ════════ THE JOURNEY — Cosmos → You (600vh, one camera) ════════ */}
      <div ref={journeyRef} style={{ height: reduced ? "100vh" : "600vh", position: "relative" }}>
        <motion.div style={{ opacity: canvasOpacity, position: "fixed", inset: 0, zIndex: 0 }}>
          <CosmicJourney progress={progress} quality={quality} />
        </motion.div>

        <div className="sticky top-0 h-screen" style={{ zIndex: 10 }}>
          {reduced ? (
            // Reduced motion: single static composition
            <div className="absolute inset-0 flex items-center">
              <div className="px-7 lg:px-20 max-w-2xl">
                <p style={{ fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.34em", color: SOLAR(0.75), marginBottom: 18 }}>COSMORA</p>
                <h1 style={{ fontFamily: FONT.body, fontWeight: 400, fontSize: "clamp(2.2rem,5.4vw,4.2rem)", lineHeight: 1.08, letterSpacing: "-0.025em" }}>
                  Decoding the <Em>architecture</Em> of time
                </h1>
                <div className="mt-9"><Link href="/dashboard"><GlowButton size="lg">Begin your reading</GlowButton></Link></div>
              </div>
            </div>
          ) : (
            <>
              {STATIONS.map((s, i) => <Station key={i} station={s} progress={progress} />)}
              <JourneyHUD progress={progress} />
            </>
          )}
        </div>
      </div>

      {/* ════════ THE INSTRUMENT — features ════════ */}
      <section className="relative px-7 lg:px-20 py-28" style={{ background: COLOR.void, zIndex: 20 }}>
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            align="center"
            kicker="THE INSTRUMENT"
            title={<>Built like a precision instrument, <Em>not a horoscope blog</Em></>}
            sub="Calculation, rules, interpretation, timing — independent layers, each precise, each testable. Techniques are stacked, and their convergence is scored."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {FEATURES.map((f, i) => (
              <Panel key={f.title} pad={24} style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ color: COLOR.solar, fontSize: 18, textShadow: GLOW.textSolar }}>{f.glyph}</span>
                  <h3 style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 500, color: COLOR.text1 }}>{f.title}</h3>
                </div>
                <p style={{ fontFamily: FONT.body, fontSize: 12.5, lineHeight: 1.7, color: COLOR.text2 }}>{f.desc}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ PRICING ════════ */}
      <section className="relative px-7 lg:px-20 py-24" style={{ background: COLOR.void, zIndex: 20 }}>
        <div className="max-w-3xl mx-auto">
          <SectionHeading align="center" kicker="ACCESS"
            title={<>Start free. <Em>Go deeper when ready.</Em></>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
            {[
              { name: "EXPLORER", price: "Free", desc: "Decode your chart. Understand your timing.",
                items: ["Full natal chart — 8 house systems", "Annual profections & dignities", "AI Oracle — 10 queries/day", "Live transits"], accent: false },
              { name: "ASTROLOGER", price: "$14", suffix: "/mo", desc: "Every technique. Unlimited Oracle. Living intelligence.",
                items: ["Everything in Explorer", "Zodiacal Releasing + Dual Zodiac", "Temporal Oracle & Solar Returns", "Marriage Patterns & remedies", "AI Oracle — unlimited", "Convergence scoring"], accent: true },
            ].map(plan => (
              <Panel key={plan.name} glow={plan.accent} pad={30}>
                <DataReadout items={[plan.name]} color={plan.accent ? "solar" : "muted"} />
                <div className="flex items-end gap-1 mt-3 mb-2">
                  <span style={{ fontFamily: FONT.body, fontSize: 36, fontWeight: 300, color: COLOR.text1 }}>{plan.price}</span>
                  {plan.suffix && <span style={{ fontFamily: FONT.data, fontSize: 11, color: COLOR.text3, marginBottom: 8 }}>{plan.suffix}</span>}
                </div>
                <p style={{ fontFamily: FONT.body, fontSize: 12.5, color: COLOR.text2, marginBottom: 20 }}>{plan.desc}</p>
                <ul className="space-y-2.5 mb-7">
                  {plan.items.map(f => (
                    <li key={f} className="flex items-center gap-2.5" style={{ fontFamily: FONT.body, fontSize: 12.5, color: COLOR.text2 }}>
                      <span style={{ color: SOLAR(0.55), fontSize: 10 }}>✦</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard">
                  <GlowButton variant={plan.accent ? "primary" : "ghost"}>
                    {plan.accent ? "Begin your reading" : "Start free"}
                  </GlowButton>
                </Link>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FAQ ════════ */}
      <section className="relative px-7 lg:px-20 py-24" style={{ background: COLOR.void, zIndex: 20 }}>
        <div className="max-w-2xl mx-auto">
          <SectionHeading align="center" kicker="TRANSMISSIONS" title={<>Common <Em>questions</Em></>} />
          <div className="space-y-2 mt-8">
            {FAQ.map(item => <FAQItem key={item.q} {...item} />)}
          </div>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <section className="relative px-7 lg:px-20 py-32 text-center" style={{ background: COLOR.void, zIndex: 20 }}>
        <div className="max-w-2xl mx-auto">
          <DataReadout items={["TRANSMISSION OPEN"]} color="solar" />
          <h2 className="mt-6 mb-8" style={{
            fontFamily: FONT.body, fontWeight: 400, letterSpacing: "-0.03em",
            fontSize: "clamp(2rem, 4.5vw, 3.4rem)", lineHeight: 1.12, color: COLOR.text1,
          }}>
            What chapter of life are <Em>you</Em> in right now?
          </h2>
          <Link href="/dashboard"><GlowButton size="lg">Enter Cosmora</GlowButton></Link>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="relative px-7 lg:px-20 py-8" style={{ borderTop: `1px solid ${COLOR.border}`, background: COLOR.void, zIndex: 20 }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span style={{ fontFamily: FONT.data, fontSize: 11, letterSpacing: "0.26em", color: SOLAR(0.5) }}>COSMORA</span>
          <p style={{ fontFamily: FONT.display, fontStyle: "italic", fontSize: 13, color: COLOR.text3 }}>
            Astrology as symbolic intelligence — not prediction, not fate.
          </p>
          <span style={{ fontFamily: FONT.data, fontSize: 10, color: COLOR.text3 }}>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
