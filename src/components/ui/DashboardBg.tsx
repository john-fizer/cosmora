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
    let t = 0;
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

    const orbs = [
      { bx: 0.12, by: 0.22, r: 0.30, color: [168, 85,  247], speed: 0.00016, phase: 0   },
      { bx: 0.80, by: 0.68, r: 0.26, color: [6,  182, 212], speed: 0.00013, phase: 2.1 },
      { bx: 0.50, by: 0.88, r: 0.22, color: [124, 58, 237], speed: 0.00022, phase: 4.3 },
      { bx: 0.88, by: 0.15, r: 0.20, color: [34, 211, 238], speed: 0.00018, phase: 1.5 },
    ];

    const draw = () => {
      t++;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#03040a";
      ctx.fillRect(0, 0, w, h);

      for (const o of orbs) {
        const drift = Math.sin(t * o.speed * 6283 + o.phase);
        const cx = (o.bx + Math.sin(t * o.speed * 3141 + o.phase) * 0.05) * w;
        const cy = (o.by + Math.cos(t * o.speed * 2718 + o.phase + 1) * 0.04) * h;
        const radius = o.r * Math.min(w, h) * (1 + drift * 0.012);

        const [r, g, b] = o.color;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,   `rgba(${r},${g},${b},0.07)`);
        grad.addColorStop(0.45, `rgba(${r},${g},${b},0.035)`);
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
        ctx.fillStyle = "#c4b5fd";
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
