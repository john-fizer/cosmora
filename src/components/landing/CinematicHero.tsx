"use client";

/**
 * CinematicHero — motion-site-grade hero. Full-bleed cosmic video with a
 * rAF-driven seamless crossfade loop, liquid-glass chrome, and a word-by-word
 * blur-in headline. Cosmora brand: void + solar gold, Cormorant italic display.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { COLOR, FONT, SOLAR } from "@/lib/design/tokens";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4";

// ─── FadingVideo — manual rAF crossfade loop (no CSS transitions) ─────────────

const FADE_MS = 600;
const FADE_OUT_LEAD = 0.6; // seconds before end to start fading out

function FadingVideo({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  const rafId = useRef<number>(0);
  const fadingOut = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const fadeTo = (target: number, duration: number) => {
      cancelAnimationFrame(rafId.current);
      const start = parseFloat(v.style.opacity || "0");
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / duration);
        v.style.opacity = String(start + (target - start) * k);
        if (k < 1) rafId.current = requestAnimationFrame(tick);
      };
      rafId.current = requestAnimationFrame(tick);
    };

    const onLoaded = () => { v.style.opacity = "0"; v.play().catch(() => {}); fadeTo(1, FADE_MS); };
    const onTime = () => {
      if (!fadingOut.current && v.duration && v.duration - v.currentTime <= FADE_OUT_LEAD && v.currentTime > 0) {
        fadingOut.current = true;
        fadeTo(0, FADE_MS);
      }
    };
    const onEnded = () => {
      v.style.opacity = "0";
      setTimeout(() => { v.currentTime = 0; v.play().catch(() => {}); fadingOut.current = false; fadeTo(1, FADE_MS); }, 80);
    };

    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    if (v.readyState >= 2) onLoaded();
    return () => {
      cancelAnimationFrame(rafId.current);
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <video ref={ref} src={src} muted playsInline preload="auto"
      className={className} style={{ opacity: 0, ...style }} />
  );
}

// ─── BlurText — word-by-word blur-in ──────────────────────────────────────────

function BlurText({ text, className, style, delay = 0 }: {
  text: string; className?: string; style?: React.CSSProperties; delay?: number;
}) {
  const words = text.split(" ");
  return (
    <p className={className} style={{ display: "flex", flexWrap: "wrap", rowGap: "0.1em", ...style }}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ filter: "blur(10px)", opacity: 0, y: 28 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: delay + i * 0.09 }}
          style={{ display: "inline-block", marginRight: "0.26em" }}
        >
          {w}
        </motion.span>
      ))}
    </p>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const EASE = [0.16, 1, 0.3, 1] as const;

export default function CinematicHero() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="relative min-h-screen overflow-hidden" style={{ background: COLOR.void }}>

      {/* Full-bleed cosmic video, focal point at top */}
      <FadingVideo
        src={HERO_VIDEO}
        className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0"
        style={{ width: "120%", height: "120%" }}
      />
      {/* Void grade — keeps text legible, deepens the brand black at the edges */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: "radial-gradient(ellipse 90% 80% at 50% 40%, transparent 30%, rgba(8,8,15,0.55) 80%), linear-gradient(180deg, rgba(8,8,15,0.5) 0%, transparent 35%, rgba(8,8,15,0.85) 100%)" }} />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── Navbar ── */}
        <header className="fixed top-4 inset-x-0 z-50 px-5 sm:px-8 lg:px-14 flex items-center justify-between">
          <Link href="/" className="liquid-glass flex items-center gap-2.5 rounded-full px-4 py-2 no-underline">
            <svg viewBox="0 0 24 24" fill="none" stroke={COLOR.solar} strokeWidth="1.4" className="w-4 h-4">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="3" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="21" />
              <line x1="3" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="21" y2="12" />
            </svg>
            <span style={{ fontFamily: FONT.data, fontSize: 12, letterSpacing: "0.3em", color: COLOR.solar }}>COSMORA</span>
          </Link>

          <nav className="liquid-glass hidden md:flex items-center gap-1 rounded-full px-2 py-1.5">
            {[["Instrument", "#instrument"], ["Access", "#access"], ["FAQ", "#faq"]].map(([label, href]) => (
              <a key={label} href={href} className="px-3 py-1.5 no-underline"
                style={{ fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.16em", color: "rgba(234,230,244,0.8)" }}>
                {label.toUpperCase()}
              </a>
            ))}
          </nav>

          <Link href="/dashboard" className="no-underline">
            <span className="rounded-full px-5 py-2.5 inline-flex items-center gap-2"
              style={{ background: `linear-gradient(135deg, #D9BC7A, ${COLOR.solar})`, color: COLOR.void,
                fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.18em", boxShadow: "0 0 18px rgba(200,165,91,0.4)" }}>
              ENTER ↗
            </span>
          </Link>
        </header>

        {/* ── Hero content ── */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 max-w-4xl pt-28 pb-16">

          {/* Badge */}
          <motion.div
            initial={{ filter: "blur(8px)", opacity: 0, y: 16 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            className="liquid-glass inline-flex items-center gap-2.5 rounded-full pr-4 mb-8 self-start"
            style={{ padding: "5px 5px" }}
          >
            <span className="rounded-full px-2.5 py-1" style={{ background: COLOR.solar, color: COLOR.void, fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.12em", fontWeight: 600 }}>
              NEW
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 12.5, color: "rgba(234,230,244,0.9)", paddingRight: 6 }}>
              Dual Zodiac Convergence is live — two skies, one truth
            </span>
          </motion.div>

          {/* Headline — blur-in, Cormorant italic accent */}
          <h1 style={{ marginBottom: 22 }}>
            <BlurText
              text="Decoding the"
              delay={0.35}
              style={{ fontFamily: FONT.body, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 0.98,
                fontSize: "clamp(3rem, 8vw, 6.2rem)", color: COLOR.text1 }}
            />
            <BlurText
              text="architecture of time"
              delay={0.6}
              style={{ fontFamily: FONT.display, fontStyle: "italic", fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 0.98,
                fontSize: "clamp(3rem, 8vw, 6.2rem)", color: SOLAR(0.95) }}
            />
          </h1>

          {/* Subheading */}
          <motion.p
            initial={{ filter: "blur(8px)", opacity: 0, y: 16 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.9 }}
            style={{ fontFamily: FONT.body, fontSize: 16, lineHeight: 1.7, color: "rgba(234,230,244,0.78)", maxWidth: 520, marginBottom: 36 }}
          >
            A precision astrology instrument from 2070. It computes the sky to the arcsecond, stacks two thousand years of timing technique, and reads it back in plain truth — anchored to the one chart that is yours.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 1.1 }}
            className="flex flex-wrap items-center gap-5 mb-12"
          >
            <Link href="/dashboard" className="no-underline">
              <span className="liquid-glass-strong rounded-full inline-flex items-center gap-2.5 px-7 py-3.5"
                style={{ fontFamily: FONT.data, fontSize: 12, letterSpacing: "0.18em", color: COLOR.text1 }}>
                ENTER COSMORA ↗
              </span>
            </Link>
            <a href="#instrument" className="no-underline inline-flex items-center gap-2"
              style={{ fontFamily: FONT.data, fontSize: 11, letterSpacing: "0.16em", color: "rgba(234,230,244,0.75)" }}>
              SEE THE INSTRUMENT
              <span style={{ color: SOLAR(0.8) }}>↓</span>
            </a>
          </motion.div>

          {/* Stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 1.3 }}
            className="flex flex-wrap items-stretch gap-4"
          >
            {[
              { sym: "◉", value: "8", label: "House systems, arcsecond-precise" },
              { sym: "◎", value: "2,000 yrs", label: "Of timing technique, stacked & scored" },
            ].map(card => (
              <div key={card.label} className="liquid-glass rounded-3xl p-5" style={{ width: 240 }}>
                <span style={{ color: SOLAR(0.9), fontSize: 22 }}>{card.sym}</span>
                <p style={{ fontFamily: FONT.display, fontStyle: "italic", fontWeight: 600, fontSize: 34, color: COLOR.text1, lineHeight: 1, marginTop: 12, letterSpacing: "-0.01em" }}>
                  {card.value}
                </p>
                <p style={{ fontFamily: FONT.body, fontSize: 11.5, color: "rgba(234,230,244,0.55)", marginTop: 8, lineHeight: 1.5 }}>
                  {card.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom hairline cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="px-6 sm:px-10 lg:px-14 pb-6 flex items-center gap-4">
          <span style={{ fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.24em", color: SOLAR(0.55) }}>
            COSMIC INTELLIGENCE · OBSERVATORY LINK STABLE
          </span>
          <div className="flex-1 h-px" style={{ background: SOLAR(0.14) }} />
        </motion.div>
      </div>
    </section>
  );
}
