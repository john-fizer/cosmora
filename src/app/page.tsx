"use client";

import { useState, useRef } from "react";
import { LoopingVideo } from "@/components/ui/LoopingVideo";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import Link from "next/link";
import ScrollStory from "@/components/landing/ScrollStory";
import {
  Sparkles, Download, Wand2, BookOpen, ArrowRight, Menu,
  MessageCircle, Briefcase, Camera, Clock, Star, Layers, Compass,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: <Star size={18} />, title: "Natal Chart Engine", desc: "Swiss Ephemeris precision across 8 house systems. Every planet, dignity, and Arabic lot computed instantly." },
  { icon: <Clock size={18} />, title: "Temporal Oracle", desc: "Navigate any moment in time — past or future — and read the full cosmic context of that window." },
  { icon: <Layers size={18} />, title: "Zodiacal Releasing", desc: "Hellenistic four-level timing. Life chapters and sub-chapters decoded through Fortune and Spirit." },
  { icon: <Sparkles size={18} />, title: "AI Oracle", desc: "Claude-powered readings constrained by traditional ruleset. Dignity-sensitive, sect-aware, chart-anchored." },
  { icon: <Compass size={18} />, title: "Astrocartography", desc: "3D globe with real astronomy-engine planetary lines. Find your power places on Earth." },
  { icon: <Wand2 size={18} />, title: "Convergence Score", desc: "When profection, releasing, and transits align — Cosmora quantifies and explains the overlap." },
];

const FAQ = [
  { q: "How accurate is the chart calculation?", a: "Swiss Ephemeris — the same library used by professional astrologers worldwide. Sub-arcminute precision on all placements." },
  { q: "What tradition does Cosmora follow?", a: "Primarily Hellenistic: whole-sign houses, sect, essential dignities, and Lot-based timing like zodiacal releasing and annual profections." },
  { q: "Is my birth data stored on a server?", a: "No. All chart data lives in your browser's localStorage. Nothing reaches a server until you ask the Oracle a question." },
  { q: "What is the Temporal Oracle?", a: 'Type any time reference — "summer of \'99" or "when I turned 30" — and Cosmora reads the full sky, transits, profection year, and ZR period for that window.' },
  { q: "What AI powers the Oracle?", a: "Claude by Anthropic. Unlike generic chatbots, every query carries your full natal chart context, current transits, and dignity scores." },
];

// ─── FAQ accordion ─────────────────────────────────────────────────────────────

function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.06 }}
      className="liquid-glass rounded-2xl overflow-hidden"
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left cursor-pointer">
        <span className="text-sm text-white/70 font-medium">{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="text-white/30 text-xl leading-none flex-shrink-0">+</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
            <div className="px-6 pb-5 text-sm text-white/50 leading-relaxed">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Landing page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Hero parallax exit — fades and scales away as the story begins
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroScale   = useTransform(heroScroll, [0, 1], [1, 0.94]);
  const heroOpacity = useTransform(heroScroll, [0, 0.75, 1], [1, 1, 0]);
  const heroY       = useTransform(heroScroll, [0, 1], [0, 90]);

  // Page scroll progress bar
  const { scrollYProgress: pageScroll } = useScroll();
  const pageProgress = useSpring(pageScroll, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* Scroll progress filament */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left pointer-events-none"
        style={{ scaleX: pageProgress, background: "linear-gradient(90deg, #C8A55B, #7B6FD4)", boxShadow: "0 0 10px rgba(200,165,91,0.7)" }}
      />

      {/* ══════════════════════════════════════════════════════════════
          HERO — full-screen video + two-panel glass split
      ══════════════════════════════════════════════════════════════ */}
      <motion.section ref={heroRef} style={{ scale: heroScale, opacity: heroOpacity, y: heroY }} className="relative min-h-screen flex overflow-hidden">

        {/* Video background — crossfade loop */}
        <LoopingVideo
          src="https://d8j0ntlcm91z4.cloudfront.net/user_3EJVjiEA4WaVDp4iCvA6Qzd9BpD/hf_20260603_160849_b4723a21-2d1d-4d62-99f5-756068f42d94.mp4"
          position="absolute"
          opacity={1}
        />

        {/* Dark scrim for readability */}
        <div className="absolute inset-0 bg-black/40" style={{ zIndex: 3 }} />

        {/* ── LEFT PANEL (52%) ─────────────────────────────────────── */}
        <div className="relative w-full lg:w-[52%] flex flex-col min-h-screen" style={{ zIndex: 10 }}>

          {/* Liquid glass overlay card — floats inside the panel */}
          <div className="liquid-glass-strong absolute inset-4 lg:inset-6 rounded-3xl flex flex-col" />

          {/* Content sits on top of glass */}
          <div className="relative z-10 flex flex-col min-h-screen px-8 lg:px-10 py-6">

            {/* Nav */}
            <nav className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" className="w-4 h-4">
                    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="3" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="21" />
                    <line x1="3" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="21" y2="12" />
                  </svg>
                </div>
                <span className="text-white font-semibold text-xl tracking-tighter">cosmora</span>
              </div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="liquid-glass flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-white/80 hover:scale-105 transition-transform"
              >
                <Menu size={15} /> Menu
              </button>
            </nav>

            {/* Mobile nav dropdown */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="liquid-glass-strong rounded-2xl mt-3 p-4 flex flex-col gap-3"
                >
                  {["Features", "Techniques", "Pricing", "FAQ"].map(item => (
                    <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}
                      className="text-sm text-white/70 hover:text-white transition-colors py-1">
                      {item}
                    </a>
                  ))}
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                    className="text-sm text-white font-medium py-1">
                    Enter App →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hero center */}
            <div className="flex-1 flex flex-col items-start justify-center py-12">

              {/* Logo glyph */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="mb-8 w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <svg viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="1.2" className="w-12 h-12">
                  <circle cx="24" cy="24" r="20" opacity="0.3" />
                  <circle cx="24" cy="24" r="12" opacity="0.5" />
                  <circle cx="24" cy="24" r="5" fill="white" opacity="0.8" />
                  <line x1="24" y1="4" x2="24" y2="12" /><line x1="24" y1="36" x2="24" y2="44" />
                  <line x1="4" y1="24" x2="12" y2="24" /><line x1="36" y1="24" x2="44" y2="24" />
                </svg>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.8 }}
                className="text-6xl lg:text-7xl text-white mb-8 leading-[1.05]"
                style={{ fontWeight: 500, letterSpacing: "-0.05em" }}
              >
                Decoding the<br />
                <em className="not-italic text-white/80" style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic" }}>
                  architecture of
                </em>
                {" "}time
              </motion.h1>

              {/* CTA button */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="liquid-glass-strong flex items-center gap-3 px-6 py-3 rounded-full text-white font-medium text-sm tracking-wide"
                  >
                    <span>Enter the Oracle</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                      <Download size={14} />
                    </div>
                  </motion.button>
                </Link>
              </motion.div>

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex flex-wrap gap-2 mb-16"
              >
                {[
                  { label: "Oracle Readings", href: "/dashboard/oracle" },
                  { label: "Live Transits", href: "/dashboard/transits" },
                  { label: "Temporal Archive", href: "/dashboard/temporal" },
                ].map(({ label, href }) => (
                  <Link key={label} href={href} className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 hover:scale-105 transition-transform">
                    {label}
                  </Link>
                ))}
              </motion.div>

              {/* Bottom quote */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="border-t border-white/10 pt-6 w-full"
              >
                <p className="text-xs tracking-widest uppercase text-white/50 mb-3">Cosmic Intelligence</p>
                <p className="text-base text-white/80 mb-3" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                  <span style={{ fontFamily: "'Poppins', sans-serif" }}>&ldquo;</span>
                  <em>The map was written before you were born.</em>
                  <span style={{ fontFamily: "'Poppins', sans-serif" }}>&rdquo;</span>
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-xs tracking-widest text-white/40">COSMORA 2070</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (48%) — desktop only ─────────────────────── */}
        <div className="hidden lg:flex lg:w-[48%] flex-col relative" style={{ zIndex: 10 }}>
          <div className="flex flex-col h-full px-8 py-6">

            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="liquid-glass flex items-center gap-1 px-3 py-2 rounded-full">
                {[
                  { icon: <MessageCircle size={14} />, href: "/dashboard/oracle", title: "Oracle" },
                  { icon: <Briefcase size={14} />, href: "/dashboard/reports", title: "Reports" },
                  { icon: <Camera size={14} />, href: "/dashboard/map", title: "Astro Map" },
                ].map((item, i) => (
                  <Link key={i} href={item.href} title={item.title} className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:text-white/80 hover:scale-110 transition-all bg-white/10">
                    {item.icon}
                  </Link>
                ))}
                <div className="w-px h-4 bg-white/20 mx-1" />
                <ArrowRight size={14} className="text-white/40" />
              </div>
              <Link href="/dashboard/settings">
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="liquid-glass flex items-center gap-2 px-4 py-2 rounded-full text-xs text-white/80 cursor-pointer"
                >
                  <Sparkles size={13} /> Account
                </motion.span>
              </Link>
            </div>

            {/* Community card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="liquid-glass rounded-2xl p-5 mt-6 w-56"
            >
              <p className="text-sm font-medium text-white mb-1.5">Enter the archive</p>
              <p className="text-xs text-white/50 leading-relaxed">
                Your natal chart is a living document. Every question reveals a new layer.
              </p>
            </motion.div>

            {/* Feature cards — bottom */}
            <div className="mt-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="liquid-glass p-5 rounded-[2.5rem]"
              >
                {/* Two cards */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="liquid-glass rounded-3xl p-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 mb-3">
                      <Wand2 size={15} className="text-white/80" />
                    </div>
                    <p className="text-xs font-medium text-white mb-1">Temporal Oracle</p>
                    <p className="text-[11px] text-white/40 leading-relaxed">Navigate any moment in time</p>
                  </div>
                  <div className="liquid-glass rounded-3xl p-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 mb-3">
                      <BookOpen size={15} className="text-white/80" />
                    </div>
                    <p className="text-xs font-medium text-white mb-1">Cosmic Archive</p>
                    <p className="text-[11px] text-white/40 leading-relaxed">Reports & timing history</p>
                  </div>
                </div>

                {/* Bottom card */}
                <div className="liquid-glass rounded-3xl p-4 flex items-center gap-4">
                  {/* Chart wheel thumbnail */}
                  <div className="w-24 h-16 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <svg viewBox="0 0 96 64" className="w-full h-full">
                      <circle cx="48" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
                      <circle cx="48" cy="32" r="18" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" />
                      <circle cx="48" cy="32" r="8" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.8" />
                      {Array.from({length:12},(_,i)=>{
                        const a=(i*30-90)*Math.PI/180;
                        return <line key={i} x1={48+Math.cos(a)*18} y1={32+Math.sin(a)*18} x2={48+Math.cos(a)*28} y2={32+Math.sin(a)*28} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />;
                      })}
                      {[{a:45,r:22,c:"rgba(251,191,36,0.7)"},{a:190,r:22,c:"rgba(196,181,253,0.7)"},{a:310,r:22,c:"rgba(248,113,113,0.7)"}].map((p,i)=>{
                        const rad=p.a*Math.PI/180;
                        return <circle key={i} cx={48+Math.cos(rad)*p.r} cy={32+Math.sin(rad)*p.r} r="2.5" fill={p.c} />;
                      })}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white mb-1">Advanced Chart Reading</p>
                    <p className="text-[11px] text-white/40 leading-relaxed">Dignity scores, aspects, Arabic lots</p>
                  </div>
                  <Link href="/dashboard/chart">
                    <motion.span
                      whileHover={{ scale: 1.1 }}
                      className="liquid-glass w-8 h-8 rounded-full flex items-center justify-center text-white/60 text-lg flex-shrink-0 cursor-pointer"
                    >
                      +
                    </motion.span>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ══════════════════════════════════════════════════════════════
          SCROLL STORY — the instrument assembles itself
      ══════════════════════════════════════════════════════════════ */}
      <ScrollStory />

      {/* ══════════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs tracking-widest uppercase text-white/40 mb-4">The System</p>
            <h2 className="text-4xl lg:text-5xl text-white mb-4 leading-tight" style={{ fontWeight: 500, letterSpacing: "-0.03em" }}>
              Built like a precision instrument,<br />
              <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "rgba(255,255,255,0.6)" }}>
                not a horoscope blog.
              </em>
            </h2>
            <p className="text-white/50 max-w-lg mx-auto text-sm leading-relaxed">
              Six independent layers: calculation, rules, interpretation, personalization, timing, and UX — each precise, each testable.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.02 }}
                className="liquid-glass-cosmos rounded-2xl p-6 cursor-default"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/8 mb-4 text-white/70">
                  {f.icon}
                </div>
                <h3 className="text-sm font-medium text-white mb-2">{f.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-xs tracking-widest uppercase text-white/40 mb-4">Pricing</p>
            <h2 className="text-4xl text-white mb-3" style={{ fontWeight: 500, letterSpacing: "-0.03em" }}>
              Start free.<br />
              <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "rgba(255,255,255,0.6)" }}>Go deeper when ready.</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                name: "EXPLORER",
                price: "Free",
                desc: "Decode your chart. Understand your timing.",
                features: ["Full natal chart (8 house systems)", "Annual profection year", "Essential dignities & sect", "AI Oracle — 10 queries/day", "Live transits"],
                cta: "Start Free",
                accent: false,
              },
              {
                name: "ASTROLOGER",
                price: "$14",
                suffix: "/mo",
                desc: "Every technique. Unlimited Oracle. Living intelligence.",
                features: ["Everything in Explorer", "Zodiacal Releasing + Firdaria", "Temporal Oracle", "Solar Return & Progressions", "Synastry & compatibility", "AI Oracle — unlimited", "Convergence scoring"],
                cta: "Begin Your Reading",
                accent: true,
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                whileHover={{ scale: 1.02 }}
                className={`${plan.accent ? "liquid-glass-strong" : "liquid-glass"} rounded-3xl p-7 flex flex-col`}
              >
                <p className="text-xs tracking-widest text-white/50 mb-2">{plan.name}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl text-white" style={{ fontWeight: 400, letterSpacing: "-0.03em" }}>{plan.price}</span>
                  {plan.suffix && <span className="text-sm text-white/40 mb-1">{plan.suffix}</span>}
                </div>
                <p className="text-xs text-white/50 mb-6 leading-relaxed">{plan.desc}</p>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-xs text-white/60">
                      <span className="text-white/30">✦</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-full py-3 rounded-full text-sm font-medium tracking-wide cursor-pointer ${plan.accent ? "liquid-glass-strong text-white" : "liquid-glass text-white/80"}`}
                  >
                    {plan.cta} →
                  </motion.button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs tracking-widest uppercase text-white/40 mb-4">FAQ</p>
            <h2 className="text-3xl text-white" style={{ fontWeight: 500, letterSpacing: "-0.03em" }}>Common questions</h2>
          </motion.div>
          <div className="space-y-2">
            {FAQ.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} i={i} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs tracking-widest uppercase text-white/40 mb-6">Begin Your Reading</p>
            <h2 className="text-5xl text-white mb-6 leading-tight" style={{ fontWeight: 500, letterSpacing: "-0.04em" }}>
              What chapter of life<br />
              <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "rgba(255,255,255,0.55)" }}>
                are you in right now?
              </em>
            </h2>
            <p className="text-sm text-white/50 mb-10 leading-relaxed max-w-md mx-auto">
              Enter your birth data. Let Cosmora calculate, interpret, and illuminate the timing of your life — past, present, and future.
            </p>
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="liquid-glass-strong inline-flex items-center gap-3 px-8 py-4 rounded-full text-white font-medium text-sm tracking-wide"
              >
                Enter Cosmora
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/15">
                  <ArrowRight size={14} />
                </div>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MARQUEE
      ══════════════════════════════════════════════════════════════ */}
      <div className="liquid-glass py-4 overflow-hidden border-t border-b border-white/5">
        <motion.div
          className="flex gap-8 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, ease: "linear", repeat: Infinity }}
          style={{ width: "max-content" }}
        >
          {[...Array(2)].map((_, copy) => (
            <div key={copy} className="flex gap-8 items-center">
              {["Swiss Ephemeris", "Zodiacal Releasing", "Annual Profections", "Temporal Oracle", "Astrocartography", "AI Oracle", "Solar Returns", "Firdaria", "Dignity System", "Convergence Score", "3D Orrery", "Synastry"].map((item, i) => (
                <span key={i} className="flex items-center gap-4">
                  <span className="text-xs tracking-widest text-white/25" style={{ fontFamily: "'Fragment Mono', monospace" }}>{item}</span>
                  <span className="text-white/15 text-[0.4rem]">◆</span>
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span className="text-white/60 font-semibold tracking-tighter">cosmora</span>
          </div>
          <p className="text-xs text-white/25 text-center">
            Astrology as symbolic intelligence — not prediction, not fate.
          </p>
          <p className="text-xs text-white/25" style={{ fontFamily: "'Fragment Mono', monospace" }}>© 2026 Cosmora</p>
        </div>
      </footer>

    </div>
  );
}
