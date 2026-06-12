"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";

/**
 * ScrollStory — sticky scroll-driven cinematic.
 * A holographic chart instrument assembles itself as the user scrolls:
 * zodiac ring → degree ticks → planets ignite → aspect lines draw → full pulse.
 * Three text chapters crossfade alongside.
 */

const CHAPTERS = [
  {
    kicker: "01 · THE SKY",
    title: "First, we mapped the heavens.",
    body: "Every planet, computed to the arcsecond. Twelve signs, twelve houses, the exact geometry of the moment you arrived.",
  },
  {
    kicker: "02 · THE PATTERN",
    title: "Then we connected the architecture.",
    body: "Aspects, dignities, sect, receptions — the relationships between bodies that classical astrologers spent lifetimes decoding. Computed in milliseconds, weighed like evidence.",
  },
  {
    kicker: "03 · THE INSTRUMENT",
    title: "Now it reads with you.",
    body: "A living oracle, anchored to your chart, fluent in two thousand years of technique. Ask it anything. It answers from the sky.",
  },
];

// Planets placed around the wheel (angle°, radius fraction, color, glyph)
const STORY_PLANETS = [
  { angle: 318, rf: 0.74, color: "#FBBF24", glyph: "☉" },
  { angle: 252, rf: 0.74, color: "#C9D4E8", glyph: "☽" },
  { angle: 290, rf: 0.74, color: "#A78BFA", glyph: "☿" },
  { angle: 200, rf: 0.74, color: "#F472B6", glyph: "♀" },
  { angle: 150, rf: 0.74, color: "#EF4444", glyph: "♂" },
  { angle: 95,  rf: 0.74, color: "#F59E0B", glyph: "♃" },
  { angle: 30,  rf: 0.74, color: "#8B9AB4", glyph: "♄" },
];

// Aspect lines between planet indices
const STORY_ASPECTS: [number, number, string][] = [
  [0, 1, "#EF4444"], [0, 5, "#22C55E"], [1, 6, "#22C55E"],
  [2, 4, "#F59E0B"], [3, 6, "#06B6D4"], [4, 5, "#A855F7"],
];

function polar(angle: number, r: number, c: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
}

// ─── The holographic instrument (SVG, scroll-driven) ──────────────────────────

function Instrument({ progress }: { progress: MotionValue<number> }) {
  const S = 560, C = S / 2, R = S * 0.42;

  // Phase windows along scroll [0..1]
  const ringDraw   = useTransform(progress, [0.02, 0.22], [0, 1]);
  const ticksOp    = useTransform(progress, [0.18, 0.30], [0, 1]);
  const ringRotate = useTransform(progress, [0, 1], [-28, 14]);
  const aspectDraw = useTransform(progress, [0.38, 0.62], [0, 1]);
  const coreGlow   = useTransform(progress, [0.66, 0.84], [0, 1]);
  const wholeScale = useTransform(progress, [0, 0.25, 0.9, 1], [0.86, 1, 1, 1.04]);

  const circumference = 2 * Math.PI * R;
  const dashOffset = useTransform(ringDraw, v => circumference * (1 - v));
  const innerR = R * 0.62;
  const innerCirc = 2 * Math.PI * innerR;
  const innerOffset = useTransform(ringDraw, v => innerCirc * (1 - Math.min(1, v * 1.15)));

  return (
    <motion.svg
      viewBox={`0 0 ${S} ${S}`}
      style={{ scale: wholeScale, rotate: ringRotate, width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="storyCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8A55B" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#7B6FD4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#08080F" stopOpacity="0" />
        </radialGradient>
        <filter id="storyGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="storyGlowSoft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer zodiac ring — draws itself */}
      <motion.circle
        cx={C} cy={C} r={R}
        fill="none" stroke="#C8A55B" strokeWidth="1.4"
        strokeDasharray={circumference}
        style={{ strokeDashoffset: dashOffset }}
        strokeLinecap="round" filter="url(#storyGlow)" opacity="0.9"
        transform={`rotate(-90 ${C} ${C})`}
      />
      {/* Inner house ring */}
      <motion.circle
        cx={C} cy={C} r={innerR}
        fill="none" stroke="#7B6FD4" strokeWidth="0.9"
        strokeDasharray={innerCirc}
        style={{ strokeDashoffset: innerOffset }}
        strokeLinecap="round" opacity="0.6"
        transform={`rotate(90 ${C} ${C})`}
      />

      {/* 12 sign ticks + 36 decan ticks */}
      <motion.g style={{ opacity: ticksOp }}>
        {Array.from({ length: 36 }, (_, i) => {
          const a = i * 10;
          const major = i % 3 === 0;
          const p1 = polar(a, R - (major ? 16 : 8), C);
          const p2 = polar(a, R, C);
          return (
            <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={major ? "#C8A55B" : "#3A3A55"} strokeWidth={major ? 1.2 : 0.6}
              opacity={major ? 0.85 : 0.5} />
          );
        })}
        {/* Degree readouts at cardinal points */}
        {[0, 90, 180, 270].map(a => {
          const p = polar(a, R + 26, C);
          return (
            <text key={a} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fill="#C8A55B" fontSize="11" fontFamily="'Fragment Mono', monospace" opacity="0.7">
              {a}°
            </text>
          );
        })}
      </motion.g>

      {/* Aspect lines — draw between planets */}
      {STORY_ASPECTS.map(([a, b, color], i) => {
        const pa = polar(STORY_PLANETS[a].angle, R * STORY_PLANETS[a].rf, C);
        const pb = polar(STORY_PLANETS[b].angle, R * STORY_PLANETS[b].rf, C);
        const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
        return (
          <AspectLine key={i} pa={pa} pb={pb} len={len} color={color} index={i} draw={aspectDraw} />
        );
      })}

      {/* Planets — ignite sequentially */}
      {STORY_PLANETS.map((p, i) => (
        <StoryPlanet key={i} planet={p} index={i} C={C} R={R} progress={progress} />
      ))}

      {/* Core — final pulse */}
      <motion.circle cx={C} cy={C} r={R * 0.34} fill="url(#storyCore)" style={{ opacity: coreGlow }} />
      <motion.circle cx={C} cy={C} r={5} fill="#EAE6F4" filter="url(#storyGlowSoft)" style={{ opacity: coreGlow }} />
    </motion.svg>
  );
}

function AspectLine({ pa, pb, len, color, index, draw }: {
  pa: { x: number; y: number }; pb: { x: number; y: number };
  len: number; color: string; index: number; draw: MotionValue<number>;
}) {
  // Stagger each line inside the draw window
  const lineP = useTransform(draw, v => Math.max(0, Math.min(1, v * 6 - index * 0.8)));
  const offset = useTransform(lineP, v => len * (1 - v));
  return (
    <motion.line
      x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
      stroke={color} strokeWidth="0.9"
      strokeDasharray={len}
      style={{ strokeDashoffset: offset }}
      opacity="0.55"
    />
  );
}

function StoryPlanet({ planet, index, C, R, progress }: {
  planet: typeof STORY_PLANETS[number]; index: number;
  C: number; R: number; progress: MotionValue<number>;
}) {
  const start = 0.22 + index * 0.025;
  const op = useTransform(progress, [start, start + 0.05], [0, 1]);
  const scale = useTransform(progress, [start, start + 0.05], [0.3, 1]);
  const pos = polar(planet.angle, R * planet.rf, C);
  return (
    <motion.g style={{ opacity: op, scale, originX: `${pos.x}px`, originY: `${pos.y}px` }}>
      <circle cx={pos.x} cy={pos.y} r={13} fill="#08080F" stroke={planet.color} strokeWidth="1" opacity="0.92" filter="url(#storyGlow)" />
      <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
        fill={planet.color} fontSize="13">{planet.glyph}</text>
    </motion.g>
  );
}

// ─── Chapter text ──────────────────────────────────────────────────────────────

function Chapter({ chapter, index, progress }: {
  chapter: typeof CHAPTERS[number]; index: number; progress: MotionValue<number>;
}) {
  // Each chapter owns a third of the scroll
  const third = 1 / CHAPTERS.length;
  const lo = index * third, hi = (index + 1) * third;
  const op = useTransform(progress,
    [lo, lo + third * 0.25, hi - third * 0.25, index === CHAPTERS.length - 1 ? 1.1 : hi],
    [0, 1, 1, 0]);
  const y = useTransform(progress, [lo, lo + third * 0.3], [28, 0]);

  return (
    <motion.div
      style={{ opacity: op, y, position: "absolute", inset: 0 }}
      className="flex flex-col justify-center"
    >
      <p className="text-xs tracking-[0.3em] mb-5" style={{ color: "#C8A55B", fontFamily: "'Fragment Mono', monospace" }}>
        {chapter.kicker}
      </p>
      <h3 className="text-4xl lg:text-5xl text-white mb-6 leading-[1.1]" style={{ fontWeight: 500, letterSpacing: "-0.03em" }}>
        {chapter.title}
      </h3>
      <p className="text-sm lg:text-base leading-relaxed max-w-md" style={{ color: "rgba(234,230,244,0.55)" }}>
        {chapter.body}
      </p>
    </motion.div>
  );
}

// ─── Scroll HUD readout ────────────────────────────────────────────────────────

function ScrollHUD({ progress }: { progress: MotionValue<number> }) {
  const pct = useTransform(progress, v => `${String(Math.round(v * 100)).padStart(3, "0")}`);
  const barW = useTransform(progress, v => `${v * 100}%`);
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 pointer-events-none">
      <div className="flex items-center justify-between mb-2" style={{ fontFamily: "'Fragment Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "rgba(200,165,91,0.6)" }}>
        <span>CALIBRATING</span>
        <motion.span>{pct}</motion.span>
      </div>
      <div className="h-px w-full" style={{ background: "rgba(200,165,91,0.15)" }}>
        <motion.div className="h-px" style={{ width: barW, background: "#C8A55B", boxShadow: "0 0 8px #C8A55B" }} />
      </div>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.0005 });

  return (
    <section ref={ref} className="relative" style={{ height: "400vh", background: "#08080F" }}>
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">

        {/* Faint scanline texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #C8A55B 3px)" }} />

        {/* Radial vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 70% 50%, rgba(123,111,212,0.07), transparent 70%)" }} />

        <div className="max-w-6xl mx-auto w-full px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Text chapters */}
          <div className="relative h-[340px] order-2 lg:order-1">
            {CHAPTERS.map((ch, i) => (
              <Chapter key={i} chapter={ch} index={i} progress={smooth} />
            ))}
          </div>

          {/* The instrument */}
          <div className="order-1 lg:order-2 flex items-center justify-center">
            <div className="w-full max-w-[480px] aspect-square">
              <Instrument progress={smooth} />
            </div>
          </div>
        </div>

        <ScrollHUD progress={smooth} />
      </div>
    </section>
  );
}
