"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { ChartData } from "@/lib/astrology/types";
import { PLANET_COLORS, PLANET_SYMBOLS, type AstroLinePlanet } from "@/lib/astrology/astrocartography";
import type { LifeEvent } from "@/lib/chronicle/types";
import type { SkyState } from "@/lib/chronicle/sky-state";
import { natalAnchors, eventNodePosition } from "@/lib/chronicle/observatory-layout";
import { detectGpuTier, QUALITY } from "@/lib/design/gpuTier";

const ANCHOR_R = 3.2;    // radius of the fixed natal anchor ring — the "zero point"
const NODE_R_MIN = 4.0;  // event nodes always render outside the anchor ring
const NODE_R_MAX = 6.5;
const NEUTRAL_COLOR = "#C8A55B"; // Ascendant/Midheaven have no PLANET_COLORS entry

// ─── Star field backdrop ────────────────────────────────────────────────────────
function StarField() {
  const geom = useMemo(() => {
    const positions: number[] = [];
    const h = (n: number) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
    for (let i = 0; i < 900; i++) {
      const r = 9 + h(i) * 14;
      const th = h(i + 100) * Math.PI * 2;
      const ph = (h(i + 200) - 0.5) * Math.PI * 0.9;
      positions.push(r * Math.cos(ph) * Math.cos(th), r * Math.sin(ph), r * Math.cos(ph) * Math.sin(th));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  return (
    <points geometry={geom}>
      <pointsMaterial color="#ffffff" size={0.045} sizeAttenuation transparent opacity={0.55} />
    </points>
  );
}

// ─── Fixed natal anchor — the zero point ────────────────────────────────────────
function Anchor({ id, x, z }: { id: string; x: number; z: number }) {
  const color = (PLANET_COLORS as Record<string, string>)[id] ?? NEUTRAL_COLOR;
  const symbol = (PLANET_SYMBOLS as Record<string, string>)[id] ?? (id === "Ascendant" ? "ASC" : id === "Midheaven" ? "MC" : id);
  const pos = useMemo(() => new THREE.Vector3(x * ANCHOR_R, 0, z * ANCHOR_R), [x, z]);
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html center distanceFactor={7} style={{ pointerEvents: "none" }}>
        <div style={{ color, fontSize: 11, fontFamily: "'Fragment Mono', monospace", textShadow: `0 0 8px ${color}` }}>
          {symbol}
        </div>
      </Html>
    </group>
  );
}

// ─── Lit node — a Chronicle event ───────────────────────────────────────────────
function LitNode({
  eventId, x, z, color, intensity, onClick,
}: {
  eventId: string; x: number; z: number; color: string; intensity: number;
  onClick: (eventId: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => {
    const mag = Math.min(Math.hypot(x, z), 1);
    const dirX = mag > 0.001 ? x / mag : 0;
    const dirZ = mag > 0.001 ? z / mag : 1;
    const radius = NODE_R_MIN + (NODE_R_MAX - NODE_R_MIN) * mag;
    return new THREE.Vector3(dirX * radius, 0, dirZ * radius);
  }, [x, z]);
  const brightColor = useMemo(() => new THREE.Color(color).multiplyScalar(1.5 + intensity * 2), [color, intensity]);
  const scale = 0.05 + intensity * 0.09;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.4 + x * 10 + z * 10) * 0.08 * intensity;
    meshRef.current.scale.setScalar(scale * pulse);
  });

  return (
    <group position={pos} onClick={(e) => { e.stopPropagation(); onClick(eventId); }}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={brightColor} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────────
function Scene({
  chart, events, skyStates, onNodeClick,
}: {
  chart: ChartData; events: LifeEvent[]; skyStates: Map<string, SkyState>; onNodeClick: (eventId: string) => void;
}) {
  const anchors = useMemo(() => natalAnchors(chart), [chart]);
  const nodes = useMemo(() => {
    return events
      .map(e => {
        const sky = skyStates.get(e.id);
        if (!sky) return null;
        const pos = eventNodePosition(e, sky, chart);
        const color = pos.dominantPlanet ? PLANET_COLORS[pos.dominantPlanet as AstroLinePlanet] : NEUTRAL_COLOR;
        return { event: e, pos, color };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);
  }, [events, skyStates, chart]);

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 6, 0]} intensity={0.3} color="#7B6FD4" />
      <StarField />

      {Object.entries(anchors).map(([id, a]) => (
        <Anchor key={id} id={id} x={a.x} z={a.z} />
      ))}

      {nodes.map(({ event, pos, color }) => (
        <LitNode
          key={event.id}
          eventId={event.id}
          x={pos.x} z={pos.z}
          color={color}
          intensity={event.emotionalIntensity}
          onClick={onNodeClick}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={16}
        maxPolarAngle={Math.PI / 1.6}
        rotateSpeed={0.45}
        dampingFactor={0.07}
        enableDamping
      />

      <EffectComposer>
        <Bloom
          blendFunction={BlendFunction.ADD}
          intensity={1.8}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.6}
          radius={0.85}
        />
      </EffectComposer>
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export interface ObservatoryCanvasProps {
  chart: ChartData;
  events: LifeEvent[];
  skyStates: Map<string, SkyState>;
  onNodeClick: (eventId: string) => void;
}

export default function ObservatoryCanvas({ chart, events, skyStates, onNodeClick }: ObservatoryCanvasProps) {
  const quality = QUALITY[typeof window !== "undefined" ? detectGpuTier() : "high"];
  return (
    <Canvas
      camera={{ position: [0, 5, 9], fov: 42 }}
      dpr={quality.dpr}
      gl={{ antialias: quality.antialias, alpha: false }}
      style={{ background: "#010810" }}
    >
      <Scene chart={chart} events={events} skyStates={skyStates} onNodeClick={onNodeClick} />
    </Canvas>
  );
}
