"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; a: number; da: number };

export function DashboardBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let stars: Star[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: 200 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.0 + 0.15,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.007,
      }));
    };
    init();
    window.addEventListener("resize", init);

    // Brand palette only — Solar gold + Oracle violet
    const orbs = [
      { bx: 0.12, by: 0.22, r: 0.30, color: [123, 111, 212] },
      { bx: 0.80, by: 0.68, r: 0.26, color: [200, 165, 91]  },
      { bx: 0.50, by: 0.88, r: 0.22, color: [123, 111, 212] },
      { bx: 0.88, by: 0.15, r: 0.20, color: [200, 165, 91]  },
    ];

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#03040a";
      ctx.fillRect(0, 0, w, h);

      // ── Planet sphere (lower-right, like landing page video) ──────────────────
      const px = w * 0.86;
      const py = h * 0.76;
      const pr = Math.min(w, h) * 0.44;

      // Atmospheric halo beyond the sphere — solar gold
      const halo = ctx.createRadialGradient(px, py, pr * 0.85, px, py, pr * 1.6);
      halo.addColorStop(0,   "rgba(200, 165, 91, 0.07)");
      halo.addColorStop(0.4, "rgba(160, 130, 70, 0.04)");
      halo.addColorStop(1,   "rgba(90,  70,  40, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(px, py, pr * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Clip to sphere boundary
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.clip();

      // Planet surface gradient (highlight top-left, dark lower-right)
      const surf = ctx.createRadialGradient(
        px - pr * 0.28, py - pr * 0.22, 0,
        px + pr * 0.1,  py + pr * 0.1,  pr * 1.05
      );
      surf.addColorStop(0,    "rgba(210, 180, 110, 0.20)");
      surf.addColorStop(0.3,  "rgba(160, 135, 80, 0.13)");
      surf.addColorStop(0.65, "rgba(90,  75,  90, 0.08)");
      surf.addColorStop(1,    "rgba(14,  14,  26, 0.04)");
      ctx.fillStyle = surf;
      ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);

      // Rim light — solar gold edge on upper-left
      const rim = ctx.createRadialGradient(px, py, pr * 0.82, px, py, pr);
      rim.addColorStop(0,   "rgba(200, 165, 91, 0)");
      rim.addColorStop(0.6, "rgba(200, 165, 91, 0.02)");
      rim.addColorStop(1,   "rgba(200, 165, 91, 0.08)");
      ctx.fillStyle = rim;
      ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);

      ctx.restore();

      for (const o of orbs) {
        const cx = o.bx * w;
        const cy = o.by * h;
        const radius = o.r * Math.min(w, h);

        const [r, g, b] = o.color;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,   `rgba(${r},${g},${b},0.09)`);
        grad.addColorStop(0.45, `rgba(${r},${g},${b},0.045)`);
        grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const s of stars) {
        s.a += s.da;
        if (s.a < 0.05 || s.a > 0.95) s.da *= -1;
        ctx.globalAlpha = s.a * 0.6;
        ctx.fillStyle = "#BFB6E8";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", init);
    };
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
