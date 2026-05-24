// src/components/oracle/AgentHaloRing.tsx
"use client";

import { useEffect, useRef } from "react";

export interface AgentHaloRingProps {
  width?: number;
  height?: number;
  state: "idle" | "listening" | "thinking" | "speaking" | string;
  color: string;
  agentVolume?: number;
  userVolume?: number;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function rotX(p: { x: number; y: number; z: number }, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}
function rotY(p: { x: number; y: number; z: number }, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}
function rotZ(p: { x: number; y: number; z: number }, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

const STATE_CONFIGS: Record<string, { axS: number; ayS: number; azS: number; distMult: number }> = {
  idle:      { axS: 0.10, ayS: 0.17, azS: 0.06, distMult: 0.25 },
  listening: { axS: 0.22, ayS: 0.35, azS: 0.13, distMult: 0.90 },
  thinking:  { axS: 0.50, ayS: 0.67, azS: 0.28, distMult: 0.50 },
  speaking:  { axS: 0.28, ayS: 0.44, azS: 0.16, distMult: 1.70 },
};

// highlight / center / shadow stripes on a torus tube cross-section
const STRIPES = [
  { tubeA: -0.42, lOffset: +20, sOffset: +5,  alphaBase: 0.92, lw: 1.1  },
  { tubeA:  0.05, lOffset:   0, sOffset:  0,   alphaBase: 0.58, lw: 0.90 },
  { tubeA:  0.50, lOffset: -18, sOffset: -10,  alphaBase: 0.28, lw: 0.85 },
];

export function AgentHaloRing({
  width = 300,
  height = 200,
  state,
  color,
  agentVolume = 0,
  userVolume = 0,
}: AgentHaloRingProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const stateRef   = useRef(state);
  const colorRef   = useRef(color);
  const agentRef   = useRef(agentVolume);
  const userRef    = useRef(userVolume);

  // keep refs in sync without restarting the loop
  stateRef.current  = state;
  colorRef.current  = color;
  agentRef.current  = agentVolume;
  userRef.current   = userVolume;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let ax = Math.random() * 6, ay = Math.random() * 6, az = Math.random() * 6;

    function frame() {
      const W = canvas!.width, H = canvas!.height;
      const cfg = STATE_CONFIGS[stateRef.current] ?? STATE_CONFIGS.idle;

      ax += 0.016 * cfg.axS;
      ay += 0.016 * cfg.ayS;
      az += 0.016 * cfg.azS;

      ctx.clearRect(0, 0, W, H);

      const [baseH, baseS, baseL] = hexToHsl(colorRef.current || "#7B6FD4");
      const cx = W * 0.5, cy = H * 0.5;
      const R   = Math.min(W, H) * 0.36;
      const tubeR = 9 * (Math.min(W, H) / 80);
      const fov = Math.max(W, H) * 2.2;
      const SEG = 140;
      const distAmp = tubeR * cfg.distMult * agentRef.current;
      const pulse   = 1 + userRef.current * 0.18;

      STRIPES.forEach(({ tubeA, lOffset, sOffset, alphaBase, lw }, si) => {
        const offR = tubeR * Math.cos(tubeA);
        const offZ = tubeR * Math.sin(tubeA);

        ctx.beginPath();
        for (let i = 0; i <= SEG; i++) {
          const phi  = (i / SEG) * Math.PI * 2;
          const dist = distAmp * (
            Math.sin(phi * 2 + ax * 3.1) * 0.38 +
            Math.sin(phi * 3 - ay * 2.3) * 0.28 +
            Math.sin(phi * 5 + ax * 4.7) * 0.18 +
            Math.cos(phi * 4 - az * 3.5) * 0.10 +
            Math.sin(phi * 7 + ax * 6.1) * 0.06
          );
          const rEff = (R + offR + dist) * pulse;
          let p = { x: rEff * Math.cos(phi), y: rEff * Math.sin(phi), z: offZ };
          p = rotX(p, ax);
          p = rotY(p, ay);
          p = rotZ(p, az);
          const sc = fov / (fov + p.z);
          const sx = cx + p.x * sc, sy = cy + p.y * sc;
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.closePath();

        // hue drift ±8° over time for holographic shimmer
        const hue = baseH + Math.sin(ax * 0.5 + si * 0.9) * 8;
        const sat = Math.min(100, Math.max(0, baseS + sOffset + Math.sin(ay * 0.4) * 5));
        const lgt = Math.min(95,  Math.max(5,  baseL + lOffset));

        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lgt}%, ${alphaBase})`;
        ctx.lineWidth   = lw * (Math.min(W, H) / 80);
        ctx.stroke();

        // bloom glow pass on highlight stripe only
        if (si === 0) {
          ctx.strokeStyle = `hsla(${hue}, ${Math.min(100, sat + 15)}%, ${Math.min(95, lgt + 10)}%, 0.12)`;
          ctx.lineWidth   = lw * (Math.min(W, H) / 80) * 4;
          ctx.stroke();
        }
      });

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // stable loop — all live values read via refs

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height, display: "block" }}
    />
  );
}
