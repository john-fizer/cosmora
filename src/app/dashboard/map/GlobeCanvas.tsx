"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useMemo, useCallback, useState, useEffect, Suspense } from "react";
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
const PLATFORM_H = 0.04;   // holographic platform height above surface

const ANGLE_DASH: Record<AstroLineAngle, boolean> = { MC: false, IC: true, ASC: false, DSC: true };

const ENERGY_MAP: Record<AstroLinePlanet, { label: string; color: string }> = {
  Sun:     { label: "VITALITY",      color: "#fbbf24" },
  Mercury: { label: "COMMUNICATION", color: "#a78bfa" },
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

// ─── Earth sphere — useTexture guarantees textures exist before render ────────
function EarthSphereInner({ texSet }: { texSet: ReturnType<typeof earthTextureSet> }) {
  const [dayTex, nightTex, cloudTex] = useTexture(
    [texSet.day, texSet.night, texSet.clouds]
  );
  dayTex.colorSpace   = THREE.SRGBColorSpace;
  nightTex.colorSpace = THREE.SRGBColorSpace;
  cloudTex.colorSpace = THREE.SRGBColorSpace;

  return (
    <>
      {/* Earth surface */}
      <mesh>
        <sphereGeometry args={[GLOBE_R, 128, 128]} />
        <meshStandardMaterial
          map={dayTex}
          emissiveMap={nightTex}
          emissive={new THREE.Color(0.82, 0.62, 0.28)}
          emissiveIntensity={0.18}
          roughness={0.68}
        />
      </mesh>

      {/* Thin cloud veil */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.0025, 64, 64]} />
        <meshStandardMaterial
          map={cloudTex}
          transparent opacity={0.13}
          depthWrite={false}
          roughness={0.85}
        />
      </mesh>
    </>
  );
}

function EarthSphere() {
  const gpuTier = useMemo(() => (typeof window !== "undefined" ? detectGpuTier() : "high"), []);
  const texSet  = useMemo(() => earthTextureSet(gpuTier), [gpuTier]);
  return (
    <Suspense fallback={null}>
      <EarthSphereInner texSet={texSet} />
    </Suspense>
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

// ─── Build 2D skyline geometry (XY plane, Y = surface normal, Z = toward camera) ───
export const SKYW = 0.085;
export const SKYH = 0.120;

export function buildSkylineGeo(prims: Prim[]): { geo: THREE.BufferGeometry; totalW: number; totalH: number } {
  const GAP = 0.014;
  type BEntry = { cx: number; w: number; h: number; k: string; top?: number; steps?: number };
  const buildings: BEntry[] = [];
  let cursor = 0;

  for (const p of prims) {
    let w: number, h: number, top: number | undefined, steps: number | undefined;
    switch (p.k) {
      case "box":     w = p.w * SKYW; h = p.h * SKYH; break;
      case "taper":   w = p.w * SKYW; h = p.h * SKYH; top = p.top ?? 0.3; break;
      case "spire":   w = p.w * SKYW; h = p.h * SKYH; break;
      case "pyramid": w = p.w * SKYW; h = p.h * SKYH; break;
      case "setback": w = p.w * SKYW; h = p.h * SKYH; steps = p.steps ?? 3; break;
      case "dome":    w = p.r * 2.2 * SKYW; h = p.h * SKYH; break;
      default:        w = 0.06; h = 0.10;
    }
    const cx = p.x != null ? p.x * SKYW : cursor + w / 2;
    buildings.push({ cx, w, h, k: p.k, top, steps });
    cursor = Math.max(cursor, cx + w / 2 + GAP);
  }

  // Center based on actual content bounds (handles landmarks with negative x values)
  const xMin = Math.min(...buildings.map(b => b.cx - b.w / 2));
  const xMax = Math.max(...buildings.map(b => b.cx + b.w / 2));
  const totalW = Math.max(xMax - xMin, 0.01);
  const offsetX = -(xMin + xMax) / 2;
  const pts: THREE.Vector3[] = [];

  for (const b of buildings) {
    const x = b.cx + offsetX;
    const { w, h } = b;

    if (b.k === "setback" && b.steps) {
      const sh = h / b.steps;
      let y = 0;
      for (let s = 0; s < b.steps; s++) {
        const f = 1 - (s / b.steps) * 0.55;
        const sw = w * f;
        pts.push(
          new THREE.Vector3(x - sw/2, y,    0), new THREE.Vector3(x - sw/2, y+sh, 0),
          new THREE.Vector3(x - sw/2, y+sh, 0), new THREE.Vector3(x + sw/2, y+sh, 0),
          new THREE.Vector3(x + sw/2, y+sh, 0), new THREE.Vector3(x + sw/2, y,    0),
        );
        y += sh;
      }
      pts.push(new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y + h * 0.25, 0));
    } else if (b.k === "spire" || b.k === "pyramid") {
      pts.push(
        new THREE.Vector3(x - w/2,    0,       0), new THREE.Vector3(x - w/2, h * 0.55, 0),
        new THREE.Vector3(x - w/2,    h * 0.55, 0), new THREE.Vector3(x,      h,        0),
        new THREE.Vector3(x,          h,        0), new THREE.Vector3(x + w/2, h * 0.55, 0),
        new THREE.Vector3(x + w/2,    h * 0.55, 0), new THREE.Vector3(x + w/2, 0,       0),
      );
    } else if (b.k === "dome") {
      const drumH = h * 0.45, r = w / 2;
      pts.push(
        new THREE.Vector3(x - w/2, 0,     0), new THREE.Vector3(x - w/2, drumH, 0),
        new THREE.Vector3(x + w/2, 0,     0), new THREE.Vector3(x + w/2, drumH, 0),
        new THREE.Vector3(x - w/2, drumH, 0), new THREE.Vector3(x + w/2, drumH, 0),
      );
      const arcSteps = 12;
      for (let i = 0; i < arcSteps; i++) {
        const a1 = Math.PI + (i / arcSteps) * Math.PI;
        const a2 = Math.PI + ((i + 1) / arcSteps) * Math.PI;
        pts.push(
          new THREE.Vector3(x + r * Math.cos(a1), drumH - r * Math.sin(a1), 0),
          new THREE.Vector3(x + r * Math.cos(a2), drumH - r * Math.sin(a2), 0),
        );
      }
    } else {
      const topW = b.top ? w * b.top : w;
      pts.push(
        new THREE.Vector3(x - w/2,    0, 0), new THREE.Vector3(x - topW/2, h, 0),
        new THREE.Vector3(x - topW/2, h, 0), new THREE.Vector3(x + topW/2, h, 0),
        new THREE.Vector3(x + topW/2, h, 0), new THREE.Vector3(x + w/2,    0, 0),
      );
    }
  }

  if (buildings.length > 0) {
    pts.push(new THREE.Vector3(-totalW / 2, 0, 0), new THREE.Vector3(totalW / 2, 0, 0));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const totalH = Math.max(...buildings.map(b => b.h), 0.01);
  return { geo, totalW, totalH };
}

// ─── Holographic city — 2D skyline billboard + surface ring ──────────────────
function HoloCity({ spot, index }: { spot: CitySpot; index: number }) {
  const outerRef  = useRef<THREE.Group>(null);
  const scanRef   = useRef<THREE.Mesh>(null);
  const scanRef2  = useRef<THREE.Mesh>(null);
  const pulseT    = useRef(index * 1.17);

  const energy = useMemo(() => {
    const top = spot.scores?.[0]?.planet;
    return top ? (ENERGY_MAP[top] ?? { label: "COSMIC", color: "#4488FF" }) : { label: "COSMIC", color: "#4488FF" };
  }, [spot.scores]);

  const col      = useMemo(() => new THREE.Color(energy.color), [energy.color]);
  // HDR color — boosts all channels so even dark hues hit bloom threshold
  const brightCol = useMemo(() => col.clone().multiplyScalar(3.0), [col]);

  const surfacePos = useMemo(() => ll2xyz(spot.lat, spot.lon, GLOBE_R * 1.004), [spot.lat, spot.lon]);
  const prims = useMemo<Prim[]>(() => {
    const sk = spot.skyline;
    if (sk?.tier === "landmark" && sk.landmark && LANDMARKS[sk.landmark]) return LANDMARKS[sk.landmark];
    const seed = (index * 997 + Math.round(spot.lat * 13) + Math.round(spot.lon * 7)) | 0;
    return proceduralSkyline(sk?.height ?? 1, sk?.density ?? 1, seed);
  }, [spot.skyline, spot.lat, spot.lon, index]);

  const { geo: skylineGeo, totalH } = useMemo(() => buildSkylineGeo(prims), [prims]);

  const scanRingGeo  = useMemo(() => new THREE.RingGeometry(0.030, 0.055, 56), []);
  const groundRingGeo = useMemo(() => new THREE.RingGeometry(0.064, 0.070, 56), []);
  const dotGeo       = useMemo(() => new THREE.CircleGeometry(0.018, 16), []);
  const stemGeo      = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, PLATFORM_H, 0),
  ]), []);

  const scoreVal = spot.scores?.[0]?.influence ?? 0;
  const latStr   = `${Math.abs(spot.lat).toFixed(1)}°${spot.lat >= 0 ? "N" : "S"}`;
  const lonStr   = `${Math.abs(spot.lon).toFixed(1)}°${spot.lon >= 0 ? "E" : "W"}`;

  useFrame(({ camera }, dt) => {
    if (!outerRef.current) return;

    // World position of this city
    const worldPos = new THREE.Vector3();
    outerRef.current.getWorldPosition(worldPos);

    // World-space surface normal (outward from globe centre through city)
    const worldNormal = worldPos.clone().normalize();

    // Visibility — hide if on far hemisphere
    const toCam = camera.position.clone().sub(worldPos);
    if (worldNormal.dot(toCam.clone().normalize()) <= 0.08) {
      outerRef.current.visible = false;
      return;
    }
    outerRef.current.visible = true;

    // Orient so Y = worldNormal, Z = toward camera (tangent-plane component)
    const camDir = toCam.normalize();
    // Remove the component along worldNormal so Z stays tangential
    const zProj = camDir.clone().addScaledVector(worldNormal, -camDir.dot(worldNormal));
    // Guard: camera directly overhead → pick arbitrary tangent
    const zAxis = zProj.lengthSq() > 0.0001 ? zProj.normalize() : new THREE.Vector3(1, 0, 0);
    // X = Y × Z (right-hand rule) — NOT Z × Y which would mirror the skyline
    const xAxis = worldNormal.clone().cross(zAxis).normalize();

    // World-space rotation → local quaternion
    const worldQuat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(xAxis, worldNormal, zAxis)
    );
    const parentQuat = new THREE.Quaternion();
    outerRef.current.parent?.getWorldQuaternion(parentQuat);
    outerRef.current.quaternion.copy(parentQuat.clone().invert().multiply(worldQuat));

    pulseT.current += dt;
    for (const [ref, tOff] of [[scanRef, 0], [scanRef2, 0.5]] as [React.RefObject<THREE.Mesh | null>, number][]) {
      if (ref.current) {
        const phase = ((pulseT.current * 0.50 + tOff) % 1.0);
        const m = ref.current.material as THREE.MeshBasicMaterial;
        m.opacity = Math.max(0, (1 - phase) * 0.85);
        ref.current.scale.setScalar(1 + phase * 2.8);
      }
    }
  });

  return (
    <group ref={outerRef} position={surfacePos}>
      {/* Static outer ground ring — tactical indicator */}
      <mesh geometry={groundRingGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={col} transparent opacity={0.30} depthWrite={false}
          side={THREE.DoubleSide} />
      </mesh>

      {/* Two phase-offset pulsing scan rings */}
      <mesh ref={scanRef} geometry={scanRingGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={brightCol} transparent opacity={0.85} depthWrite={false}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={scanRef2} geometry={scanRingGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={brightCol} transparent opacity={0.85} depthWrite={false}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Surface anchor dot */}
      <mesh geometry={dotGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={brightCol} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Vertical stem — additive so it glows */}
      <lineSegments geometry={stemGeo}>
        <lineBasicMaterial color={brightCol} transparent opacity={0.55}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>

      {/* Holographic skyline — XY plane, Y = surface normal, Z = camera */}
      <group position={[0, PLATFORM_H, 0]}>
        {/* Scale buildings down so they sit proportionally on the globe (not moon-sized) */}
        <group scale={[0.14, 0.14, 1]}>
          <lineSegments geometry={skylineGeo}>
            <lineBasicMaterial color={brightCol} blending={THREE.AdditiveBlending} depthWrite={false} />
          </lineSegments>
        </group>

        <Html position={[0, totalH * 0.14 + 0.04, 0]} center distanceFactor={7} zIndexRange={[10, 0]}>
          <div style={{ pointerEvents: "none", textAlign: "center", lineHeight: 1.25 }}>
            <div style={{
              color: energy.color, fontSize: 10,
              fontFamily: "'Fragment Mono', monospace",
              letterSpacing: "0.18em", fontWeight: 700,
              textShadow: `0 0 16px ${energy.color}EE`,
              background: `${energy.color}18`,
              border: `1px solid ${energy.color}66`,
              borderBottom: "none",
              padding: "3px 8px 1px", whiteSpace: "nowrap",
            }}>
              {spot.city.split(",")[0].toUpperCase()}
            </div>
            <div style={{
              color: energy.color, fontSize: 7,
              fontFamily: "'Fragment Mono', monospace",
              opacity: 0.85, letterSpacing: "0.10em",
              background: `${energy.color}10`,
              border: `1px solid ${energy.color}44`,
              borderTop: "none",
              padding: "1px 8px 2px", whiteSpace: "nowrap",
            }}>
              {PLANET_SYMBOLS[spot.scores[0]?.planet as AstroLinePlanet] ?? "·"}&nbsp;
              {Math.round(scoreVal * 100)}%&nbsp;{energy.label}
            </div>
            <div style={{
              color: energy.color, fontSize: 6,
              fontFamily: "'Fragment Mono', monospace",
              opacity: 0.45, letterSpacing: "0.08em", marginTop: 2,
            }}>
              {latStr} {lonStr}
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
  const bloomIntensity = globeMode === "energy" ? 3.2 : globeMode === "lines" ? 2.8 : globeMode === "cities" ? 2.5 : 2.0;

  return (
    <>
      <ambientLight intensity={0.05} />
      {/* Sun — angled so the terminator line is clearly visible on the rotating globe */}
      <directionalLight position={[5.5, 2.8, 3.0]} intensity={1.15} color="#FFF8F0" />
      {/* Subtle fill from opposite side — just enough to show dark-side geography */}
      <pointLight position={[-4, -2.5, -4]} intensity={0.28} color="#1A3A6A" />

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
