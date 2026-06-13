"use client";

/**
 * CosmosToYou — the NASA-inspired scroll. One continuous camera telescopes
 * from the galaxy, through the real solar system, down to Earth and the moment.
 * Clean cinematic stations — no HUD chrome. This is the brand's signature dive.
 */

import { useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import { COLOR, FONT, SOLAR } from "@/lib/design/tokens";

const CosmicJourney = dynamic(() => import("./CosmicJourney"), { ssr: false });

const STATIONS = [
  { range: [0.0, 0.16] as const, kicker: "01 · THE SYSTEM", title: <>Every world, computed to the <em style={{ fontFamily: FONT.display, fontStyle: "italic", color: SOLAR(0.95) }}>arcsecond</em></>, body: "Real planets at their true positions — the geometry is not decoration, it is calculation." },
  { range: [0.30, 0.48] as const, kicker: "02 · THE APPROACH", title: <>Then the sky comes <em style={{ fontFamily: FONT.display, fontStyle: "italic", color: SOLAR(0.95) }}>home</em></>, body: "Transits, profections, releasing — two thousand years of timing technique aimed at one address: yours." },
  { range: [0.60, 0.78] as const, kicker: "03 · THE MOMENT", title: <>One moment. One <em style={{ fontFamily: FONT.display, fontStyle: "italic", color: SOLAR(0.95) }}>sky</em>.</>, body: "The instrument reads the heavens at the exact second you arrived — never repeated, only yours." },
  { range: [0.86, 1.0] as const, kicker: "04 · YOU", title: <>The universe <em style={{ fontFamily: FONT.display, fontStyle: "italic", color: SOLAR(0.95) }}>ends at you</em></>, body: "Enter, and the descent becomes your chart — alive, interactive, real." },
];

function Station({ s, progress }: { s: typeof STATIONS[number]; progress: MotionValue<number> }) {
  const [lo, hi] = s.range;
  const f = (hi - lo) * 0.28;
  const opacity = useTransform(progress, [lo, lo + f, hi - f * 0.7, hi], [0, 1, 1, 0]);
  const y = useTransform(progress, [lo, lo + f], [30, 0]);
  return (
    <motion.div style={{ opacity, y, position: "absolute", inset: 0, pointerEvents: "none" }} className="flex items-center">
      <div className="px-7 lg:px-16 max-w-xl">
        <p style={{ fontFamily: FONT.data, fontSize: 10, letterSpacing: "0.32em", color: SOLAR(0.7), marginBottom: 16 }}>{s.kicker}</p>
        <h2 style={{ fontFamily: FONT.body, fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 1.05, fontSize: "clamp(2.2rem, 5vw, 4rem)", color: COLOR.text1, textShadow: "0 2px 40px rgba(8,8,15,0.9)" }}>{s.title}</h2>
        <p style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 1.7, color: COLOR.text2, marginTop: 20, maxWidth: 420, textShadow: "0 1px 20px rgba(8,8,15,0.95)" }}>{s.body}</p>
      </div>
    </motion.div>
  );
}

export default function CosmosToYou() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 55, damping: 22, restDelta: 0.0005 });
  const barW = useTransform(p, v => `${Math.min(100, Math.max(0, v * 100))}%`);

  return (
    <div ref={ref} style={{ height: "560vh", position: "relative", background: COLOR.void, zIndex: 20 }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          <CosmicJourney progress={p} />
        </div>
        <div className="absolute inset-0" style={{ zIndex: 2 }}>
          {STATIONS.map((s, i) => <Station key={i} s={s} progress={p} />)}
        </div>
        {/* Minimal progress filament — not HUD chrome */}
        <div className="absolute bottom-7 left-7 right-7" style={{ zIndex: 3 }}>
          <div className="h-px w-full" style={{ background: SOLAR(0.12) }}>
            <motion.div className="h-px" style={{ width: barW, background: COLOR.solar, boxShadow: "0 0 8px rgba(200,165,91,0.6)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
