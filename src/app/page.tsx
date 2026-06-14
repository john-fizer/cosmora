"use client";

/**
 * Cosmora home — a planet spinning on its tilted axis is the through-line.
 * As you scroll the marketing sections it glides across the screen and
 * resizes (right→left→center, big→small→mid). No video. No cosmos-dive here —
 * that journey lives at the entrance to the interactive chart.
 */

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { COLOR, FONT, SOLAR, GLOW } from "@/lib/design/tokens";
import { GlowButton, Panel, SectionHeading, Em, DataReadout } from "@/components/ui/primitives";

import VideoPlanet from "@/components/landing/VideoPlanet";

const FEATURES = [
  { glyph: "◉", title: "Natal Chart Engine", desc: "Every planet, dignity, decan, and Arabic lot computed instantly across 8 house systems." },
  { glyph: "◎", title: "Dual Zodiac Convergence", desc: "Tropical and sidereal read in parallel — only what both skies agree on survives." },
  { glyph: "⟳", title: "Zodiacal Releasing", desc: "Hellenistic four-level timing. Life chapters decoded through Fortune and Spirit." },
  { glyph: "◈", title: "Pressure Windows", desc: "Three timing systems stacked. When they converge, the season is real — with a protocol of dated actions." },
  { glyph: "✦", title: "AI Oracle", desc: "Claude-powered readings constrained by traditional ruleset. Dignity-sensitive, sect-aware, chart-anchored." },
  { glyph: "☽", title: "Marriage Patterns", desc: "Moon-count significators, divorce indicators, and blended remedies — one union at a time." },
];

const FAQ = [
  { q: "How accurate is the chart calculation?", a: "Astronomy-engine precision — IAU-grade math, sub-arcminute on all placements." },
  { q: "What tradition does Cosmora follow?", a: "Hellenistic foundations — whole-sign houses, sect, dignities, Lot timing — layered with Vedic nakshatras and modern synthesis. Techniques are stacked, and their convergence is scored." },
  { q: "Is my birth data stored on a server?", a: "No. Chart data lives in your browser. Nothing reaches a server until you ask the Oracle a question." },
  { q: "What AI powers the Oracle?", a: "Claude by Anthropic. Every query carries your full natal context, current transits, and dignity scores." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(14,14,26,0.7)", backdropFilter: "blur(10px)", border: `1px solid ${open ? COLOR.borderGold : COLOR.border}` }}>
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

// Section wrapper — full height so the planet's scroll keyframes align with sections
function Section({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  const justify = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  return (
    <section className="relative min-h-screen flex items-center px-7 lg:px-16" style={{ justifyContent: justify, zIndex: 10 }}>
      {children}
    </section>
  );
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 24, restDelta: 0.0004 });

  return (
    <div style={{ background: COLOR.void, color: COLOR.text1, fontFamily: FONT.body }}>

      {/* The spinning planet — photoreal pre-rendered, glides + resizes on scroll */}
      <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 0, pointerEvents: "none" }}>
        <VideoPlanet progress={progress} />
      </div>
      {/* Soft readability scrim, strongest at the bottom where copy sits */}
      <div className="fixed inset-0" style={{ zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 50%, transparent 40%, rgba(8,8,15,0.5)), linear-gradient(180deg, rgba(8,8,15,0.4), transparent 30%, transparent 70%, rgba(8,8,15,0.6))" }} />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-7 lg:px-16 py-5"
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
          <span style={{ fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.22em", color: COLOR.text2, border: `1px solid ${COLOR.border}`, borderRadius: 999, padding: "8px 18px" }}>
            ENTER →
          </span>
        </Link>
      </nav>

      {/* ── Hero — planet on the right, copy on the left ── */}
      <Section align="left">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="max-w-2xl">
          <p style={{ fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.34em", color: SOLAR(0.75), marginBottom: 22 }}>COSMORA · COSMIC INTELLIGENCE</p>
          <h1 style={{ fontFamily: FONT.body, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.02, fontSize: "clamp(2.8rem, 6.5vw, 5.2rem)", color: COLOR.text1 }}>
            Decoding the <Em>architecture</Em> of time
          </h1>
          <p style={{ fontFamily: FONT.body, fontSize: 16, lineHeight: 1.75, color: COLOR.text2, marginTop: 26, maxWidth: 440 }}>
            A precision astrology instrument from 2070 — the sky computed to the arcsecond, two thousand years of timing technique stacked, read back in plain truth, anchored to the one chart that is yours.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/dashboard"><GlowButton size="lg">Enter Cosmora</GlowButton></Link>
            <a href="#instrument" className="no-underline"><GlowButton variant="ghost">See the instrument</GlowButton></a>
          </div>
          <div className="mt-10"><DataReadout items={["8 HOUSE SYSTEMS", "TROPICAL + SIDEREAL", "AI ORACLE"]} color="muted" size={9} /></div>
        </motion.div>
      </Section>

      {/* ── The Instrument — features, planet drifts left ── */}
      <Section align="right">
        <div id="instrument" className="max-w-2xl lg:w-[58%]">
          <SectionHeading kicker="THE INSTRUMENT" title={<>Built like a precision instrument, <Em>not a horoscope blog</Em></>}
            sub="Calculation, rules, interpretation, timing — independent layers, each precise, each testable. Techniques are stacked, and their convergence is scored." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
            {FEATURES.map(f => (
              <Panel key={f.title} pad={20}>
                <div className="flex items-center gap-3 mb-2">
                  <span style={{ color: COLOR.solar, fontSize: 16, textShadow: GLOW.textSolar }}>{f.glyph}</span>
                  <h3 style={{ fontFamily: FONT.body, fontSize: 13.5, fontWeight: 500, color: COLOR.text1 }}>{f.title}</h3>
                </div>
                <p style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 1.65, color: COLOR.text2 }}>{f.desc}</p>
              </Panel>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Pricing — planet center behind, cards float over it ── */}
      <Section align="center">
        <div id="access" className="max-w-3xl w-full">
          <SectionHeading align="center" kicker="ACCESS" title={<>Start free. <Em>Go deeper when ready.</Em></>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            {[
              { name: "EXPLORER", price: "Free", desc: "Decode your chart. Understand your timing.", items: ["Full natal chart — 8 house systems", "Annual profections & dignities", "AI Oracle — 10 queries/day", "Live transits"], accent: false },
              { name: "ASTROLOGER", price: "$14", suffix: "/mo", desc: "Every technique. Unlimited Oracle.", items: ["Everything in Explorer", "Zodiacal Releasing + Dual Zodiac", "Pressure Windows & protocols", "Marriage Patterns & remedies", "AI Oracle — unlimited", "Convergence scoring"], accent: true },
            ].map(plan => (
              <Panel key={plan.name} glow={plan.accent} pad={28}>
                <DataReadout items={[plan.name]} color={plan.accent ? "solar" : "muted"} />
                <div className="flex items-end gap-1 mt-3 mb-2">
                  <span style={{ fontFamily: FONT.body, fontSize: 34, fontWeight: 300, color: COLOR.text1 }}>{plan.price}</span>
                  {plan.suffix && <span style={{ fontFamily: FONT.data, fontSize: 11, color: COLOR.text3, marginBottom: 8 }}>{plan.suffix}</span>}
                </div>
                <p style={{ fontFamily: FONT.body, fontSize: 12.5, color: COLOR.text2, marginBottom: 18 }}>{plan.desc}</p>
                <ul className="space-y-2 mb-6">
                  {plan.items.map(f => (
                    <li key={f} className="flex items-center gap-2.5" style={{ fontFamily: FONT.body, fontSize: 12.5, color: COLOR.text2 }}>
                      <span style={{ color: SOLAR(0.55), fontSize: 10 }}>✦</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard"><GlowButton variant={plan.accent ? "primary" : "ghost"}>{plan.accent ? "Begin your reading" : "Start free"}</GlowButton></Link>
              </Panel>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FAQ — planet drifts right ── */}
      <Section align="left">
        <div id="faq" className="max-w-xl lg:w-[55%]">
          <SectionHeading kicker="TRANSMISSIONS" title={<>Common <Em>questions</Em></>} />
          <div className="space-y-2 mt-6">{FAQ.map(item => <FAQItem key={item.q} {...item} />)}</div>
        </div>
      </Section>

      {/* ── Final CTA — planet center, large, behind ── */}
      <Section align="center">
        <div className="max-w-2xl text-center">
          <DataReadout items={["TRANSMISSION OPEN"]} color="solar" />
          <h2 className="mt-6 mb-8" style={{ fontFamily: FONT.body, fontWeight: 400, letterSpacing: "-0.03em", fontSize: "clamp(2rem, 4.5vw, 3.4rem)", lineHeight: 1.12, color: COLOR.text1, textShadow: "0 2px 40px rgba(8,8,15,0.9)" }}>
            What chapter of life are <Em>you</Em> in right now?
          </h2>
          <Link href="/dashboard"><GlowButton size="lg">Enter Cosmora</GlowButton></Link>
        </div>
      </Section>

      {/* Footer */}
      <footer className="relative px-7 lg:px-16 py-8" style={{ borderTop: `1px solid ${COLOR.border}`, background: COLOR.void, zIndex: 10 }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span style={{ fontFamily: FONT.data, fontSize: 11, letterSpacing: "0.26em", color: SOLAR(0.5) }}>COSMORA</span>
          <p style={{ fontFamily: FONT.display, fontStyle: "italic", fontSize: 13, color: COLOR.text3 }}>Astrology as symbolic intelligence — not prediction, not fate.</p>
          <span style={{ fontFamily: FONT.data, fontSize: 10, color: COLOR.text3 }}>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
