# Voice Oracle — LiveKit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace one-way ElevenLabs TTS in Cosmora's VoiceOracle with a bidirectional LiveKit voice session, visualized by a holographic halo ring component in both Cosmora and native-os.

**Architecture:** A canvas-based `AgentHaloRing` component renders a 3D torus ring with 3 brightness-variant stripes (highlight/center/shadow) and multi-axis rotation. `useOracleSession` (inside VoiceOracle) manages the LiveKit `Room` connection, streams agent state via data messages, and tracks audio volumes via `createAudioAnalyser`. A `/api/livekit/token` route creates rooms with planet metadata for the Python agent to read.

**Tech Stack:** `livekit-client` ^2.19.0, `livekit-server-sdk` ^2.15.3 (already installed in both projects), Next.js 16 App Router, Python `livekit-agents` 1.5.12.

---

## File Map

### Cosmora (`C:\Users\John\Desktop\cosmora`)
| Action | Path |
|--------|------|
| **Create** | `src/components/oracle/AgentHaloRing.tsx` |
| **Create** | `src/app/api/livekit/token/route.ts` |
| **Create** | `src/lib/oracle/useOracleSession.ts` |
| **Modify** | `src/components/oracle/VoiceOracle.tsx` |
| **Modify** | `src/app/dashboard/oracle/page.tsx` |
| **Modify** | `agent/agent.py` |
| **Delete** | `src/components/oracle/AgentAudioVisualizerAura.tsx` |

### native-os (`C:\Users\John\native-os`)
| Action | Path |
|--------|------|
| **Create** | `src/components/AgentHaloRing.tsx` |
| **Create** | `src/app/api/livekit/token/route.ts` |
| **Modify** | `agent/agent.py` |
| **Delete** | `src/components/AgentAudioVisualizerAura.tsx` |

---

## Task 1: `AgentHaloRing` component — Cosmora

**Files:**
- Create: `src/components/oracle/AgentHaloRing.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:/Users/John/Desktop/cosmora" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `AgentHaloRing.tsx`. Unrelated pre-existing errors are OK.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/John/Desktop/cosmora" add src/components/oracle/AgentHaloRing.tsx
git -C "C:/Users/John/Desktop/cosmora" commit -m "feat: add AgentHaloRing 3D torus component (Cosmora)"
```

---

## Task 2: `AgentHaloRing` component — native-os

**Files:**
- Create: `src/components/AgentHaloRing.tsx`

- [ ] **Step 1: Create the component**

Copy the same component to native-os. The only differences: default export path, and a fixed default color.

```tsx
// src/components/AgentHaloRing.tsx  (native-os)
// Identical implementation — copy full file content from Task 1, then adjust:
// 1. Remove "use client" directive if native-os uses server components differently
//    (keep "use client" — it's a canvas animation component)
// 2. Default color: #1FD5F9 is passed as a prop at usage site, not hardcoded here.
//    The component is identical to the Cosmora version above.
```

Paste the **entire** component from Task 1 verbatim into `C:\Users\John\native-os\src\components\AgentHaloRing.tsx`.

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:/Users/John/native-os" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/John/native-os" add src/components/AgentHaloRing.tsx
git -C "C:/Users/John/native-os" commit -m "feat: add AgentHaloRing 3D torus component (native-os)"
```

---

## Task 3: `/api/livekit/token` route — Cosmora

**Files:**
- Create: `src/app/api/livekit/token/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/livekit/token/route.ts
import { NextRequest } from "next/server";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url       = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    return new Response(
      JSON.stringify({ error: "LiveKit credentials not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json() as { planet?: string; chartContext?: string };
  const planet       = body.planet ?? "Moon";
  const chartContext = body.chartContext ?? null;

  const roomName = `oracle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const identity = `user-${Date.now()}`;

  // Create room with metadata so the Python agent can read planet + context
  const svc = new RoomServiceClient(url, apiKey, apiSecret);
  await svc.createRoom({
    name: roomName,
    metadata: JSON.stringify({ planet, chartContext }),
    emptyTimeout: 300,  // auto-close after 5 min idle
    maxParticipants: 10,
  });

  const at = new AccessToken(apiKey, apiSecret, { identity });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  const token = await at.toJwt();

  return new Response(JSON.stringify({ token, url, roomName }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Add env vars to `.env.local` (if not present)**

Check `.env.local` for `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. The `.env.example` already has these keys — just ensure the live values are in `.env.local`.

- [ ] **Step 3: Test route manually**

Start the dev server (`npm run dev`) then:

```bash
curl -s -X POST http://localhost:3000/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{"planet":"Moon"}' | head -c 200
```

Expected: JSON with `token` (long JWT string), `url`, and `roomName`.

- [ ] **Step 4: Commit**

```bash
git -C "C:/Users/John/Desktop/cosmora" add src/app/api/livekit/token/route.ts
git -C "C:/Users/John/Desktop/cosmora" commit -m "feat: add /api/livekit/token route (Cosmora)"
```

---

## Task 4: `/api/livekit/token` route — native-os

**Files:**
- Create: `src/app/api/livekit/token/route.ts`

- [ ] **Step 1: Create the route**

Same implementation as Cosmora. The only difference is that native-os doesn't have a `planet` concept, so the metadata can be a generic agent label.

```typescript
// src/app/api/livekit/token/route.ts  (native-os)
import { NextRequest } from "next/server";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url       = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    return new Response(
      JSON.stringify({ error: "LiveKit credentials not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json() as { roomLabel?: string };
  const roomLabel = body.roomLabel ?? "aira";

  const roomName = `${roomLabel}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const identity = `user-${Date.now()}`;

  const svc = new RoomServiceClient(url, apiKey, apiSecret);
  await svc.createRoom({
    name: roomName,
    metadata: JSON.stringify({ roomLabel }),
    emptyTimeout: 300,
    maxParticipants: 10,
  });

  const at = new AccessToken(apiKey, apiSecret, { identity });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  const token = await at.toJwt();

  return new Response(JSON.stringify({ token, url, roomName }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Test route**

```bash
curl -s -X POST http://localhost:3001/api/livekit/token \
  -H "Content-Type: application/json" \
  -d '{"roomLabel":"aira"}' | head -c 200
```

Expected: JSON with `token`, `url`, `roomName`.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/John/native-os" add src/app/api/livekit/token/route.ts
git -C "C:/Users/John/native-os" commit -m "feat: add /api/livekit/token route (native-os)"
```

---

## Task 5: `useOracleSession` hook — Cosmora

**Files:**
- Create: `src/lib/oracle/useOracleSession.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/lib/oracle/useOracleSession.ts
"use client";

import { useCallback, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteAudioTrack,
  Track,
  createAudioAnalyser,
} from "livekit-client";

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

export interface OracleSession {
  connect: (planet: string, chartContext?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  agentState: AgentState;
  agentVolume: number;
  userVolume: number;
}

export function useOracleSession(): OracleSession {
  const [isConnected, setIsConnected] = useState(false);
  const [agentState,  setAgentState]  = useState<AgentState>("idle");
  const [agentVolume, setAgentVolume] = useState(0);
  const [userVolume,  setUserVolume]  = useState(0);

  const roomRef          = useRef<Room | null>(null);
  const agentCleanupRef  = useRef<(() => void) | null>(null);
  const userCleanupRef   = useRef<(() => void) | null>(null);
  const agentIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAnalysers = useCallback(() => {
    if (agentIntervalRef.current) { clearInterval(agentIntervalRef.current); agentIntervalRef.current = null; }
    if (userIntervalRef.current)  { clearInterval(userIntervalRef.current);  userIntervalRef.current  = null; }
    agentCleanupRef.current?.();  agentCleanupRef.current = null;
    userCleanupRef.current?.();   userCleanupRef.current  = null;
  }, []);

  const connect = useCallback(async (planet: string, chartContext?: string) => {
    // clean up any existing session first
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    const res = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planet, chartContext: chartContext ?? null }),
    });
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
    const { token, url } = (await res.json()) as { token: string; url: string; roomName: string };

    const room = new Room();
    roomRef.current = room;

    // agent state updates arrive as data messages from the Python agent
    room.on(RoomEvent.DataReceived, (data: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(data)) as { state?: AgentState };
        if (msg.state) setAgentState(msg.state);
      } catch {
        // non-JSON data messages — ignore
      }
    });

    // start agent audio volume tracking when agent's audio track arrives
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (!(track instanceof RemoteAudioTrack)) return;
      const { calculateVolume, cleanup } = createAudioAnalyser(track, { fftSize: 256 });
      agentCleanupRef.current = cleanup;
      agentIntervalRef.current = setInterval(() => setAgentVolume(calculateVolume()), 50);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (!(track instanceof RemoteAudioTrack)) return;
      if (agentIntervalRef.current) { clearInterval(agentIntervalRef.current); agentIntervalRef.current = null; }
      agentCleanupRef.current?.(); agentCleanupRef.current = null;
      setAgentVolume(0);
    });

    room.on(RoomEvent.Disconnected, () => {
      stopAnalysers();
      setIsConnected(false);
      setAgentState("idle");
      setAgentVolume(0);
      setUserVolume(0);
    });

    await room.connect(url, token);
    await room.localParticipant.setMicrophoneEnabled(true);

    // track local mic volume
    const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (micPub?.audioTrack) {
      const { calculateVolume, cleanup } = createAudioAnalyser(micPub.audioTrack, { fftSize: 256 });
      userCleanupRef.current = cleanup;
      userIntervalRef.current = setInterval(() => setUserVolume(calculateVolume()), 50);
    }

    setIsConnected(true);
    setAgentState("idle");
  }, [stopAnalysers]);

  const disconnect = useCallback(async () => {
    stopAnalysers();
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsConnected(false);
    setAgentState("idle");
    setAgentVolume(0);
    setUserVolume(0);
  }, [stopAnalysers]);

  return { connect, disconnect, isConnected, agentState, agentVolume, userVolume };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:/Users/John/Desktop/cosmora" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git -C "C:/Users/John/Desktop/cosmora" add src/lib/oracle/useOracleSession.ts
git -C "C:/Users/John/Desktop/cosmora" commit -m "feat: add useOracleSession LiveKit hook"
```

---

## Task 6: Modify `VoiceOracle.tsx` — wire LiveKit + AgentHaloRing

**Files:**
- Modify: `src/components/oracle/VoiceOracle.tsx`

The current file:
- Props: `{ planet, enabled, onPlanetChange, onToggle }`
- Toggle shows symbol + "VOICE"/"PLANET" text

We add: `useOracleSession` internally, `AgentHaloRing` in the pill, `onLiveVoice` callback.

- [ ] **Step 1: Replace the full component**

```tsx
// src/components/oracle/VoiceOracle.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLANET_VOICES, VOICE_PLANET_ORDER, type VoicePlanet } from "@/lib/oracle/voice";
import { AgentHaloRing } from "@/components/oracle/AgentHaloRing";
import { useOracleSession } from "@/lib/oracle/useOracleSession";

interface VoiceOracleProps {
  planet: VoicePlanet;
  enabled: boolean;
  onPlanetChange: (p: VoicePlanet) => void;
  onToggle: () => void;
  onLiveVoice?: (active: boolean) => void;
}

export function VoiceOracle({ planet, enabled, onPlanetChange, onToggle, onLiveVoice }: VoiceOracleProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const profile = PLANET_VOICES[planet];

  const { connect, disconnect, isConnected, agentState, agentVolume, userVolume } = useOracleSession();

  // connect/disconnect as the voice toggle flips
  useEffect(() => {
    if (enabled) {
      connect(planet).catch(console.error);
    } else {
      disconnect().catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // notify parent when live status changes
  useEffect(() => {
    onLiveVoice?.(isConnected);
  }, [isConnected, onLiveVoice]);

  // reconnect when planet changes while active
  useEffect(() => {
    if (enabled && isConnected) {
      disconnect()
        .then(() => connect(planet))
        .catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet]);

  const handleToggle = () => {
    if (!enabled) setPanelOpen(true);
    else setPanelOpen(false);
    onToggle();
  };

  return (
    <div className="relative">
      {/* ── Toggle button ── */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-bold tracking-wider cursor-pointer"
        style={{
          background: enabled ? `${profile.color}18` : "rgba(255,255,255,0.03)",
          border: `1px solid ${enabled ? (isConnected ? profile.color + "88" : profile.color + "55") : "rgba(255,255,255,0.08)"}`,
          color: enabled ? profile.color : "#475569",
          boxShadow: enabled && isConnected ? `0 0 14px ${profile.color}40` : enabled ? `0 0 10px ${profile.color}28` : "none",
          transition: "all 0.2s",
        }}
      >
        {/* AgentHaloRing in pill (48×32) when enabled, static symbol when off */}
        {enabled ? (
          <AgentHaloRing
            width={48}
            height={32}
            state={agentState}
            color={profile.color}
            agentVolume={agentVolume}
            userVolume={userVolume}
          />
        ) : (
          <span style={{ fontSize: 11, lineHeight: 1 }}>◎</span>
        )}

        <span className="hidden sm:inline">
          {enabled ? (isConnected ? "LIVE" : "CONNECTING…") : "VOICE"}
        </span>

        {enabled && (
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={e => { e.stopPropagation(); setPanelOpen(v => !v); }}
            style={{ color: profile.color + "99", marginLeft: 2, lineHeight: 1 }}
          >
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 8, height: 8 }}>
              <path d="M2 3.5l3 3 3-3" strokeLinecap="round" />
            </svg>
          </motion.button>
        )}
      </motion.button>

      {/* ── Planet selector panel ── */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPanelOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-full mt-2 z-50 rounded-2xl"
              style={{
                width: 296,
                background: "rgba(4,4,24,0.98)",
                border: "1px solid rgba(124,58,237,0.18)",
                backdropFilter: "blur(28px)",
                boxShadow: "0 0 50px rgba(0,0,0,0.6), 0 0 20px rgba(124,58,237,0.08)",
              }}
            >
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 16, color: profile.color }}>{profile.symbol}</span>
                  <div>
                    <p style={{ fontSize: 8, letterSpacing: 2, color: "#475569", fontWeight: 700 }}>
                      VOICE CHANNEL · {isConnected ? "LIVEKIT" : "ELEVENLABS"}
                    </p>
                    <p style={{ fontSize: 7, color: profile.color + "99" }}>
                      {profile.voiceName} · {profile.archetype}
                      {isConnected && " · LIVE"}
                    </p>
                  </div>
                </div>

                <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)" }} />

                {/* 3×3 planet grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {VOICE_PLANET_ORDER.map(p => {
                    const prof = PLANET_VOICES[p];
                    const active = p === planet;
                    return (
                      <motion.button
                        key={p}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { onPlanetChange(p); setPanelOpen(false); }}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl cursor-pointer relative overflow-hidden"
                        style={{
                          background: active ? `${prof.color}16` : "rgba(255,255,255,0.02)",
                          border: `1px solid ${active ? prof.color + "50" : "rgba(255,255,255,0.06)"}`,
                          boxShadow: active ? `0 0 14px ${prof.color}22` : "none",
                          transition: "all 0.18s",
                        }}
                      >
                        {active && (
                          <motion.div
                            animate={{ x: ["-120%", "120%"] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                            style={{
                              position: "absolute", inset: 0,
                              background: `linear-gradient(90deg, transparent, ${prof.color}18, transparent)`,
                              pointerEvents: "none",
                            }}
                          />
                        )}
                        <span style={{ fontSize: 18, color: prof.color, lineHeight: 1 }}>{prof.symbol}</span>
                        <span style={{ fontSize: 7, letterSpacing: 1, color: active ? prof.color : "#475569", fontWeight: 700, position: "relative" }}>
                          {p.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 6, color: active ? prof.color + "80" : "#334155", letterSpacing: 0.3, position: "relative" }}>
                          {prof.voiceName}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Selected voice description */}
                <div className="px-3 py-2 rounded-xl" style={{ background: `${profile.color}0a`, border: `1px solid ${profile.color}20` }}>
                  <p style={{ fontSize: 8, color: profile.color, fontWeight: 700, letterSpacing: 0.5 }}>
                    {profile.symbol} {profile.planet} — {profile.archetype}
                  </p>
                  <p style={{ fontSize: 7, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>
                    {profile.description}
                  </p>
                </div>

                <p style={{ fontSize: 7, color: "#1e293b", letterSpacing: 0.3, textAlign: "center" }}>
                  {isConnected
                    ? "Live voice · bidirectional · LiveKit"
                    : "Voice stability & style shift with your chart aspects · ElevenLabs TTS"}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:/Users/John/Desktop/cosmora" && npx tsc --noEmit 2>&1 | head -40
```

Expected: no new errors in `VoiceOracle.tsx` or `useOracleSession.ts`.

- [ ] **Step 3: Start dev server and verify visually**

```bash
cd "C:/Users/John/Desktop/cosmora" && npm run dev
```

Navigate to `/dashboard/oracle`. The top nav pill should show the ring animation when voice is enabled, and display "CONNECTING…" then "LIVE" once connected.

- [ ] **Step 4: Commit**

```bash
git -C "C:/Users/John/Desktop/cosmora" add src/components/oracle/VoiceOracle.tsx
git -C "C:/Users/John/Desktop/cosmora" commit -m "feat: wire AgentHaloRing + useOracleSession into VoiceOracle"
```

---

## Task 7: Minor wiring in oracle page — Cosmora

**Files:**
- Modify: `src/app/dashboard/oracle/page.tsx`

The page currently uses VoiceOracle with 4 props. We add `onLiveVoice` to optionally suppress ElevenLabs auto-play while LiveKit is active.

- [ ] **Step 1: Add `liveVoiceActive` state and hook it up**

In `src/app/dashboard/oracle/page.tsx`, find the `voiceEnabled` state block around line 419:

```typescript
// existing
const [voicePlanet, setVoicePlanet]   = useState<VoicePlanet>("Moon");
const [voiceEnabled, setVoiceEnabled] = useState(false);
```

Add one line directly after:

```typescript
const [voicePlanet, setVoicePlanet]   = useState<VoicePlanet>("Moon");
const [voiceEnabled, setVoiceEnabled] = useState(false);
const [liveVoiceActive, setLiveVoiceActive] = useState(false);
```

- [ ] **Step 2: Pass `onLiveVoice` to VoiceOracle**

Find the VoiceOracle usage (around line 746):

```tsx
// existing
<VoiceOracle
  planet={voicePlanet}
  enabled={voiceEnabled}
  onPlanetChange={setVoicePlanet}
  onToggle={() => {
    streamTTS.unlock();
    setVoiceEnabled(v => !v);
  }}
/>
```

Replace with:

```tsx
<VoiceOracle
  planet={voicePlanet}
  enabled={voiceEnabled}
  onPlanetChange={setVoicePlanet}
  onToggle={() => {
    streamTTS.unlock();
    setVoiceEnabled(v => !v);
  }}
  onLiveVoice={setLiveVoiceActive}
/>
```

- [ ] **Step 3: Suppress ElevenLabs auto-play when LiveKit is active**

In the streaming message handler (around line 540 and 635), the code does `if (voiceEnabled) setAutoPlayId(newId)` and `if (voiceEnabled) streamTTS.feed(...)`.

Change both occurrences:

```typescript
// before (line ~540)
if (voiceEnabled) setAutoPlayId(newId);
// after
if (voiceEnabled && !liveVoiceActive) setAutoPlayId(newId);

// before (line ~652)
if (voiceEnabled) streamTTS.feed(parsed.text);
// after
if (voiceEnabled && !liveVoiceActive) streamTTS.feed(parsed.text);
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "C:/Users/John/Desktop/cosmora" && npx tsc --noEmit 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 5: Manual test**

1. Start dev server, open `/dashboard/oracle`
2. Toggle voice on — pill should animate ring, show "CONNECTING…" then "LIVE"
3. Send a text message — no ElevenLabs audio should play while LIVE is shown
4. Toggle voice off — shows "VOICE" again, ElevenLabs resumes

- [ ] **Step 6: Commit**

```bash
git -C "C:/Users/John/Desktop/cosmora" add src/app/dashboard/oracle/page.tsx
git -C "C:/Users/John/Desktop/cosmora" commit -m "feat: wire liveVoiceActive into oracle page, suppress ElevenLabs while LiveKit is live"
```

---

## Task 8: Agent state signals in Python agents — both projects

**Files:**
- Modify: `C:\Users\John\Desktop\cosmora\agent\agent.py`
- Modify: `C:\Users\John\native-os\agent\agent.py`

The Python agents need to publish data messages when their speech state changes so the frontend's `RoomEvent.DataReceived` handler can update `agentState`.

- [ ] **Step 1: Update Cosmora `agent.py`**

Open `C:\Users\John\Desktop\cosmora\agent\agent.py`. Find the `CosmicOracle` class (or wherever the agent is defined). Add state signal methods.

The existing `CosmicOracle(Agent)` class likely has an `on_user_speech_started` hook or similar. In `livekit-agents` 1.5.12, use the `AgentSession` events. Replace the agent class body with the version below that includes state publishing:

```python
import json
import asyncio
import logging
import os
from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import deepgram, openai, cartesia, silero
from livekit.plugins.turn_detector import MultilingualModel

load_dotenv()
logger = logging.getLogger("cosmora-oracle")

# ── Planet personas ────────────────────────────────────────────────────────────

PLANET_PERSONAS = {
    "Sun":     "You are the Solar Sovereign — radiant, authoritative, and life-giving. You speak with warmth, confidence, and solar clarity.",
    "Moon":    "You are the Lunar Oracle — intuitive, nurturing, and deeply feeling. You speak with empathic wisdom and lunar mystery.",
    "Mercury": "You are the Cosmic Messenger — quick, analytical, and communicative. You deliver insight with precision and wit.",
    "Venus":   "You are the Beloved — graceful, harmonious, and artistically attuned. You speak with beauty, pleasure, and relational wisdom.",
    "Mars":    "You are the Warrior — direct, energetic, and action-oriented. You speak with courage, fire, and decisive clarity.",
    "Jupiter": "You are the Philosopher — expansive, optimistic, and wisdom-seeking. You speak with generosity and grand perspective.",
    "Saturn":  "You are the Architect — disciplined, structured, and time-aware. You speak with gravitas, patience, and earned authority.",
    "Uranus":  "You are the Revolutionary — innovative, unconventional, and future-oriented. You speak with lightning insight and radical honesty.",
    "Neptune": "You are the Mystic — dreamy, spiritual, and boundaryless. You speak with poetic depth and oceanic compassion.",
}

CORE_INSTRUCTIONS = """
You are an AI astrology oracle. Keep responses concise — 2-4 sentences for most answers.
Speak directly to the user's chart and current cosmic weather.
Never break character. No disclaimers about being an AI.
"""

def build_instructions(planet: str, chart_context: str | None) -> str:
    persona = PLANET_PERSONAS.get(planet, PLANET_PERSONAS["Moon"])
    ctx = f"\n\nChart context:\n{chart_context}" if chart_context else ""
    return f"{persona}\n{CORE_INSTRUCTIONS}{ctx}"


# ── State signal helper ────────────────────────────────────────────────────────

async def publish_state(session: AgentSession, state: str) -> None:
    try:
        data = json.dumps({"state": state}).encode()
        await session.room.local_participant.publish_data(data, reliable=True)
    except Exception as e:
        logger.warning(f"state publish failed: {e}")


# ── Agent ──────────────────────────────────────────────────────────────────────

class CosmicOracle(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)

    async def on_user_speech_started(self, session: AgentSession) -> None:
        await publish_state(session, "listening")

    async def on_user_speech_committed(self, session: AgentSession, user_msg) -> None:
        await publish_state(session, "thinking")

    async def on_agent_speech_started(self, session: AgentSession) -> None:
        await publish_state(session, "speaking")

    async def on_agent_speech_committed(self, session: AgentSession, agent_msg) -> None:
        await publish_state(session, "idle")


# ── Entrypoint ─────────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    meta = {}
    try:
        meta = json.loads(ctx.room.metadata or "{}")
    except json.JSONDecodeError:
        pass

    planet        = meta.get("planet", "Moon")
    chart_context = meta.get("chartContext")

    logger.info(f"Oracle starting — planet={planet}")

    session = AgentSession(
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM(model="gpt-4o"),
        tts=cartesia.TTS(model="sonic-3"),
        turn_detection=MultilingualModel(),
        vad=silero.VAD.load(),
    )

    await session.start(
        room=ctx.room,
        agent=CosmicOracle(instructions=build_instructions(planet, chart_context)),
    )

    await publish_state(session, "idle")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

- [ ] **Step 2: Update native-os `agent.py`**

Open `C:\Users\John\native-os\agent\agent.py`. Add the same `publish_state` helper and override the same lifecycle methods. The native-os agent does not have planet personas — keep its existing system prompt. Example:

```python
import json
import logging
import os
from dotenv import load_dotenv

from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import deepgram, openai, cartesia, silero
from livekit.plugins.turn_detector import MultilingualModel

load_dotenv()
logger = logging.getLogger("native-os-agent")

AIRA_INSTRUCTIONS = """
You are Aira, a helpful AI assistant built into native-os.
Be concise and helpful. Keep responses under 3 sentences when possible.
"""

async def publish_state(session: AgentSession, state: str) -> None:
    try:
        data = json.dumps({"state": state}).encode()
        await session.room.local_participant.publish_data(data, reliable=True)
    except Exception as e:
        logger.warning(f"state publish failed: {e}")


class AiraAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=AIRA_INSTRUCTIONS)

    async def on_user_speech_started(self, session: AgentSession) -> None:
        await publish_state(session, "listening")

    async def on_user_speech_committed(self, session: AgentSession, user_msg) -> None:
        await publish_state(session, "thinking")

    async def on_agent_speech_started(self, session: AgentSession) -> None:
        await publish_state(session, "speaking")

    async def on_agent_speech_committed(self, session: AgentSession, agent_msg) -> None:
        await publish_state(session, "idle")


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    logger.info("Aira agent starting")

    session = AgentSession(
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM(model="gpt-4o"),
        tts=cartesia.TTS(model="sonic-3"),
        turn_detection=MultilingualModel(),
        vad=silero.VAD.load(),
    )

    await session.start(room=ctx.room, agent=AiraAgent())
    await publish_state(session, "idle")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

- [ ] **Step 3: Verify agents start without import errors**

```bash
cd "C:/Users/John/Desktop/cosmora/agent" && python -c "import agent; print('OK')"
cd "C:/Users/John/native-os/agent" && python -c "import agent; print('OK')"
```

Expected: `OK` for both. If `ModuleNotFoundError`, ensure the venv with livekit-agents is activated.

- [ ] **Step 4: Commit both**

```bash
git -C "C:/Users/John/Desktop/cosmora" add agent/agent.py
git -C "C:/Users/John/Desktop/cosmora" commit -m "feat: add agent state signals (listening/thinking/speaking/idle)"

git -C "C:/Users/John/native-os" add agent/agent.py
git -C "C:/Users/John/native-os" commit -m "feat: add agent state signals (listening/thinking/speaking/idle)"
```

---

## Task 9: Delete old `AgentAudioVisualizerAura` from both projects

**Files:**
- Delete: `src/components/oracle/AgentAudioVisualizerAura.tsx` (Cosmora)
- Delete: `src/components/AgentAudioVisualizerAura.tsx` (native-os)

- [ ] **Step 1: Check for any remaining imports**

```bash
grep -r "AgentAudioVisualizerAura" "C:/Users/John/Desktop/cosmora/src" --include="*.tsx" --include="*.ts"
grep -r "AgentAudioVisualizerAura" "C:/Users/John/native-os/src"   --include="*.tsx" --include="*.ts"
```

Expected: no results (the files only exist, no imports). If any file imports it, update that import to use `AgentHaloRing` instead.

- [ ] **Step 2: Delete the files**

```bash
rm "C:/Users/John/Desktop/cosmora/src/components/oracle/AgentAudioVisualizerAura.tsx"
rm "C:/Users/John/native-os/src/components/AgentAudioVisualizerAura.tsx"
```

- [ ] **Step 3: Verify TypeScript still clean**

```bash
cd "C:/Users/John/Desktop/cosmora" && npx tsc --noEmit 2>&1 | head -20
cd "C:/Users/John/native-os"       && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git -C "C:/Users/John/Desktop/cosmora" rm src/components/oracle/AgentAudioVisualizerAura.tsx
git -C "C:/Users/John/Desktop/cosmora" commit -m "chore: remove AgentAudioVisualizerAura (replaced by AgentHaloRing)"

git -C "C:/Users/John/native-os" rm src/components/AgentAudioVisualizerAura.tsx
git -C "C:/Users/John/native-os" commit -m "chore: remove AgentAudioVisualizerAura (replaced by AgentHaloRing)"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|-----------------|------|
| `AgentHaloRing` component — Cosmora | Task 1 |
| `AgentHaloRing` component — native-os | Task 2 |
| `/api/livekit/token` route — Cosmora | Task 3 |
| `/api/livekit/token` route — native-os | Task 4 |
| `useOracleSession` hook | Task 5 |
| VoiceOracle wired to LiveKit | Task 6 |
| Oracle page minor wiring | Task 7 |
| Agent state signals in `agent.py` | Task 8 |
| Delete old `AgentAudioVisualizerAura` | Task 9 |
| Color = `PLANET_VOICES[planet].color` in Cosmora | Task 6 (AgentHaloRing receives `profile.color`) |
| Fixed `#1FD5F9` color in native-os | Task 2 (noted — usage site passes the color) |
| Room metadata: planet + chartContext | Task 3, Task 8 |
| `.superpowers/` in `.gitignore` | Already done (previous session) |
