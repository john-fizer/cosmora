"use client";

/**
 * VideoPlanet — the home hero: a pre-rendered PHOTOREAL spinning planet
 * (Higgsfield), repositioned and resized across the page scroll. Screen blend
 * mode drops the black space so only the planet + rings sit on the void.
 * Pre-rendered = genuinely photoreal, which real-time WebGL can't match.
 */

import { motion, useTransform, MotionValue } from "framer-motion";

// progress → [translateX vw, translateY vh, scale]
const KEYS = {
  p:  [0.00, 0.24, 0.48, 0.72, 1.00],
  tx: [16,  -22,   0,    16,   0],
  ty: [0,    4,    0,   -4,    0],
  s:  [1.05, 0.72, 0.95, 0.66, 1.18],
};

export default function VideoPlanet({ progress }: { progress: MotionValue<number> }) {
  const x = useTransform(progress, KEYS.p, KEYS.tx.map(v => `${v}vw`));
  const y = useTransform(progress, KEYS.p, KEYS.ty.map(v => `${v}vh`));
  const scale = useTransform(progress, KEYS.p, KEYS.s);

  return (
    <motion.video
      src="/videos/saturn-spin.mp4"
      autoPlay muted loop playsInline preload="auto"
      style={{
        position: "absolute", top: 0, left: 0,
        width: "100%", height: "100%",
        objectFit: "cover",
        x, y, scale,
        mixBlendMode: "screen",   // black space → void; planet + rings show
        pointerEvents: "none",
      }}
    />
  );
}
