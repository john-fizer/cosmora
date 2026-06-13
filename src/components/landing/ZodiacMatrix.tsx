"use client";

/**
 * ZodiacMatrix — the signature scroll moment. Scroll telescopes INTO a
 * holographic natal mandala while a matrix-rain of zodiac glyphs cascades
 * behind it. Tony Stark HUD + Dr. Strange sacred geometry + Kang temporal tech.
 *
 * 2D (canvas rain + SVG mandala) driven by scroll — deterministic and crisp.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent, MotionValue } from "framer-motion";
import { COLOR, FONT, SOLAR, ORACLE } from "@/lib/design/tokens";

const SIGN_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const PLANET_GLYPHS = ["☉","☽","☿","♀","♂","♃","♄"];
const RAIN_CHARS = [...SIGN_GLYPHS, ...PLANET_GLYPHS, "0","1","2","3","4","5","6","7","8","9","°","✦","◈"];

// Sample placements (degrees 0–360) + colors — the "decoded" chart
const NODES = [
  { glyph: "☉", lon: 33,  color: "#E8C572", name: "SOL" },
  { glyph: "☽", lon: 128, color: "#C9D4E8", name: "LUNA" },
  { glyph: "☿", lon: 58,  color: "#A89FE0", name: "MERC" },
  { glyph: "♀", lon: 72,  color: "#E0A9C5", name: "VEN" },
  { glyph: "♂", lon: 300, color: "#D4564E", name: "MARS" },
  { glyph: "♃", lon: 145, color: "#D9A954", name: "JOV" },
  { glyph: "♄", lon: 312, color: "#9BA8BC", name: "SAT" },
];
const ASPECTS: [number, number, string][] = [
  [0, 1, "#D4564E"], [0, 5, "#5BB98C"], [2, 3, "#A89FE0"],
  [1, 6, "#5BB98C"], [4, 6, ORACLE(0.8)], [3, 5, "#7FBFCC"],
];

function polar(angleDeg: number, r: number, c: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
}

// ─── Matrix rain (canvas) ─────────────────────────────────────────────────────

function MatrixRain({ intensity }: { intensity: MotionValue<number> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf = 0, cols = 0, drops: number[] = [], speeds: number[] = [];
    const FS = 18;
    const init = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / FS);
      drops = Array.from({ length: cols }, () => Math.random() * -canvas.height / FS);
      speeds = Array.from({ length: cols }, () => 0.4 + Math.random() * 0.8);
    };
    init();
    window.addEventListener("resize", init);
    let frame = 0;
    const draw = () => {
      frame++;
      const boost = 0.5 + intensity.get() * 1.4; // scroll intensifies the rain
      ctx.fillStyle = "rgba(8,8,15,0.16)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FS}px 'Fragment Mono', monospace`;
      for (let i = 0; i < cols; i++) {
        const ch = RAIN_CHARS[(Math.floor(frame * 0.04) + i * 7) % RAIN_CHARS.length];
        const x = i * FS, y = drops[i] * FS;
        // Head glows gold, trail fades violet
        ctx.fillStyle = i % 5 === 0 ? SOLAR(0.85) : ORACLE(0.32 + 0.2 * Math.sin(i + frame * 0.02));
        ctx.fillText(ch, x, y);
        ctx.fillStyle = SOLAR(0.12);
        ctx.fillText(RAIN_CHARS[(i * 3 + frame) % RAIN_CHARS.length], x, y - FS);
        drops[i] += speeds[i] * boost;
        if (y > canvas.height && Math.random() > 0.975) drops[i] = Math.random() * -20;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", init); };
  }, [intensity]);
  return <canvas ref={ref} aria-hidden className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />;
}

// ─── Holographic mandala (SVG) ────────────────────────────────────────────────

function Mandala({ scale, rotate, coreGlow }: { scale: MotionValue<number>; rotate: MotionValue<number>; coreGlow: MotionValue<number> }) {
  const S = 720, C = S / 2;
  const R_OUTER = S * 0.46, R_SIGN = S * 0.40, R_TICK = S * 0.355, R_NODE = S * 0.27, R_RUNE = S * 0.20;

  return (
    <motion.svg viewBox={`0 0 ${S} ${S}`} style={{ width: "min(92vw, 88vh)", height: "min(92vw, 88vh)", scale, rotate, overflow: "visible" }}>
      <defs>
        <radialGradient id="zmCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="30%" stopColor={COLOR.solar} stopOpacity="0.8" />
          <stop offset="70%" stopColor={COLOR.oracle} stopOpacity="0.3" />
          <stop offset="100%" stopColor={COLOR.void} stopOpacity="0" />
        </radialGradient>
        <filter id="zmGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Counter-rotating Dr. Strange rune rings */}
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 80, repeat: Infinity, ease: "linear" }} style={{ originX: `${C}px`, originY: `${C}px` }}>
        <circle cx={C} cy={C} r={R_RUNE} fill="none" stroke={SOLAR(0.5)} strokeWidth="1" strokeDasharray="2 8" />
      </motion.g>
      <motion.g animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} style={{ originX: `${C}px`, originY: `${C}px` }}>
        <circle cx={C} cy={C} r={R_RUNE * 1.32} fill="none" stroke={ORACLE(0.55)} strokeWidth="1" strokeDasharray="14 6" />
      </motion.g>

      {/* Outer rings */}
      <circle cx={C} cy={C} r={R_OUTER} fill="none" stroke={SOLAR(0.55)} strokeWidth="1.4" filter="url(#zmGlow)" />
      <circle cx={C} cy={C} r={R_SIGN} fill="none" stroke={SOLAR(0.22)} strokeWidth="0.8" />
      <circle cx={C} cy={C} r={R_TICK} fill="none" stroke={ORACLE(0.3)} strokeWidth="0.6" />

      {/* 12 sign sectors + glyphs */}
      {SIGN_GLYPHS.map((g, i) => {
        const a0 = i * 30;
        const div = polar(a0, R_OUTER, C); const divIn = polar(a0, R_TICK, C);
        const mid = polar(a0 + 15, (R_OUTER + R_SIGN) / 2, C);
        return (
          <g key={i}>
            <line x1={div.x} y1={div.y} x2={divIn.x} y2={divIn.y} stroke={SOLAR(0.3)} strokeWidth="0.7" />
            <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central" fontSize="20" fill={SOLAR(0.92)} filter="url(#zmGlow)">{g}</text>
          </g>
        );
      })}

      {/* 360 degree ticks */}
      {Array.from({ length: 72 }, (_, i) => {
        const a = i * 5; const maj = i % 6 === 0;
        const p1 = polar(a, R_TICK, C); const p2 = polar(a, R_TICK - (maj ? 12 : 6), C);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={maj ? SOLAR(0.6) : ORACLE(0.35)} strokeWidth={maj ? 1 : 0.5} />;
      })}

      {/* Aspect lines */}
      {ASPECTS.map(([a, b, color], i) => {
        const pa = polar(NODES[a].lon, R_NODE, C); const pb = polar(NODES[b].lon, R_NODE, C);
        return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={color} strokeWidth="0.8" opacity="0.5" />;
      })}

      {/* Planet nodes */}
      {NODES.map((n, i) => {
        const p = polar(n.lon, R_NODE, C);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="13" fill={COLOR.void} stroke={n.color} strokeWidth="1.2" filter="url(#zmGlow)" />
            <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="central" fontSize="13" fill={n.color}>{n.glyph}</text>
          </g>
        );
      })}

      {/* Core */}
      <motion.circle cx={C} cy={C} r={R_RUNE * 0.7} fill="url(#zmCore)" style={{ opacity: coreGlow }} />
      <circle cx={C} cy={C} r="3.5" fill="#FFFFFF" filter="url(#zmGlow)" />
    </motion.svg>
  );
}

// ─── HUD overlay (Stark readouts) ─────────────────────────────────────────────

function HUD({ progress }: { progress: MotionValue<number> }) {
  const [pct, setPct] = useState("000");
  useMotionValueEvent(progress, "change", v => setPct(String(Math.round(Math.min(1, Math.max(0, v)) * 100)).padStart(3, "0")));
  const headlineOpacity = useTransform(progress, [0.04, 0.16, 0.78, 0.9], [0, 1, 1, 0]);
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
      {/* Top-left status */}
      <div className="absolute top-7 left-7" style={{ fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.2em", color: SOLAR(0.7), lineHeight: 2 }}>
        <div>NATAL MATRIX · DECODING</div>
        <div style={{ color: ORACLE(0.7) }}>SECT ▸ DAY · WHOLE SIGN</div>
        <div style={{ color: COLOR.text3 }}>EPHEMERIS LOCK ▸ STABLE</div>
      </div>
      {/* Top-right progress */}
      <div className="absolute top-7 right-7 text-right" style={{ fontFamily: FONT.data, fontSize: 9, letterSpacing: "0.2em", color: SOLAR(0.7), lineHeight: 2 }}>
        <div>TELESCOPE DEPTH</div>
        <div style={{ fontSize: 22, color: COLOR.text1 }}>{pct}<span style={{ fontSize: 9, color: COLOR.text3 }}>/100</span></div>
      </div>
      {/* Center headline */}
      <motion.div className="absolute inset-x-0 bottom-16 flex flex-col items-center text-center px-6" style={{ opacity: headlineOpacity }}>
        <p style={{ fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.3em", color: SOLAR(0.7), marginBottom: 14 }}>THE LIVING INSTRUMENT</p>
        <h2 style={{ fontFamily: FONT.body, fontWeight: 300, fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.02em", color: COLOR.text1, lineHeight: 1.1 }}>
          Your entire sky, <span style={{ fontFamily: FONT.display, fontStyle: "italic", color: SOLAR(0.95) }}>computed and alive</span>
        </h2>
      </motion.div>
      {/* Corner brackets */}
      {[["top-5 left-5","none"],["top-5 right-5","scaleX(-1)"],["bottom-5 left-5","scaleY(-1)"],["bottom-5 right-5","scale(-1)"]].map(([pos, t], i) => (
        <svg key={i} width="26" height="26" viewBox="0 0 26 26" className={`absolute ${pos}`} style={{ transform: t as string, opacity: 0.4 }}>
          <path d="M1 11 L1 1 L11 1" fill="none" stroke={COLOR.solar} strokeWidth="1.4" />
        </svg>
      ))}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function ZodiacMatrix() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 70, damping: 24, restDelta: 0.0004 });

  const scale = useTransform(p, [0, 1], [0.5, 2.7]);
  const rotate = useTransform(p, [0, 1], [-16, 22]);
  const coreGlow = useTransform(p, [0.4, 0.85], [0.2, 1]);
  const mandalaOpacity = useTransform(p, [0, 0.08, 0.9, 1], [0, 1, 1, 0]);

  return (
    <div ref={ref} style={{ height: "320vh", position: "relative", background: COLOR.void, zIndex: 20 }}>
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
        <MatrixRain intensity={p} />
        {/* Vignette so the mandala reads above the rain */}
        <div className="absolute inset-0" style={{ zIndex: 2, background: "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 30%, rgba(8,8,15,0.7) 75%)" }} />
        <motion.div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2, opacity: mandalaOpacity }}>
          <Mandala scale={scale} rotate={rotate} coreGlow={coreGlow} />
        </motion.div>
        <HUD progress={p} />
      </div>
    </div>
  );
}
