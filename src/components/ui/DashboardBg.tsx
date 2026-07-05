"use client";

import { useEffect, useRef } from "react";

export function DashboardBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Static starfield — drawn once, no animation loop, nothing flashes
    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "#03040a";
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#BFB6E8";
      for (let i = 0; i < 200; i++) {
        ctx.globalAlpha = (Math.random() * 0.5 + 0.1) * 0.6;
        ctx.beginPath();
        ctx.arc(
          Math.random() * w,
          Math.random() * h,
          Math.random() * 1.0 + 0.15,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
