"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * HUDFrame — global instrument chrome rendered above every dashboard page.
 * Corner brackets, live clock readout, sector label, scanline texture.
 * Pure overlay: pointer-events none, zero interaction cost.
 */

const MONO: React.CSSProperties = {
  fontFamily: "'Fragment Mono', monospace",
  letterSpacing: "0.18em",
  fontSize: 9,
};

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const flip: Record<string, string> = {
    tl: "scale(1,1)", tr: "scale(-1,1)", bl: "scale(1,-1)", br: "scale(-1,-1)",
  };
  const place: Record<string, React.CSSProperties> = {
    tl: { top: 10, left: 10 }, tr: { top: 10, right: 10 },
    bl: { bottom: 10, left: 10 }, br: { bottom: 10, right: 10 },
  };
  return (
    <svg width="26" height="26" viewBox="0 0 26 26"
      style={{ position: "absolute", ...place[pos], transform: flip[pos], opacity: 0.4 }}>
      <path d="M 1 11 L 1 1 L 11 1" fill="none" stroke="#C8A55B" strokeWidth="1.5" />
      <circle cx="1" cy="1" r="1.2" fill="#C8A55B" />
    </svg>
  );
}

export function HUDFrame() {
  const pathname = usePathname();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const sector = pathname
    .replace("/dashboard", "")
    .replace(/^\//, "")
    .split("/")[0]
    .toUpperCase() || "COSMOS";

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 60 }}>
      {/* Corner brackets */}
      <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />

      {/* Top status readout */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-5"
        style={{ ...MONO, color: "rgba(200,165,91,0.55)" }}>
        <span>COSMORA</span>
        <span style={{ color: "rgba(200,165,91,0.3)" }}>·</span>
        <span suppressHydrationWarning>{clock || "--:--:--"}</span>
        <span style={{ color: "rgba(200,165,91,0.3)" }}>·</span>
        <span style={{ color: "rgba(123,111,212,0.7)" }}>{sector}</span>
      </div>

      {/* Bottom-right version tag */}
      <div className="absolute bottom-3 right-12"
        style={{ ...MONO, color: "rgba(200,165,91,0.28)" }}>
        OBSERVATORY LINK · STABLE
      </div>

      {/* Scanline texture — barely there */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, #EAE6F4 4px)" }} />

      {/* Edge vignette */}
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 110% at 50% 50%, transparent 78%, rgba(2,2,8,0.5) 100%)" }} />
    </div>
  );
}
