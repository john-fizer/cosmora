"use client";

/**
 * VideoPlanet — the home hero: a pre-rendered PHOTOREAL spinning planet,
 * kept ZOOMED IN and bleeding off every edge so the video's frame is never
 * visible. On scroll it zooms further IN, never shrinks.
 *
 * The source Grok clip drifts (camera pan + a moving terminator) and its first
 * and last frames don't match, so a native loop popped. saturn-loop.mp4 is that
 * clip baked as a BOOMERANG (forward + reversed), so frame 0 === final frame:
 * the planet eases out and glides back, looping forever with no seam, no pop.
 */

import { motion, useTransform, MotionValue } from "framer-motion";

// Always >= ~1.4 so the video stays larger than the viewport → no frame edges.
const KEYS = {
  p:  [0,    0.25, 0.5,  0.75, 1],
  tx: [13,   10,   5,    8,    2],     // vw — gentle drift, bounded by (scale-1)/2
  ty: [0,    2,    0,    -2,   0],     // vh
  s:  [1.42, 1.52, 1.64, 1.74, 1.9],  // zoom IN across the scroll, never below cover
};

export default function VideoPlanet({ progress }: { progress: MotionValue<number> }) {
  const x = useTransform(progress, KEYS.p, KEYS.tx.map(v => `${v}vw`));
  const y = useTransform(progress, KEYS.p, KEYS.ty.map(v => `${v}vh`));
  const scale = useTransform(progress, KEYS.p, KEYS.s);

  return (
    <motion.div style={{ position: "absolute", inset: 0, x, y, scale, mixBlendMode: "screen", pointerEvents: "none" }}>
      <video
        src="/videos/saturn-loop.mp4"
        autoPlay muted loop playsInline preload="auto"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </motion.div>
  );
}
