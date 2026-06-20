"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import * as THREE from "three";
import type { AstroLine, AstroLinePlanet, AstroLineAngle } from "@/lib/astrology/astrocartography";
import { PLANET_COLORS, PLANET_SYMBOLS, scoreLocation } from "@/lib/astrology/astrocartography";
import { LANDMARKS, proceduralSkyline, type Prim } from "@/lib/astrology/skylines";
import type { CitySpot } from "@/lib/astrology/crossings";
import { QUALITY, detectGpuTier } from "@/lib/design/gpuTier";
import { earthTextureSet } from "./earthTextures";

export type GlobeMode = "globe" | "cities" | "lines" | "planets" | "energy";
export type { CitySpot } from "@/lib/astrology/crossings";

const GLOBE_R    = 2.0;
const FOOT       = 0.070;  // building footprint scale
const HSCALE     = 0.105;  // building height scale
const PLATFORM_H = 0.22;   // holographic platform height above surface

const ANGLE_DASH: Record<AstroLineAngle, boolean> = { MC: false, IC: true, ASC: false, DSC: true };

const ENERGY_MAP: Record<AstroLinePlanet, { label: string; color: string }> = {
  Sun:     { label: "VITALITY",      color: "#fbbf24" },
  Mercury: { label: "MERCURY",       color: "#a78bfa" },
  Venus:   { label: "LOVE",          color: "#f472b6" },
  Moon:    { label: "EMOTIONS",      color: "#94a3b8" },
  Mars:    { label: "DRIVE",         color: "#ef4444" },
  Jupiter: { label: "EXPANSION",     color: "#f59e0b" },
  Saturn:  { label: "DISCIPLINE",    color: "#8b9ab4" },
  Uranus:  { label: "INNOVATION",    color: "#06b6d4" },
  Neptune: { label: "SPIRITUALITY",  color: "#3b82f6" },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function ll2xyz(lat: number, lon: number, r = GLOBE_R): THREE.Vector3 {
  const φ = (lat  * Math.PI) / 180;
  const λ = (-lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(φ) * Math.cos(λ), r * Math.sin(φ), r * Math.cos(φ) * Math.sin(λ));
}

function buildLineGeo(lines: number[][][], r: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (const line of lines)
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
      if (Math.abs(lon2 - lon1) > 90) continue;
      pts.push(ll2xyz(lat1, lon1, r), ll2xyz(lat2, lon2, r));
    }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

// (Earth now uses meshStandardMaterial + DirectionalLight — see EarthSphere)

// ─── Atmosphere GLSL (Fresnel rim) ───────────────────────────────────────────
const ATMO_VERT = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal  = normalize(normalMatrix * normal);
    vec4 mv  = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const ATMO_FRAG = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;
  uniform vec3  uColor;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float fres = pow(1.0 - abs(dot(vNormal, vViewDir)), uPower);
    gl_FragColor = vec4(uColor, fres * uIntensity);
  }
`;

// ─── Earth sphere — standard material + sun light ────────────────────────────
function EarthSphere() {
  const gpuTier = useMemo(() => (typeof window !== "undefined" ? detectGpuTier() : "high"), []);
  const texSet  = useMemo(() => earthTextureSet(gpuTier), [gpuTier]);
  const matRef  = useRef<THREE.MeshStandardMaterial>(null);

  const [dayTex,   setDayTex]   = useState<THREE.Texture | null>(null);
  const [nightTex, setNightTex] = useState<THREE.Texture | null>(null);
  const [cloudTex, setCloudTex] = useState<THREE.Texture | null>(null);
  const [specTex,  setSpecTex]  = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let alive = true;
    loader.loadAsync(texSet.day).then(t => {
      if (!alive) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setDayTex(t);
    }).catch(() => {});
    loader.loadAsync(texSet.night).then(t => {
      if (!alive) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setNightTex(t);
    }).catch(() => {});
    loader.loadAsync(texSet.clouds).then(t => {
      if (!alive) return;
      setCloudTex(t);
    }).catch(() => {});
    loader.loadAsync(texSet.specular).then(t => {
      if (!alive) return;
      setSpecTex(t);
    }).catch(() => {});
    return () => { alive = false; };
  }, [texSet.day, texSet.night, texSet.clouds, texSet.specular]);

  return (
    <>
      {/* Earth surface */}
      <mesh>
        <sphereGeometry args={[GLOBE_R, 128, 128]} />
        <meshStandardMaterial
          ref={matRef}
          map={dayTex ?? undefined}
          color={new THREE.Color(0.72, 0.88, 1.0)}
          emissiveMap={nightTex ?? undefined}
          emissive={new THREE.Color(0.18, 0.28, 0.55)}
          emissiveIntensity={nightTex ? 0.28 : 0.05}
          roughnessMap={specTex ?? undefined}
          roughness={0.75}
          metalness={0.06}
        />
      </mesh>

      {/* Cloud layer — separate sphere just above the surface */}
      {cloudTex && (
        <mesh>
          <sphereGeometry args={[GLOBE_R * 1.003, 64, 64]} />
          <meshStandardMaterial
            map={cloudTex}
            transparent opacity={0.55}
            depthWrite={false}
            roughness={0.9}
          />
        </mesh>
      )}
    </>
  );
}

// ─── Milky Way background — imperative load ───────────────────────────────────
function MilkyWaySky() {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.loadAsync("/textures/space/8k_stars_milky_way.jpg")
      .then(t => { t.colorSpace = THREE.SRGBColorSpace; setTex(t); })
      .catch(() => {});
  }, []);
  if (!tex) return null;
  return (
    <mesh>
      <sphereGeometry args={[26, 48, 48]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} transparent opacity={0.72} />
    </mesh>
  );
}

// ─── Tactical grid overlay ────────────────────────────────────────────────────
function TacticalGrid() {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const R = GLOBE_R + 0.009;
    const S = 96;
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let i = 0; i < S; i++) {
        const l1 = -180 + (i / S) * 360, l2 = -180 + ((i + 1) / S) * 360;
        pts.push(ll2xyz(lat, l1, R), ll2xyz(lat, l2, R));
      }
    }
    for (let lon = -180; lon < 180; lon += 30) {
      for (let i = 0; i < S; i++) {
        const la1 = -80 + (i / S) * 160, la2 = -80 + ((i + 1) / S) * 160;
        pts.push(ll2xyz(la1, lon, R), ll2xyz(la2, lon, R));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#0A2840" transparent opacity={0.28} depthWrite={false} />
    </lineSegments>
  );
}

// ─── Atmosphere — war-room cyan inner, amber outer ───────────────────────────
function Atmosphere() {
  const inner = useMemo(() => ({
    uColor: { value: new THREE.Color("#2BD4FF") },
    uPower: { value: 3.5 }, uIntensity: { value: 0.55 },
  }), []);
  const outer = useMemo(() => ({
    uColor: { value: new THREE.Color("#FF7A3C") },
    uPower: { value: 4.8 }, uIntensity: { value: 0.42 },
  }), []);
  return (
    <>
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.015, 64, 64]} />
        <shaderMaterial vertexShader={ATMO_VERT} fragmentShader={ATMO_FRAG} uniforms={inner}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.12, 64, 64]} />
        <shaderMaterial vertexShader={ATMO_VERT} fragmentShader={ATMO_FRAG} uniforms={outer}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

// ─── Geo lines — amber coastlines (war-room palette) ─────────────────────────
function GeoLines() {
  const [coastGeo,  setCoastGeo]  = useState<THREE.BufferGeometry | null>(null);
  const [borderGeo, setBorderGeo] = useState<THREE.BufferGeometry | null>(null);
  const [stateGeo,  setStateGeo]  = useState<THREE.BufferGeometry | null>(null);
  const [riverGeo,  setRiverGeo]  = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const load = (url: string, r: number, set: (g: THREE.BufferGeometry) => void) =>
      fetch(url).then(res => res.json()).then((d: number[][][]) => set(buildLineGeo(d, r))).catch(() => {});
    load("/geo/coastlines.json", GLOBE_R + 0.006, setCoastGeo);
    load("/geo/borders.json",    GLOBE_R + 0.005, setBorderGeo);
    load("/geo/states.json",     GLOBE_R + 0.004, setStateGeo);
    load("/geo/rivers.json",     GLOBE_R + 0.007, setRiverGeo);
  }, []);

  return (
    <>
      {borderGeo && <lineSegments geometry={borderGeo}><lineBasicMaterial color="#7A4018" transparent opacity={0.55} /></lineSegments>}
      {stateGeo  && <lineSegments geometry={stateGeo} ><lineBasicMaterial color="#5A2F10" transparent opacity={0.38} /></lineSegments>}
      {riverGeo  && <lineSegments geometry={riverGeo} ><lineBasicMaterial color="#1A5C9A" transparent opacity={0.55} /></lineSegments>}
      {coastGeo  && <lineSegments geometry={coastGeo} ><lineBasicMaterial color="#FFC870" /></lineSegments>}
    </>
  );
}

// ─── Orbital decorative rings ─────────────────────────────────────────────────
const RING_DEFS = [
  { tilt: [0.22, 0, 0.4],   speed:  0.055, r: GLOBE_R * 1.38, color: "#1A3A5A", nodes: 3 },
  { tilt: [0.55, 0.6, 0],   speed: -0.040, r: GLOBE_R * 1.52, color: "#0A2A44", nodes: 2 },
  { tilt: [1.1,  0.2, 0.9], speed:  0.085, r: GLOBE_R * 1.28, color: "#FF6A2C", nodes: 4 },
] as const;

function OrbitalRing({ tilt, speed, r, color, nodes }: typeof RING_DEFS[number]) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * speed; });
  const angles = useMemo(() =>
    Array.from({ length: nodes }, (_, i) => (i * Math.PI * 2) / nodes), [nodes]);
  return (
    <group ref={ref} rotation={tilt as [number, number, number]}>
      <mesh>
        <torusGeometry args={[r, 0.003, 4, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
      {angles.map((a, i) => (
        <mesh key={i} position={[r * Math.cos(a), 0, r * Math.sin(a)]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
}
function OrbitalRings() {
  return <>{RING_DEFS.map((d, i) => <OrbitalRing key={i} {...d} />)}</>;
}

// ─── Energy heatmap ───────────────────────────────────────────────────────────
function EnergyHeatmap({ lines }: { lines: AstroLine[] }) {
  const geo = useMemo(() => {
    if (!lines.length) return null;
    const pos: number[] = [], col: number[] = [];
    const R = GLOBE_R + 0.011;
    for (let lat = -80; lat <= 80; lat += 5)
      for (let lon = -175; lon <= 175; lon += 5) {
        const scores = scoreLocation(lines, lat, lon);
        if (!scores.length || scores[0].influence < 0.12) continue;
        const p = ll2xyz(lat, lon, R);
        pos.push(p.x, p.y, p.z);
        const c = new THREE.Color(PLANET_COLORS[scores[0].planet]);
        const v = Math.min(scores[0].influence * 1.2, 1.0);
        col.push(c.r * v, c.g * v, c.b * v);
      }
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [lines]);

  if (!geo) return null;
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.65}
        sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ─── Building primitives ──────────────────────────────────────────────────────
const edgesOf = (g: THREE.BufferGeometry, angle = 18) => new THREE.EdgesGeometry(g, angle);

function buildPrim(prim: Prim): { geo: THREE.BufferGeometry; pos: [number, number, number] }[] {
  const x = (prim.x ?? 0) * FOOT;
  const z = ((prim as { z?: number }).z ?? 0) * FOOT;
  switch (prim.k) {
    case "box": {
      const w = prim.w * FOOT, d = (prim.d ?? prim.w) * FOOT, h = prim.h * HSCALE;
      return [{ geo: edgesOf(new THREE.BoxGeometry(w, h, d)), pos: [x, h / 2, z] }];
    }
    case "taper": {
      const w = prim.w * FOOT, h = prim.h * HSCALE, top = prim.top ?? 0.25;
      const g = new THREE.CylinderGeometry((w / 2) * top, w / 2, h, 4); g.rotateY(Math.PI / 4);
      return [{ geo: edgesOf(g), pos: [x, h / 2, z] }];
    }
    case "spire": {
      const w = prim.w * FOOT, h = prim.h * HSCALE;
      const g = new THREE.ConeGeometry(w / 2, h, 4); g.rotateY(Math.PI / 4);
      return [{ geo: edgesOf(g), pos: [x, h / 2, z] }];
    }
    case "pyramid": {
      const w = prim.w * FOOT, h = prim.h * HSCALE;
      const g = new THREE.ConeGeometry(w * 0.72, h, 4); g.rotateY(Math.PI / 4);
      return [{ geo: edgesOf(g), pos: [x, h / 2, z] }];
    }
    case "setback": {
      const steps = prim.steps ?? 3, h = prim.h * HSCALE;
      const w0 = prim.w * FOOT, d0 = (prim.d ?? prim.w) * FOOT, sh = h / steps;
      const out: { geo: THREE.BufferGeometry; pos: [number, number, number] }[] = [];
      let y = 0;
      for (let s = 0; s < steps; s++) {
        const f = 1 - (s / steps) * 0.6;
        out.push({ geo: edgesOf(new THREE.BoxGeometry(w0 * f, sh, d0 * f)), pos: [x, y + sh / 2, z] });
        y += sh;
      }
      out.push({ geo: edgesOf(new THREE.ConeGeometry(w0 * 0.07, h * 0.22, 4)), pos: [x, y + h * 0.11, z] });
      return out;
    }
    case "dome": {
      const r = prim.r * FOOT, drumH = prim.h * HSCALE * 0.45;
      const drum = new THREE.CylinderGeometry(r, r, drumH, 10);
      const dome = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      return [
        { geo: edgesOf(drum), pos: [x, drumH / 2, z] },
        { geo: edgesOf(dome), pos: [x, drumH, z] },
      ];
    }
  }
}

function PrimMesh({ prim, color }: { prim: Prim; color: THREE.Color }) {
  const parts = useMemo(() => buildPrim(prim), [prim]);
  return (
    <>
      {parts.map((p, i) => (
        <lineSegments key={i} geometry={p.geo} position={p.pos}>
          <lineBasicMaterial color={color} />
        </lineSegments>
      ))}
    </>
  );
}

// ─── Holographic city projection ─────────────────────────────────────────────
function HoloCity({ spot, index }: { spot: CitySpot; index: number }) {
  const buildingsRef = useRef<THREE.Group>(null);
  const scanRef      = useRef<THREE.Mesh>(null);
  const beamRef      = useRef<THREE.Mesh>(null);
  const riseT        = useRef(1);   // start at full height — no delay
  const pulseT       = useRef(index * 1.17);

  const energy = useMemo(() => {
    const top = spot.scores?.[0]?.planet;
    return top ? (ENERGY_MAP[top] ?? { label: "COSMIC", color: "#4488FF" }) : { label: "COSMIC", color: "#4488FF" };
  }, [spot.scores]);

  const col = useMemo(() => new THREE.Color(energy.color), [energy.color]);

  const surfacePos = useMemo(() => ll2xyz(spot.lat, spot.lon, GLOBE_R), [spot.lat, spot.lon]);
  const quaternion = useMemo(() => {
    const n = ll2xyz(spot.lat, spot.lon, 1).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  }, [spot.lat, spot.lon]);

  const prims = useMemo<Prim[]>(() => {
    const sk = spot.skyline;
    if (sk?.tier === "landmark" && sk.landmark && LANDMARKS[sk.landmark]) return LANDMARKS[sk.landmark];
    const seed = (index * 997 + Math.round(spot.lat * 13) + Math.round(spot.lon * 7)) | 0;
    return proceduralSkyline(sk?.height ?? 1, sk?.density ?? 1, seed);
  }, [spot.skyline, spot.lat, spot.lon, index]);

  const maxH = useMemo(() => Math.max(0.10, ...prims.map(p => p.h * HSCALE)), [prims]);

  const halfSpan = useMemo(() =>
    Math.max(0.08, ...prims.map(p =>
      Math.abs((p.x ?? 0) * FOOT) +
      (("w" in p ? p.w : ("r" in p ? p.r : 0)) * FOOT)
    )) + 0.016,
    [prims]);

  // Geometries — stable refs via useMemo
  const beamGeo        = useMemo(() => new THREE.ConeGeometry(halfSpan * 0.88, PLATFORM_H, 24, 1, true), [halfSpan]);
  const scanRingGeo    = useMemo(() => new THREE.RingGeometry(halfSpan * 0.3, halfSpan * 0.52, 56), [halfSpan]);
  const platformRingGeo = useMemo(() => new THREE.RingGeometry(halfSpan - 0.004, halfSpan + 0.004, 64), [halfSpan]);
  const platformFillGeo = useMemo(() => new THREE.CircleGeometry(halfSpan, 64), [halfSpan]);
  const platformEdgesGeo = useMemo(() =>
    new THREE.EdgesGeometry(new THREE.BoxGeometry(halfSpan * 2, 0.003, halfSpan * 2)), [halfSpan]);

  useFrame((_, dt) => {
    riseT.current  = Math.min(riseT.current + dt * 0.85, 1.0);
    pulseT.current += dt;

    if (buildingsRef.current) buildingsRef.current.scale.y = riseT.current;

    if (beamRef.current) {
      const m = beamRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.32 + Math.sin(pulseT.current * 1.6) * 0.12;
    }

    if (scanRef.current) {
      const phase = (pulseT.current * 0.55) % 1.0;
      const m = scanRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = Math.max(0, (1 - phase) * 0.85);
      scanRef.current.scale.setScalar(1 + phase * 1.8);
    }
  });

  return (
    <group position={surfacePos} quaternion={quaternion}>
      {/* Surface scan ring — pulses outward */}
      <mesh ref={scanRef} geometry={scanRingGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={col} transparent opacity={0.5} depthWrite={false}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Projector beam — narrow at surface, wide at platform */}
      <mesh ref={beamRef} geometry={beamGeo}
        position={[0, PLATFORM_H / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <meshBasicMaterial color={col} transparent opacity={0.32} depthWrite={false}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Floating holographic platform */}
      <group position={[0, PLATFORM_H, 0]}>
        {/* Platform fill — ultra-dim inner glow */}
        <mesh geometry={platformFillGeo} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={col} transparent opacity={0.03} depthWrite={false}
            side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        {/* Platform ring — bright glowing edge */}
        <mesh geometry={platformRingGeo} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={col} transparent opacity={0.90} depthWrite={false}
            side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        {/* Corner bracket wireframe */}
        <lineSegments geometry={platformEdgesGeo} position={[0, 0.002, 0]}>
          <lineBasicMaterial color={col} transparent opacity={0.22} />
        </lineSegments>

        {/* Buildings — scale.y rises from 0 → 1 */}
        <group ref={buildingsRef}>
          {prims.map((p, i) => <PrimMesh key={i} prim={p} color={col} />)}
        </group>

        {/* Label — compact, stays above max building height */}
        <Html position={[0, maxH + 0.10, 0]} center distanceFactor={7} zIndexRange={[10, 0]}>
          <div style={{ pointerEvents: "none", textAlign: "center", lineHeight: 1.25 }}>
            <div style={{
              color: energy.color, fontSize: 8,
              fontFamily: "'Fragment Mono', monospace",
              letterSpacing: "0.14em", fontWeight: 700,
              textShadow: `0 0 10px ${energy.color}BB`,
              background: `${energy.color}12`,
              border: `1px solid ${energy.color}3A`,
              padding: "1px 5px", borderRadius: 2, whiteSpace: "nowrap",
            }}>
              {spot.city.split(",")[0].toUpperCase()}
            </div>
            <div style={{
              color: energy.color, fontSize: 7,
              fontFamily: "'Fragment Mono', monospace",
              opacity: 0.70, letterSpacing: "0.08em",
            }}>
              {PLANET_SYMBOLS[spot.scores[0]?.planet as AstroLinePlanet] ?? "·"} {energy.label}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// ─── Birth location pulse rings ──────────────────────────────────────────────
function BirthPulseRings({ lat, lon }: { lat: number; lon: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  const pos  = useMemo(() => ll2xyz(lat, lon, GLOBE_R), [lat, lon]);
  const quat = useMemo(() => {
    const n = ll2xyz(lat, lon, 1).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  }, [lat, lon]);

  useFrame((_, dt) => {
    t.current += dt;
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const phase = ((t.current * 0.45 + i * 0.34) % 1.0);
        child.scale.setScalar(1 + phase * 3.2);
        (child.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.55;
      }
    });
  });

  return (
    <group position={[pos.x, pos.y, pos.z]} quaternion={quat}>
      <group ref={groupRef}>
        {[0, 1, 2].map(i => (
          <mesh key={i}>
            <ringGeometry args={[0.04, 0.058, 48]} />
            <meshBasicMaterial color="#2BD4FF" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <mesh>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Html center distanceFactor={7} zIndexRange={[5, 0]}>
        <div style={{
          pointerEvents: "none", color: "#2BD4FF", fontSize: 7,
          fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em",
          opacity: 0.80, textAlign: "center", whiteSpace: "nowrap", marginTop: 18,
        }}>BIRTH</div>
      </Html>
    </group>
  );
}

// ─── Astro line ───────────────────────────────────────────────────────────────
function AstroLineObject({ line, color, dashed, opacity, mode }: {
  line: AstroLine; color: string; dashed: boolean; opacity: number; mode: GlobeMode;
}) {
  const col   = useMemo(() => new THREE.Color(color), [color]);
  const tubeR = mode === "lines" ? 0.0075 : 0.0045;

  return (
    <>
      {line.segments.map((seg, si) => {
        if (seg.length < 2) return null;
        const pts   = seg.map(p => ll2xyz(p.lat, p.lon, GLOBE_R + 0.014));
        const curve = new THREE.CatmullRomCurve3(pts, false, "chordal", 0.5);
        const n     = Math.min(pts.length * 6, 300);
        if (dashed) {
          const geo = new THREE.BufferGeometry().setFromPoints(
            curve.getPoints(n).filter((_, i) => Math.floor(i / 6) % 2 === 0)
          );
          return <lineSegments key={si} geometry={geo}><lineBasicMaterial color={col} transparent opacity={opacity * 0.75} /></lineSegments>;
        }
        return (
          <mesh key={si} geometry={new THREE.TubeGeometry(curve, n, tubeR, 4, false)}>
            <meshBasicMaterial color={col} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </>
  );
}

// ─── Planet labels ────────────────────────────────────────────────────────────
function PlanetLabels({ lines }: { lines: AstroLine[] }) {
  const items = useMemo(() => {
    const seen = new Set<AstroLinePlanet>();
    const out: { planet: AstroLinePlanet; pos: THREE.Vector3 }[] = [];
    for (const line of lines) {
      if (seen.has(line.planet) || (line.angle !== "MC" && line.angle !== "ASC")) continue;
      const all = line.segments.flatMap(s => s);
      if (!all.length) continue;
      const peak = all.reduce((a, b) => Math.abs(a.lat) < Math.abs(b.lat) ? b : a);
      out.push({ planet: line.planet, pos: ll2xyz(peak.lat, peak.lon, GLOBE_R + 0.16) });
      seen.add(line.planet);
    }
    return out;
  }, [lines]);

  return (
    <>
      {items.map(({ planet, pos }) => (
        <Html key={planet} position={pos} center distanceFactor={6} zIndexRange={[10, 0]}>
          <div style={{
            color: PLANET_COLORS[planet], fontSize: 10, fontFamily: "'Fragment Mono', monospace",
            letterSpacing: "0.08em", whiteSpace: "nowrap", pointerEvents: "none",
            textShadow: `0 0 10px ${PLANET_COLORS[planet]}`,
            background: "rgba(1,8,16,0.6)", padding: "2px 6px", borderRadius: 3,
            border: `1px solid ${PLANET_COLORS[planet]}44`,
          }}>
            {PLANET_SYMBOLS[planet]} {planet}
          </div>
        </Html>
      ))}
    </>
  );
}

// ─── Click handler ────────────────────────────────────────────────────────────
function GlobeClickHandler({ onGlobeClick, globeGroupRef }: {
  onGlobeClick: (lat: number, lon: number) => void;
  globeGroupRef: React.RefObject<THREE.Group | null>;
}) {
  const { camera, gl } = useThree();

  const handleClick = useCallback((e: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect();
    const x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    const target = new THREE.Vector3();
    if (!ray.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), GLOBE_R), target)) return;
    const angle = globeGroupRef.current?.rotation.y ?? 0;
    const cosA = Math.cos(-angle), sinA = Math.sin(-angle);
    const rx =  target.x * cosA + target.z * sinA;
    const ry =  target.y;
    const rz = -target.x * sinA + target.z * cosA;
    onGlobeClick(
      (Math.asin(ry / GLOBE_R) * 180) / Math.PI,
      -(Math.atan2(rz, rx) * 180) / Math.PI,
    );
  }, [camera, gl, onGlobeClick, globeGroupRef]);

  useEffect(() => {
    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [gl, handleClick]);

  return null;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({
  lines, activePlanets, activeAngles, globeMode, topSpots,
  onLocationClick, onVortexClick: _,
  birthLat = 34.05, birthLon = -118.24,
  showCities = true, showLines = true,
}: {
  lines: AstroLine[]; activePlanets: Set<AstroLinePlanet>; activeAngles: Set<AstroLineAngle>;
  globeMode: GlobeMode; topSpots: CitySpot[];
  onLocationClick: (lat: number, lon: number) => void;
  onVortexClick: (node: unknown) => void;
  birthLat?: number; birthLon?: number;
  showCities?: boolean; showLines?: boolean;
}) {
  const globeGroupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (globeGroupRef.current) globeGroupRef.current.rotation.y += dt * 0.012; });

  const visibleLines = useMemo(() => {
    if (globeMode === "lines") return lines.filter(l => activeAngles.has(l.angle));
    return lines.filter(l => activePlanets.has(l.planet) && activeAngles.has(l.angle));
  }, [lines, activePlanets, activeAngles, globeMode]);

  const lineOpacity    = showCities ? 0.62 : 0.90;
  const bloomIntensity = globeMode === "energy" ? 2.8 : globeMode === "lines" ? 2.2 : globeMode === "cities" ? 2.0 : 1.75;

  return (
    <>
      <ambientLight intensity={0.12} />
      {/* Sun — fixed world position so the camera-facing hemisphere stays lit */}
      <directionalLight position={[4.8, 3.2, 3.2]} intensity={3.0} color="#FFF5E0" />
      <pointLight position={[-5, -3, -5]} intensity={0.18} color="#1A3A6A" />

      {/* Milky Way background — does not rotate with Earth */}
      <MilkyWaySky />

      {/* Orbital rings — own independent rotation */}
      <OrbitalRings />

      {/* ── Everything geo: rotates together ── */}
      <group ref={globeGroupRef}>
        <EarthSphere />
        <TacticalGrid />
        <GeoLines />
        <BirthPulseRings lat={birthLat} lon={birthLon} />

        {globeMode === "energy" && <EnergyHeatmap lines={visibleLines} />}

        {showLines && visibleLines.map(line => (
          <AstroLineObject
            key={`${line.planet}-${line.angle}`}
            line={line}
            color={PLANET_COLORS[line.planet]}
            dashed={globeMode === "lines" ? false : ANGLE_DASH[line.angle]}
            opacity={lineOpacity}
            mode={globeMode}
          />
        ))}

        {globeMode === "planets" && <PlanetLabels lines={visibleLines} />}

        {showCities && topSpots.map((spot, i) => (
          <HoloCity key={spot.city} spot={spot} index={i} />
        ))}
      </group>

      <GlobeClickHandler onGlobeClick={onLocationClick} globeGroupRef={globeGroupRef} />

      <OrbitControls
        enablePan={false} minDistance={2.8} maxDistance={9.5}
        rotateSpeed={0.4} autoRotate={false} enableDamping dampingFactor={0.05}
      />

      <EffectComposer>
        <Bloom blendFunction={BlendFunction.ADD} intensity={bloomIntensity}
          luminanceThreshold={0.55} luminanceSmoothing={0.35} radius={0.70} />
      </EffectComposer>
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export interface VortexNodePublic {
  lat: number; lon: number;
  lines: { planet: AstroLinePlanet; angle: AstroLineAngle }[];
  power: number; label: string;
}

export default function GlobeCanvas({
  lines, activePlanets, activeAngles, globeMode, topSpots,
  onLocationClick, onVortexClick,
  birthLat, birthLon, showCities, showLines,
}: {
  lines: AstroLine[]; activePlanets: Set<AstroLinePlanet>; activeAngles: Set<AstroLineAngle>;
  globeMode: GlobeMode; topSpots: CitySpot[];
  onLocationClick: (lat: number, lon: number) => void;
  onVortexClick: (node: unknown) => void;
  birthLat?: number; birthLon?: number;
  showCities?: boolean; showLines?: boolean;
}) {
  const quality = QUALITY[typeof window !== "undefined" ? detectGpuTier() : "high"];
  return (
    <Canvas
      camera={{ position: [0, 2.8, 5.2], fov: 46 }}
      dpr={quality.dpr}
      gl={{ antialias: quality.antialias, alpha: false }}
      style={{ background: "#010810" }}
    >
      <color attach="background" args={["#010810"]} />
      <Scene
        lines={lines} activePlanets={activePlanets} activeAngles={activeAngles}
        globeMode={globeMode} topSpots={topSpots}
        onLocationClick={onLocationClick} onVortexClick={onVortexClick}
        birthLat={birthLat} birthLon={birthLon}
        showCities={showCities} showLines={showLines}
      />
    </Canvas>
  );
}
