"use client";

/**
 * Cosmora landing — two-panel hero: the instrument's promise on the left,
 * a slowly-rotating planet on the right. No video. Constitution chrome only.
 */

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { COLOR, FONT, SOLAR, GLOW } from "@/lib/design/tokens";
import { GlowButton, Panel, SectionHeading, Em, DataReadout } from "@/components/ui/primitives";
import CinematicHero from "@/components/landing/CinematicHero";

// ─── Copy ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { glyph: "◉", title: "Natal Chart Engine", desc: "Every planet, dignity, decan, and Arabic lot computed instantly across 8 house systems." },
  { glyph: "◎", title: "Dual Zodiac Convergence", desc: "Tropical and sidereal read in parallel by independent agents — only what both skies agree on survives." },
  { glyph: "⟳", title: "Zodiacal Releasing", desc: "Hellenistic four-level timing. Life chapters decoded through Fortune and Spirit." },
  { glyph: "◈", title: "Pressure Windows", desc: "Three timing systems stacked. When they converge, the season is real — and a protocol of dated actions follows." },
  { glyph: "✦", title: "AI Oracle", desc: "Claude-powered readings constrained by traditional ruleset. Dignity-sensitive, sect-aware, chart-anchored." },
  { glyph: "☽", title: "Marriage Patterns", desc: "Moon-count significators, divorce indicators, and blended remedies — revealed one union at a time." },
];

const FAQ = [
  { q: "How accurate is the chart calculation?", a: "Astronomy-engine precision — the IAU-grade math professional astrologers rely on. Sub-arcminute on all placements." },
  { q: "What tradition does Cosmora follow?", a: "Hellenistic foundations — whole-sign houses, sect, essential dignities, Lot-based timing — layered with Vedic nakshatras and modern synthesis. Techniques are stacked, and convergence between them is scored." },
  { q: "Is my birth data stored on a server?", a: "No. Chart data lives in your browser. Nothing reaches a server until you ask the Oracle a question." },
  { q: "What is the Temporal Oracle?", a: "Type any time reference — “summer of '99” or “when I turned 30” — and Cosmora reads the full sky, transits, profection year, and releasing period for that window." },
  { q: "What AI powers the Oracle?", a: "Claude by Anthropic. Every query carries your full natal context, current transits, and dignity scores." },
];

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
  return (
    <div style={{ background: COLOR.void, color: COLOR.text1, fontFamily: FONT.body }}>

      {/* ════════ HERO — cinematic cosmic video, liquid-glass chrome ════════ */}
      <CinematicHero />

      {/* ════════ THE INSTRUMENT — features ════════ */}
      <section id="instrument" className="relative px-7 lg:px-16 py-28" style={{ background: COLOR.void, zIndex: 20 }}>
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            align="center"
            kicker="THE INSTRUMENT"
            title={<>Built like a precision instrument, <Em>not a horoscope blog</Em></>}
            sub="Calculation, rules, interpretation, timing — independent layers, each precise, each testable. Techniques are stacked, and their convergence is scored."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {FEATURES.map(f => (
              <Panel key={f.title} pad={24}>
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
      <section className="relative px-7 lg:px-16 py-24" style={{ background: COLOR.void, zIndex: 20 }}>
        <div className="max-w-3xl mx-auto">
          <SectionHeading align="center" kicker="ACCESS"
            title={<>Start free. <Em>Go deeper when ready.</Em></>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
            {[
              { name: "EXPLORER", price: "Free", desc: "Decode your chart. Understand your timing.",
                items: ["Full natal chart — 8 house systems", "Annual profections & dignities", "AI Oracle — 10 queries/day", "Live transits"], accent: false },
              { name: "ASTROLOGER", price: "$14", suffix: "/mo", desc: "Every technique. Unlimited Oracle. Living intelligence.",
                items: ["Everything in Explorer", "Zodiacal Releasing + Dual Zodiac", "Pressure Windows & protocols", "Marriage Patterns & remedies", "AI Oracle — unlimited", "Convergence scoring"], accent: true },
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
      <section className="relative px-7 lg:px-16 py-24" style={{ background: COLOR.void, zIndex: 20 }}>
        <div className="max-w-2xl mx-auto">
          <SectionHeading align="center" kicker="TRANSMISSIONS" title={<>Common <Em>questions</Em></>} />
          <div className="space-y-2 mt-8">
            {FAQ.map(item => <FAQItem key={item.q} {...item} />)}
          </div>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <section className="relative px-7 lg:px-16 py-32 text-center" style={{ background: COLOR.void, zIndex: 20 }}>
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
      <footer className="relative px-7 lg:px-16 py-8" style={{ borderTop: `1px solid ${COLOR.border}`, background: COLOR.void, zIndex: 20 }}>
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
