"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import * as THREE from "three";
import type { AstroLine, AstroLinePlanet, AstroLineAngle, LocationScore } from "@/lib/astrology/astrocartography";
import { PLANET_COLORS, PLANET_SYMBOLS, scoreLocation } from "@/lib/astrology/astrocartography";

export type GlobeMode = "globe" | "cities" | "lines" | "planets" | "energy";

export type CitySpot = {
  city: string; lat: number; lon: number;
  scores: LocationScore[]; power: number;
};

const GLOBE_R = 2.0;
const ATMO_R  = 2.12;

const ANGLE_DASH: Record<AstroLineAngle, boolean> = { MC: false, IC: true, ASC: false, DSC: true };

const ENERGY_MAP: Record<AstroLinePlanet, { label: string; color: string }> = {
  Sun:     { label: "CAREER",         color: "#4488FF" },
  Mercury: { label: "CAREER",         color: "#4488FF" },
  Saturn:  { label: "CAREER",         color: "#6688CC" },
  Moon:    { label: "LOVE",           color: "#FF71D1" },
  Venus:   { label: "LOVE",           color: "#FF88CC" },
  Jupiter: { label: "WEALTH",         color: "#FFD700" },
  Mars:    { label: "TRANSFORMATION", color: "#FF4444" },
  Uranus:  { label: "CREATIVITY",     color: "#B06AFF" },
  Neptune: { label: "SPIRITUALITY",   color: "#2DFFB3" },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function ll2xyz(lat: number, lon: number, r = GLOBE_R): THREE.Vector3 {
  const φ = (lat  * Math.PI) / 180;
  const λ = (-lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(φ) * Math.cos(λ), r * Math.sin(φ), r * Math.cos(φ) * Math.sin(λ));
}

function seededRand(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
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

// ─── Dot-matrix globe surface ─────────────────────────────────────────────────
function DotSurface() {
  const geo = useMemo(() => {
    const N = 5500;
    const pos = new Float32Array(N * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const R = GLOBE_R + 0.007;
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const θ = golden * i;
      pos[i * 3]     = R * r * Math.cos(θ);
      pos[i * 3 + 1] = R * y;
      pos[i * 3 + 2] = R * r * Math.sin(θ);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.009} color="#1E6AFF" transparent opacity={0.38} sizeAttenuation />
    </points>
  );
}

// ─── Geo layers ───────────────────────────────────────────────────────────────
function GeoLines() {
  const [coastGeo,  setCoastGeo]  = useState<THREE.BufferGeometry | null>(null);
  const [borderGeo, setBorderGeo] = useState<THREE.BufferGeometry | null>(null);
  const [stateGeo,  setStateGeo]  = useState<THREE.BufferGeometry | null>(null);
  const [riverGeo,  setRiverGeo]  = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const load = (url: string, r: number, set: (g: THREE.BufferGeometry) => void) =>
      fetch(url).then(res => res.json()).then((d: number[][][]) => set(buildLineGeo(d, r))).catch(() => {});
    load("/geo/coastlines.json", GLOBE_R + 0.005, setCoastGeo);
    load("/geo/borders.json",    GLOBE_R + 0.004, setBorderGeo);
    load("/geo/states.json",     GLOBE_R + 0.003, setStateGeo);
    load("/geo/rivers.json",     GLOBE_R + 0.006, setRiverGeo);
  }, []);

  return (
    <>
      {borderGeo && <lineSegments geometry={borderGeo}><lineBasicMaterial color="#1A2A88" transparent opacity={0.30} /></lineSegments>}
      {stateGeo  && <lineSegments geometry={stateGeo} ><lineBasicMaterial color="#111E66" transparent opacity={0.38} /></lineSegments>}
      {coastGeo  && <lineSegments geometry={coastGeo} ><lineBasicMaterial color="#1A5EFF" transparent opacity={0.65} /></lineSegments>}
      {riverGeo  && <lineSegments geometry={riverGeo} ><lineBasicMaterial color="#0099EE" transparent opacity={0.50} /></lineSegments>}
    </>
  );
}

// ─── Orbital decorative rings ─────────────────────────────────────────────────
const RING_DEFS = [
  { tilt: [0.22, 0, 0.4],   speed:  0.07, r: GLOBE_R * 1.38, color: "#1A44BB", nodes: 3 },
  { tilt: [0.55, 0.6, 0],   speed: -0.05, r: GLOBE_R * 1.52, color: "#0A3080", nodes: 2 },
  { tilt: [1.1,  0.2, 0.9], speed:  0.11, r: GLOBE_R * 1.28, color: "#1155EE", nodes: 4 },
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
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </mesh>
      {angles.map((a, i) => (
        <mesh key={i} position={[r * Math.cos(a), 0, r * Math.sin(a)]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function OrbitalRings() {
  return <>{RING_DEFS.map((d, i) => <OrbitalRing key={i} {...d} />)}</>;
}

// ─── Energy heatmap — particle field colored by closest planet line ────────────
function EnergyHeatmap({ lines }: { lines: AstroLine[] }) {
  const geo = useMemo(() => {
    if (!lines.length) return null;
    const pos: number[] = [], col: number[] = [];
    const R = GLOBE_R + 0.01;
    for (let lat = -80; lat <= 80; lat += 5) {
      for (let lon = -175; lon <= 175; lon += 5) {
        const scores = scoreLocation(lines, lat, lon);
        if (!scores.length || scores[0].influence < 0.12) continue;
        const p = ll2xyz(lat, lon, R);
        pos.push(p.x, p.y, p.z);
        const c = new THREE.Color(PLANET_COLORS[scores[0].planet]);
        const v = Math.min(scores[0].influence * 1.2, 1.0);
        col.push(c.r * v, c.g * v, c.b * v);
      }
    }
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [lines]);

  // Plasma blobs: one per top-scored spot
  const blobGeos = useMemo(() => {
    if (!lines.length) return [];
    const spots = [
      { lat: 34.0, lon: -118.2 }, { lat: 41.4, lon: 2.2 },   { lat: -8.3, lon: 115.1 },
      { lat: 35.7, lon: 139.7 }, { lat: 48.9, lon: 2.4 },    { lat: -33.9, lon: 18.4 },
      { lat: -22.9, lon: -43.2 }, { lat: 64.1, lon: -21.9 },
      { lat: 51.5, lon: -0.1 }, { lat: 1.3, lon: 103.8 },
      { lat: 19.4, lon: -99.1 }, { lat: 37.6, lon: -122.4 },
    ];
    return spots.map(s => {
      const scores = scoreLocation(lines, s.lat, s.lon);
      if (!scores.length || scores[0].influence < 0.15) return null;
      return { pos: ll2xyz(s.lat, s.lon, GLOBE_R + 0.012), color: PLANET_COLORS[scores[0].planet], strength: scores[0].influence };
    }).filter(Boolean) as { pos: THREE.Vector3; color: string; strength: number }[];
  }, [lines]);

  if (!geo && !blobGeos.length) return null;

  return (
    <>
      {geo && (
        <points geometry={geo}>
          <pointsMaterial size={0.06} vertexColors transparent opacity={0.65} sizeAttenuation />
        </points>
      )}
      {blobGeos.map((b, i) => (
        <mesh key={i} position={b.pos} scale={0.06 + b.strength * 0.12}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={b.color} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// ─── Holographic city skyline ─────────────────────────────────────────────────
function CityBuilding({ x, z, w, d, h, color }: { x: number; z: number; w: number; d: number; h: number; color: THREE.Color }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), [w, h, d]);
  return (
    <lineSegments geometry={edges} position={[x, h / 2, z]}>
      <lineBasicMaterial color={color} transparent opacity={0.75} />
    </lineSegments>
  );
}

function CityProjection({ spot, index }: { spot: CitySpot; index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const riseT    = useRef(0);

  const energy = useMemo(() => {
    const top = spot.scores[0]?.planet;
    return top ? (ENERGY_MAP[top] ?? { label: "COSMIC", color: "#4488FF" }) : { label: "COSMIC", color: "#4488FF" };
  }, [spot.scores]);

  const col = useMemo(() => new THREE.Color(energy.color), [energy.color]);

  const position = useMemo(() => ll2xyz(spot.lat, spot.lon, GLOBE_R), [spot.lat, spot.lon]);

  const quaternion = useMemo(() => {
    const normal = ll2xyz(spot.lat, spot.lon, 1).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [spot.lat, spot.lon]);

  const buildings = useMemo(() => {
    const rand = seededRand(index * 997 + Math.round(spot.lat * 10) + Math.round(spot.lon * 10));
    const scale = 0.5 + (spot.power / 99) * 0.5;
    // Grid layout: 4 rows × 4 cols, skip extreme corners
    const layout: { x: number; z: number }[] = [];
    for (let i = -2; i <= 1; i++)
      for (let j = -2; j <= 1; j++) {
        if (Math.abs(i) + Math.abs(j) >= 4) continue;
        layout.push({ x: i * 0.038 + (rand() - 0.5) * 0.01, z: j * 0.038 + (rand() - 0.5) * 0.01 });
      }
    return layout.map(({ x, z }) => ({
      x, z,
      w: 0.018 + rand() * 0.022,
      d: 0.018 + rand() * 0.022,
      h: 0.022 + Math.pow(rand(), 1.4) * 0.28 * scale,
    }));
  }, [index, spot.power, spot.lat, spot.lon]);

  const maxH = useMemo(() => Math.max(...buildings.map(b => b.h)), [buildings]);

  // Base platform
  const platformEdges = useMemo(() =>
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.22, 0.004, 0.22)), []);

  // Rise animation
  useFrame((_, dt) => {
    riseT.current = Math.min(riseT.current + dt * 1.1, 1.0);
    if (groupRef.current) groupRef.current.scale.y = riseT.current;
  });

  return (
    <group ref={groupRef} position={position} quaternion={quaternion}>
      {/* Street-level base grid */}
      <lineSegments geometry={platformEdges} position={[0, 0.002, 0]}>
        <lineBasicMaterial color={col} transparent opacity={0.3} />
      </lineSegments>
      {/* Buildings */}
      {buildings.map((b, i) => (
        <CityBuilding key={i} {...b} color={col} />
      ))}
      {/* Data readout label — floats above tallest building */}
      <Html position={[0, maxH + 0.12, 0]} center distanceFactor={7} zIndexRange={[10, 0]}>
        <div style={{ pointerEvents: "none", textAlign: "center", lineHeight: 1.4 }}>
          <div style={{
            color: energy.color,
            fontSize: 9.5,
            fontFamily: "'Fragment Mono', monospace",
            letterSpacing: "0.18em",
            fontWeight: 700,
            textShadow: `0 0 10px ${energy.color}`,
          }}>
            {spot.city.split(",")[0].toUpperCase()}
          </div>
          <div style={{
            color: energy.color,
            fontSize: 7.5,
            fontFamily: "'Fragment Mono', monospace",
            opacity: 0.75,
            letterSpacing: "0.1em",
          }}>
            {energy.label}
          </div>
          <div style={{
            color: "#4466AA",
            fontSize: 7,
            fontFamily: "'Fragment Mono', monospace",
            letterSpacing: "0.08em",
            marginTop: 1,
          }}>
            {Math.abs(spot.lat).toFixed(1)}°{spot.lat >= 0 ? "N" : "S"} {Math.abs(spot.lon).toFixed(1)}°{spot.lon >= 0 ? "E" : "W"}
          </div>
          <div style={{
            color: energy.color,
            fontSize: 7,
            fontFamily: "'Fragment Mono', monospace",
            opacity: 0.6,
            marginTop: 2,
          }}>
            {"▮".repeat(Math.round(spot.power / 20))} {spot.power}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── Astro line ───────────────────────────────────────────────────────────────
function AstroLineObject({ line, color, dashed, opacity, mode }: {
  line: AstroLine; color: string; dashed: boolean; opacity: number; mode: GlobeMode;
}) {
  const col = useMemo(() => new THREE.Color(color), [color]);
  const tubeR = mode === "lines" ? 0.007 : 0.004;

  return (
    <>
      {line.segments.map((seg, si) => {
        if (seg.length < 2) return null;
        const pts   = seg.map(p => ll2xyz(p.lat, p.lon, GLOBE_R + 0.012));
        const curve = new THREE.CatmullRomCurve3(pts, false, "chordal", 0.5);
        const n     = Math.min(pts.length * 6, 300);

        if (dashed) {
          const geo = new THREE.BufferGeometry().setFromPoints(
            curve.getPoints(n).filter((_, i) => Math.floor(i / 6) % 2 === 0)
          );
          return <lineSegments key={si} geometry={geo}><lineBasicMaterial color={col} transparent opacity={opacity * 0.8} /></lineSegments>;
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

// ─── Planet labels (PLANETS mode) ────────────────────────────────────────────
function PlanetLabels({ lines }: { lines: AstroLine[] }) {
  const items = useMemo(() => {
    const seen = new Set<AstroLinePlanet>();
    const out: { planet: AstroLinePlanet; pos: THREE.Vector3 }[] = [];
    for (const line of lines) {
      if (seen.has(line.planet) || (line.angle !== "MC" && line.angle !== "ASC")) continue;
      const all = line.segments.flatMap(s => s);
      if (!all.length) continue;
      const peak = all.reduce((a, b) => Math.abs(a.lat) < Math.abs(b.lat) ? b : a);
      out.push({ planet: line.planet, pos: ll2xyz(peak.lat, peak.lon, GLOBE_R + 0.15) });
      seen.add(line.planet);
    }
    return out;
  }, [lines]);

  return (
    <>
      {items.map(({ planet, pos }) => (
        <Html key={planet} position={pos} center distanceFactor={6} zIndexRange={[10, 0]}>
          <div style={{
            color: PLANET_COLORS[planet], fontSize: 11, fontFamily: "'Fragment Mono', monospace",
            letterSpacing: "0.08em", whiteSpace: "nowrap", pointerEvents: "none",
            textShadow: `0 0 12px ${PLANET_COLORS[planet]}`,
            background: "rgba(2,8,22,0.55)", padding: "2px 6px", borderRadius: 4,
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
    onGlobeClick((Math.asin(ry / GLOBE_R) * 180) / Math.PI, -(Math.atan2(rz, rx) * 180) / Math.PI);
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
}: {
  lines: AstroLine[]; activePlanets: Set<AstroLinePlanet>; activeAngles: Set<AstroLineAngle>;
  globeMode: GlobeMode; topSpots: CitySpot[];
  onLocationClick: (lat: number, lon: number) => void;
  onVortexClick: (node: unknown) => void;
}) {
  const globeGroupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (globeGroupRef.current) globeGroupRef.current.rotation.y += dt * 0.015; });

  const visibleLines = useMemo(() => {
    if (globeMode === "lines") return lines.filter(l => activeAngles.has(l.angle));
    return lines.filter(l => activePlanets.has(l.planet) && activeAngles.has(l.angle));
  }, [lines, activePlanets, activeAngles, globeMode]);

  const lineOpacity = globeMode === "cities" ? 0.25 : 0.85;
  const bloomIntensity = globeMode === "energy" ? 2.4 : globeMode === "lines" ? 2.0 : globeMode === "cities" ? 1.8 : 1.4;

  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={[5, 3, 5]} intensity={0.5} color="#3355AA" />
      <pointLight position={[-5, -3, -5]} intensity={0.25} color="#1133AA" />

      {/* Decorative orbital rings — outside globe rotation */}
      <OrbitalRings />

      {/* Atmosphere halo — outside globe rotation */}
      <mesh>
        <sphereGeometry args={[ATMO_R, 32, 32]} />
        <meshPhongMaterial color="#1A4AFF" transparent opacity={0.04} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/* ── Everything geo: single rotating group ── */}
      <group ref={globeGroupRef}>
        {/* Dark ocean sphere */}
        <mesh>
          <sphereGeometry args={[GLOBE_R, 64, 64]} />
          <meshPhongMaterial color="#010810" emissive="#020C1E" emissiveIntensity={0.6}
            shininess={40} specular={new THREE.Color(0x0A1A44)} />
        </mesh>

        {/* Dot-matrix surface */}
        <DotSurface />

        {/* Geography lines */}
        <GeoLines />

        {/* Subtle inner glow */}
        <mesh>
          <sphereGeometry args={[GLOBE_R * 1.004, 32, 32]} />
          <meshPhongMaterial color="#0A2A6A" transparent opacity={0.05} side={THREE.FrontSide} depthWrite={false} />
        </mesh>

        {/* Energy heatmap — FIELDS mode */}
        {globeMode === "energy" && <EnergyHeatmap lines={visibleLines} />}

        {/* Astro lines */}
        {visibleLines.map(line => (
          <AstroLineObject
            key={`${line.planet}-${line.angle}`}
            line={line}
            color={PLANET_COLORS[line.planet]}
            dashed={globeMode === "lines" ? false : ANGLE_DASH[line.angle]}
            opacity={lineOpacity}
            mode={globeMode}
          />
        ))}

        {/* Planet labels — PLANETS mode */}
        {globeMode === "planets" && <PlanetLabels lines={visibleLines} />}

        {/* Holographic city projections — CITIES mode */}
        {globeMode === "cities" && topSpots.map((spot, i) => (
          <CityProjection key={spot.city} spot={spot} index={i} />
        ))}
      </group>

      <GlobeClickHandler onGlobeClick={onLocationClick} globeGroupRef={globeGroupRef} />

      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={9}
        rotateSpeed={0.4} autoRotate={false} enableDamping dampingFactor={0.05} />

      <EffectComposer>
        <Bloom blendFunction={BlendFunction.ADD} intensity={bloomIntensity}
          luminanceThreshold={0.08} luminanceSmoothing={0.6} radius={0.9} />
      </EffectComposer>
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export interface VortexNodePublic { lat: number; lon: number; lines: { planet: AstroLinePlanet; angle: AstroLineAngle }[]; power: number; label: string; }

export default function GlobeCanvas({
  lines, activePlanets, activeAngles, globeMode, topSpots, onLocationClick, onVortexClick,
}: {
  lines: AstroLine[]; activePlanets: Set<AstroLinePlanet>; activeAngles: Set<AstroLineAngle>;
  globeMode: GlobeMode; topSpots: CitySpot[];
  onLocationClick: (lat: number, lon: number) => void;
  onVortexClick: (node: unknown) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 1.5, 6], fov: 45 }} gl={{ antialias: true, alpha: false }} style={{ background: "#010810" }}>
      <color attach="background" args={["#010810"]} />
      <fog attach="fog" args={["#010810", 20, 45]} />
      <Scene lines={lines} activePlanets={activePlanets} activeAngles={activeAngles}
        globeMode={globeMode} topSpots={topSpots}
        onLocationClick={onLocationClick} onVortexClick={onVortexClick} />
    </Canvas>
  );
}
