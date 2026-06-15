"use client";

/**
 * GlassHero — the home's first screen. A PRE-RENDERED photoreal Saturn
 * (Higgsfield, 16k-grade) carries the fidelity that real-time WebGL can't — no
 * "80s NASA" flat-sphere look. It stays alive via cursor parallax + a slow
 * ambient drift (the "seeing realtime" feel without a low-fi live sphere or a
 * looping/​drifting video). Liquid-glass UI floats over it: a glass pill navbar,
 * a typewriter headline, and a glass CTA. Scrolling hands off into the dive.
 *
 * Inspired (only) by Mainframe (typewriter + cursor-reactive bg), the dark
 * portfolio (floating glass pill nav, blur-in), Bloom (liquid glass) — built in
 * Cosmora's brand (Void + Solar gold, Cormorant/Outfit/Fragment Mono).
 */

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { COLOR, FONT, SOLAR } from "@/lib/design/tokens";

// ── Typewriter ────────────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 42, startDelay = 500) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    let i = 0;
    const start = setTimeout(() => {
      const id = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(id); setDone(true); }
      }, speed);
    }, startDelay);
    return () => clearTimeout(start);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

// ── Photoreal background with cursor parallax + slow ambient drift ──────────────
function ParallaxBg() {
  const planet = useRef<HTMLDivElement>(null);
  const haze = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0; let t = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    };
    const tick = () => {
      t += 0.006;
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      const driftX = Math.sin(t) * 0.32;
      const driftY = Math.cos(t * 0.8) * 0.22;
      const px = (cur.x + driftX) * -2.4;
      const py = (cur.y + driftY) * -1.8;
      if (planet.current) planet.current.style.transform = `scale(1.1) translate(${px}%, ${py}%)`;
      // Foreground haze parallaxes further for depth
      if (haze.current) haze.current.style.transform = `scale(1.15) translate(${px * 1.8}%, ${py * 1.8}%)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={planet} className="absolute inset-0 will-change-transform"
        style={{ backgroundImage: "url(/images/hero-saturn.jpg)", backgroundSize: "cover", backgroundPosition: "center right" }} />
      {/* faint nebula haze layer for parallax depth */}
      <div ref={haze} className="absolute inset-0 will-change-transform opacity-40 mix-blend-screen"
        style={{ backgroundImage: "url(/textures/space/nebula_brand.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
    </div>
  );
}

// ── Glass UI ────────────────────────────────────────────────────────────────────
const NAV = [
  { label: "Instrument", href: "#instrument" },
  { label: "Oracle", href: "/dashboard/oracle" },
  { label: "Access", href: "#access" },
];

function GlassNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 md:pt-6 px-4 pointer-events-none">
      <div className="liquid-glass-strong rounded-full pointer-events-auto flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2">
        <Link href="/" className="flex items-center gap-2.5 no-underline pl-1">
          <span className="grid place-items-center rounded-full" style={{ width: 24, height: 24, background: "linear-gradient(135deg,#C8A55B,#A8852B)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#08080F" strokeWidth="1.8" className="w-3.5 h-3.5">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <span style={{ fontFamily: FONT.data, fontSize: 12, letterSpacing: "0.26em", color: COLOR.text1 }}>COSMORA</span>
        </Link>
        <span className="hidden sm:block w-px h-5" style={{ background: "rgba(255,255,255,0.12)" }} />
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(n => (
            <Link key={n.label} href={n.href} className="no-underline rounded-full px-3 py-1.5 transition-colors hover:opacity-60"
              style={{ fontFamily: FONT.body, fontSize: 13, color: COLOR.text2 }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <span className="hidden sm:block w-px h-5" style={{ background: "rgba(255,255,255,0.12)" }} />
        <Link href="/dashboard" className="no-underline">
          <span className="liquid-glass rounded-full inline-flex items-center gap-1.5 px-4 py-1.5 transition-transform hover:scale-[1.04]"
            style={{ fontFamily: FONT.body, fontSize: 13, color: COLOR.text1 }}>
            Enter <span style={{ color: SOLAR(0.9) }}>↗</span>
          </span>
        </Link>
      </div>
    </motion.header>
  );
}

export default function GlassHero() {
  const FULL = "Your entire sky,\ncomputed and alive";
  const { displayed, done } = useTypewriter(FULL, 44, 650);
  const splitAt = FULL.indexOf("\n") + 1;
  const line1 = displayed.slice(0, Math.min(displayed.length, splitAt));
  const line2 = displayed.length > splitAt ? displayed.slice(splitAt) : "";

  return (
    <section className="relative w-full h-screen overflow-hidden" style={{ background: COLOR.void }}>
      <ParallaxBg />

      {/* Left-side readability gradient so copy holds over the planet */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: "linear-gradient(90deg, rgba(8,8,15,0.92) 0%, rgba(8,8,15,0.55) 42%, transparent 74%)" }} />
      {/* Cinematic vignette */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
        style={{ boxShadow: "inset 0 0 240px 70px rgba(8,8,15,0.8)" }} />

      <GlassNav />

      {/* Content — restrained: eyebrow, one confident headline, one line, one CTA */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col justify-center">
        <motion.div initial={{ opacity: 0, filter: "blur(8px)", y: 14 }} animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="flex items-center gap-3 mb-7">
          <span className="block h-px w-10" style={{ background: SOLAR(0.5) }} />
          <span style={{ fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.36em", color: SOLAR(0.8) }}>THE LIVING INSTRUMENT</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ fontFamily: FONT.display, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.02,
            fontSize: "clamp(3rem, 8vw, 6.4rem)", color: COLOR.text1, whiteSpace: "pre-wrap", maxWidth: "14ch", textWrap: "balance" }}>
          {line1}
          <span style={{ fontStyle: "italic", color: SOLAR(0.95) }}>{line2}</span>
          {!done && <span className="inline-block align-middle animate-blink" style={{ width: 2, height: "0.86em", marginLeft: 4, background: SOLAR(0.9) }} />}
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.55 }}
          style={{ fontFamily: FONT.body, fontWeight: 300, fontSize: 17, lineHeight: 1.72, letterSpacing: "0.01em", color: COLOR.text2, marginTop: 30, maxWidth: "42ch" }}>
          A precision instrument from 2070 — your sky computed to the arcsecond, two thousand years of technique read back in plain truth.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.75 }}
          className="flex items-center gap-7 mt-12">
          <Link href="/dashboard" className="no-underline">
            <span className="liquid-glass-strong rounded-full inline-flex items-center gap-2.5 px-8 py-4 transition-transform duration-200 hover:scale-[1.03]"
              style={{ fontFamily: FONT.body, fontSize: 15, color: COLOR.text1 }}>
              Enter Cosmora <span style={{ color: SOLAR(0.95) }}>↗</span>
            </span>
          </Link>
          <a href="#descent" className="no-underline inline-flex items-center gap-2"
            style={{ fontFamily: FONT.body, fontSize: 14, color: COLOR.text2 }}>
            <span style={{ borderBottom: `1px solid ${COLOR.border}`, paddingBottom: 2 }}>See the descent</span>
            <span style={{ color: SOLAR(0.7) }}>↓</span>
          </a>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.4 }}
        className="absolute bottom-7 inset-x-0 z-10 flex flex-col items-center gap-2 pointer-events-none">
        <span style={{ fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.3em", color: COLOR.text3 }}>SCROLL TO BEGIN THE DESCENT</span>
        <span className="w-px h-9 overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
          <motion.span className="block w-px h-3" style={{ background: SOLAR(0.8) }}
            animate={{ y: [-12, 36] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
        </span>
      </motion.div>
    </section>
  );
}
