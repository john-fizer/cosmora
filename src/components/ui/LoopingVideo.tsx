"use client";

import { useRef, useEffect } from "react";

interface LoopingVideoProps {
  src: string;
  opacity?: number;
  position?: "fixed" | "absolute";
}

const CROSSFADE_START = 5.0;   // begin crossfade at 5s (3s buffer before 8s end)
const CROSSFADE_DURATION = 2.5; // 2.5s dissolve

export function LoopingVideo({ src, opacity = 0.7, position = "fixed" }: LoopingVideoProps) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const primaryRef = useRef<"a" | "b">("a");
  const fadingRef = useRef(false);

  useEffect(() => {
    const a = aRef.current!;
    const b = bRef.current!;

    function crossfade(outgoing: HTMLVideoElement, incoming: HTMLVideoElement) {
      if (fadingRef.current) return;
      fadingRef.current = true;

      // Layer incoming above outgoing
      outgoing.style.zIndex = "1";
      incoming.style.zIndex = "2";

      // Start incoming from the top
      incoming.currentTime = 0;
      incoming.play().catch(() => {});

      // Dissolve
      incoming.style.transition = `opacity ${CROSSFADE_DURATION}s linear`;
      incoming.style.opacity = String(opacity);
      outgoing.style.transition = `opacity ${CROSSFADE_DURATION}s linear`;
      outgoing.style.opacity = "0";

      setTimeout(() => {
        outgoing.pause();
        outgoing.currentTime = 0;
        outgoing.style.transition = "none";
        primaryRef.current = primaryRef.current === "a" ? "b" : "a";
        fadingRef.current = false;
      }, (CROSSFADE_DURATION + 0.5) * 1000);
    }

    function forceSwitch(outgoing: HTMLVideoElement, incoming: HTMLVideoElement) {
      // Safety net: video ended before crossfade could start — instant cut-free switch
      outgoing.style.transition = "none";
      outgoing.style.opacity = "0";
      incoming.style.transition = "none";
      incoming.style.opacity = String(opacity);
      incoming.style.zIndex = "2";
      outgoing.style.zIndex = "1";
      if (incoming.paused) {
        incoming.currentTime = 0;
        incoming.play().catch(() => {});
      }
      primaryRef.current = primaryRef.current === "a" ? "b" : "a";
      fadingRef.current = false;
    }

    // ── Timeupdate handlers (normal path) ──────────────────────────────
    function handleATime() {
      if (primaryRef.current !== "a") return;
      if (a.currentTime >= CROSSFADE_START) crossfade(a, b);
    }

    function handleBTime() {
      if (primaryRef.current !== "b") return;
      if (b.currentTime >= CROSSFADE_START) crossfade(b, a);
    }

    // ── Ended handlers (safety net — fires if timeupdate was too slow) ──
    function handleAEnded() {
      if (primaryRef.current === "a") forceSwitch(a, b);
    }

    function handleBEnded() {
      if (primaryRef.current === "b") forceSwitch(b, a);
    }

    a.addEventListener("timeupdate", handleATime);
    b.addEventListener("timeupdate", handleBTime);
    a.addEventListener("ended", handleAEnded);
    b.addEventListener("ended", handleBEnded);

    return () => {
      a.removeEventListener("timeupdate", handleATime);
      b.removeEventListener("timeupdate", handleBTime);
      a.removeEventListener("ended", handleAEnded);
      b.removeEventListener("ended", handleBEnded);
    };
  }, [src, opacity]);

  const base: React.CSSProperties = {
    position,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  return (
    <>
      <video ref={aRef} autoPlay muted playsInline src={src} style={{ ...base, zIndex: 2, opacity }} />
      <video ref={bRef} muted playsInline src={src} style={{ ...base, zIndex: 1, opacity: 0 }} />
    </>
  );
}
