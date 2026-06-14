"use client";

/**
 * VideoPlanet — the home hero: a pre-rendered PHOTOREAL spinning planet,
 * kept ZOOMED IN and bleeding off every edge so the video's frame is never
 * visible (the old bug: scaling below cover exposed the rectangular frame and
 * a cropped half-planet). On scroll it zooms further IN, never shrinks.
 * Seamless loop via crossfade between two staggered copies.
 */

import { useEffect, useRef } from "react";
import { motion, useTransform, useMotionValueEvent, MotionValue } from "framer-motion";

// Always >= ~1.35 so the video stays larger than the viewport → no frame edges.
const KEYS = {
  p:  [0,    0.25, 0.5,  0.75, 1],
  tx: [13,   10,   5,    8,    2],     // vw — gentle drift, bounded by (scale-1)/2
  ty: [0,    2,    0,    -2,   0],     // vh
  s:  [1.42, 1.52, 1.64, 1.74, 1.9],  // zoom IN across the scroll, never below cover
};

export default function VideoPlanet({ progress }: { progress: MotionValue<number> }) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const x = useTransform(progress, KEYS.p, KEYS.tx.map(v => `${v}vw`));
  const y = useTransform(progress, KEYS.p, KEYS.ty.map(v => `${v}vh`));
  const scale = useTransform(progress, KEYS.p, KEYS.s);

  // Seamless loop: crossfade end→start between two copies so the loop point
  // never hard-cuts (the single <video loop> jumped).
  useEffect(() => {
    const a = aRef.current, b = bRef.current;
    if (!a || !b) return;
    const FADE = 0.7;
    let active = a, idle = b;
    a.play().catch(() => {});
    b.pause();
    const onTime = () => {
      if (!active.duration) return;
      if (active.currentTime >= active.duration - FADE) {
        idle.currentTime = 0;
        idle.play().catch(() => {});
        idle.style.opacity = "1";
        active.style.opacity = "0";
        const swap = active; active = idle; idle = swap;
      }
    };
    a.addEventListener("timeupdate", onTime);
    b.addEventListener("timeupdate", onTime);
    return () => { a.removeEventListener("timeupdate", onTime); b.removeEventListener("timeupdate", onTime); };
  }, []);

  const vidStyle: React.CSSProperties = {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "cover", transition: "opacity 0.7s linear",
  };

  return (
    <motion.div style={{ position: "absolute", inset: 0, x, y, scale, mixBlendMode: "screen", pointerEvents: "none" }}>
      <video ref={aRef} src="/videos/saturn-spin.mp4" muted playsInline preload="auto" style={{ ...vidStyle, opacity: 1 }} />
      <video ref={bRef} src="/videos/saturn-spin.mp4" muted playsInline preload="auto" style={{ ...vidStyle, opacity: 0 }} />
    </motion.div>
  );
}
