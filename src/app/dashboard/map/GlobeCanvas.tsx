"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import * as THREE from "three";
import type { AstroLine, AstroLinePlanet, AstroLineAngle } from "@/lib/astrology/astrocartography";
import { PLANET_COLORS, PLANET_SYMBOLS } from "@/lib/astrology/astrocartography";

export type GlobeMode = "globe" | "vortex" | "lines" | "planets" | "energy";

const GLOBE_R = 2.0;
const ATMO_R  = 2.12;

const ANGLE_DASH: Record<AstroLineAngle, boolean> = {
  MC: false, IC: true, ASC: false, DSC: true,
};

// ─── Lat/Lon → 3D ─────────────────────────────────────────────────────────────
function ll2xyz(lat: number, lon: number, r = GLOBE_R): THREE.Vector3 {
  const φ = (lat  * Math.PI) / 180;
  const λ = (-lon * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(φ) * Math.cos(λ),
    r * Math.sin(φ),
    r * Math.cos(φ) * Math.sin(λ),
  );
}

// ─── Build line geometry from GeoJSON coordinate arrays ───────────────────────
function buildLineGeo(lines: number[][][], r: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i];
      const [lon2, lat2] = line[i + 1];
      if (Math.abs(lon2 - lon1) > 90) continue;
      pts.push(ll2xyz(lat1, lon1, r), ll2xyz(lat2, lon2, r));
    }
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

// ─── Globe body — no self-rotation (parent group handles it) ──────────────────
function GlobeBody() {
  const [coastGeo,  setCoastGeo]  = useState<THREE.BufferGeometry | null>(null);
  const [borderGeo, setBorderGeo] = useState<THREE.BufferGeometry | null>(null);
  const [stateGeo,  setStateGeo]  = useState<THREE.BufferGeometry | null>(null);
  const [riverGeo,  setRiverGeo]  = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    const load = (url: string, r: number, setter: (g: THREE.BufferGeometry) => void) =>
      fetch(url).then(res => res.json()).then((d: number[][][]) => setter(buildLineGeo(d, r))).catch(() => {});
    load("/geo/coastlines.json", GLOBE_R + 0.005, setCoastGeo);
    load("/geo/borders.json",    GLOBE_R + 0.004, setBorderGeo);
    load("/geo/states.json",     GLOBE_R + 0.003, setStateGeo);
    load("/geo/rivers.json",     GLOBE_R + 0.006, setRiverGeo);
  }, []);

  const gridGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const r = GLOBE_R + 0.001;
    for (let lat = -60; lat <= 60; lat += 30)
      for (let lon = -180; lon <= 180; lon += 2)
        pts.push(ll2xyz(lat, lon, r), ll2xyz(lat, lon + 2, r));
    for (let lon = -180; lon <= 180; lon += 30)
      for (let lat = -88; lat <= 88; lat += 2)
        pts.push(ll2xyz(lat, lon, r), ll2xyz(lat + 2, lon, r));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  return (
    <>
      <mesh>
        <sphereGeometry args={[GLOBE_R, 64, 64]} />
        <meshPhongMaterial color="#020B1A" emissive="#030E22" emissiveIntensity={0.5}
          shininess={60} specular={new THREE.Color(0x112244)} />
      </mesh>
      <lineSegments geometry={gridGeo}>
        <lineBasicMaterial color="#0A1A33" transparent opacity={0.25} />
      </lineSegments>
      {borderGeo && <lineSegments geometry={borderGeo}><lineBasicMaterial color="#2233AA" transparent opacity={0.35} /></lineSegments>}
      {stateGeo  && <lineSegments geometry={stateGeo} ><lineBasicMaterial color="#192866" transparent opacity={0.45} /></lineSegments>}
      {coastGeo  && <lineSegments geometry={coastGeo} ><lineBasicMaterial color="#1A66FF" transparent opacity={0.70} /></lineSegments>}
      {riverGeo  && <lineSegments geometry={riverGeo} ><lineBasicMaterial color="#00AAFF" transparent opacity={0.55} /></lineSegments>}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.004, 32, 32]} />
        <meshPhongMaterial color="#0A2A6A" transparent opacity={0.06} side={THREE.FrontSide} depthWrite={false} />
      </mesh>
    </>
  );
}

// ─── Atmosphere shell (not part of rotating group) ────────────────────────────
function AtmosphereShell() {
  return (
    <mesh>
      <sphereGeometry args={[ATMO_R, 32, 32]} />
      <meshPhongMaterial color="#1A4AFF" transparent opacity={0.045} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

// ─── Astro line — no self-rotation ────────────────────────────────────────────
function AstroLineObject({
  line, color, dashed, opacity, mode,
}: {
  line: AstroLine; color: string; dashed: boolean; opacity: number; mode: GlobeMode;
}) {
  const col = useMemo(() => new THREE.Color(color), [color]);

  // FIELDS mode: glowing energy orbs scattered along the line path
  const orbPositions = useMemo(() => {
    if (mode !== "energy") return null;
    const positions: THREE.Vector3[] = [];
    for (const seg of line.segments) {
      for (let i = 0; i < seg.length; i += 8) {
        positions.push(ll2xyz(seg[i].lat, seg[i].lon, GLOBE_R + 0.018));
      }
    }
    return positions;
  }, [line, mode]);

  if (mode === "energy" && orbPositions) {
    return (
      <>
        {orbPositions.map((pos, i) => {
          const sz = 0.012 + (i % 5) * 0.004;
          const op = 0.5 + (i % 3) * 0.15;
          return (
            <mesh key={i} position={pos} scale={sz}>
              <sphereGeometry args={[1, 4, 4]} />
              <meshBasicMaterial color={col} transparent opacity={op} />
            </mesh>
          );
        })}
      </>
    );
  }

  const tubeRadius  = mode === "lines" ? 0.007 : 0.004;
  const lineOpacity = mode === "lines" ? 1.0 : opacity;

  return (
    <>
      {line.segments.map((seg, si) => {
        if (seg.length < 2) return null;
        const pts   = seg.map(p => ll2xyz(p.lat, p.lon, GLOBE_R + 0.012));
        const curve = new THREE.CatmullRomCurve3(pts, false, "chordal", 0.5);
        const n     = Math.min(pts.length * 6, 300);

        if (dashed) {
          const sampled = curve.getPoints(n);
          const geo = new THREE.BufferGeometry().setFromPoints(
            sampled.filter((_, i) => Math.floor(i / 6) % 2 === 0)
          );
          return (
            <lineSegments key={si} geometry={geo}>
              <lineBasicMaterial color={col} transparent opacity={lineOpacity * 0.8} />
            </lineSegments>
          );
        }

        const tubeGeo = new THREE.TubeGeometry(curve, n, tubeRadius, 4, false);
        return (
          <mesh key={si} geometry={tubeGeo}>
            <meshBasicMaterial color={col} transparent opacity={lineOpacity} />
          </mesh>
        );
      })}
    </>
  );
}

// ─── PLANETS mode: symbol labels at peak point of each MC/ASC line ────────────
function PlanetLabels({ lines }: { lines: AstroLine[] }) {
  const labeled = useMemo(() => {
    const seen = new Set<AstroLinePlanet>();
    const out: { planet: AstroLinePlanet; pos: THREE.Vector3 }[] = [];
    for (const line of lines) {
      if (seen.has(line.planet)) continue;
      if (line.angle !== "MC" && line.angle !== "ASC") continue;
      const allPts = line.segments.flatMap(s => s);
      if (allPts.length === 0) continue;
      const peak = allPts.reduce((a, b) => Math.abs(a.lat) < Math.abs(b.lat) ? b : a);
      out.push({ planet: line.planet, pos: ll2xyz(peak.lat, peak.lon, GLOBE_R + 0.15) });
      seen.add(line.planet);
    }
    return out;
  }, [lines]);

  return (
    <>
      {labeled.map(({ planet, pos }) => (
        <Html key={planet} position={pos} center distanceFactor={6}>
          <div style={{
            color: PLANET_COLORS[planet],
            fontSize: 11,
            fontFamily: "'Fragment Mono', monospace",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            textShadow: `0 0 12px ${PLANET_COLORS[planet]}`,
            background: "rgba(2,8,22,0.6)",
            padding: "2px 5px",
            borderRadius: 4,
          }}>
            {PLANET_SYMBOLS[planet]} {planet}
          </div>
        </Html>
      ))}
    </>
  );
}

// ─── Vortex node — no self-rotation (parent group handles it) ─────────────────
interface VortexNode {
  position: THREE.Vector3;
  lat: number; lon: number;
  lines: { planet: AstroLinePlanet; angle: AstroLineAngle }[];
  power: number; label: string;
}

function VortexNodeObject({ node, onClick }: { node: VortexNode; onClick: (n: VortexNode) => void }) {
  const [hovered, setHovered] = useState(false);

  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const icoRef   = useRef<THREE.Mesh>(null);
  const coreRef  = useRef<THREE.Mesh>(null);
  const glowRef  = useRef<THREE.Mesh>(null);
  const t        = useRef(Math.random() * Math.PI * 2);

  const primaryColor   = useMemo(() => new THREE.Color(PLANET_COLORS[node.lines[0].planet]), [node]);
  const secondaryColor = useMemo(() => new THREE.Color(
    node.lines[1] ? PLANET_COLORS[node.lines[1].planet] : PLANET_COLORS[node.lines[0].planet]
  ), [node]);

  useFrame((_, dt) => {
    t.current += dt;
    const pulse = 0.85 + Math.sin(t.current * 2.2) * 0.18;
    const scale = hovered ? 1.6 : 1.0;

    if (ring1Ref.current) ring1Ref.current.rotation.z += dt * 1.1;
    if (ring2Ref.current) ring2Ref.current.rotation.x += dt * 0.75;
    if (ring3Ref.current) { ring3Ref.current.rotation.y += dt * 0.55; ring3Ref.current.rotation.z -= dt * 0.35; }

    if (icoRef.current) {
      icoRef.current.rotation.x += dt * 0.3;
      icoRef.current.rotation.y += dt * 0.45;
      icoRef.current.scale.setScalar(0.12 * scale * (0.9 + Math.sin(t.current * 1.4 + 0.5) * 0.12));
    }
    if (coreRef.current)  coreRef.current.scale.setScalar(0.042 * pulse * scale);
    if (glowRef.current)  glowRef.current.scale.setScalar(0.18 * (1 + Math.sin(t.current * 1.7) * 0.1) * scale);
  });

  const rs = hovered ? 0.115 : 0.095;

  return (
    <>
      <mesh position={node.position} scale={0.14}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick(node); }}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={glowRef} position={node.position}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={primaryColor} transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <mesh ref={icoRef} position={node.position}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={primaryColor} wireframe transparent opacity={hovered ? 0.5 : 0.28} />
      </mesh>
      <mesh ref={ring1Ref} position={node.position} scale={rs}>
        <torusGeometry args={[1, 0.055, 6, 40]} />
        <meshBasicMaterial color={primaryColor} transparent opacity={0.75} />
      </mesh>
      <mesh ref={ring2Ref} position={node.position} rotation={[Math.PI / 2.2, 0.3, 0]} scale={rs * 0.88}>
        <torusGeometry args={[1, 0.04, 5, 36]} />
        <meshBasicMaterial color={secondaryColor} transparent opacity={0.6} />
      </mesh>
      <mesh ref={ring3Ref} position={node.position} rotation={[Math.PI / 4, Math.PI / 3, 0]} scale={rs * 0.72}>
        <torusGeometry args={[1, 0.028, 4, 28]} />
        <meshBasicMaterial color={primaryColor} transparent opacity={0.45} />
      </mesh>
      <mesh ref={coreRef} position={node.position}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color={primaryColor} transparent opacity={0.95} />
      </mesh>
    </>
  );
}

// ─── Click raycasting ──────────────────────────────────────────────────────────
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

    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), GLOBE_R);
    const target = new THREE.Vector3();
    if (!ray.ray.intersectSphere(sphere, target)) return;

    const angle = globeGroupRef.current?.rotation.y ?? 0;
    const cosA = Math.cos(-angle), sinA = Math.sin(-angle);
    const rx =  target.x * cosA + target.z * sinA;
    const ry =  target.y;
    const rz = -target.x * sinA + target.z * cosA;

    const lat = (Math.asin(ry / GLOBE_R) * 180) / Math.PI;
    const lon = -(Math.atan2(rz, rx) * 180) / Math.PI;
    onGlobeClick(lat, lon);
  }, [camera, gl, onGlobeClick, globeGroupRef]);

  useEffect(() => {
    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [gl, handleClick]);

  return null;
}

// ─── Vortex node computation ───────────────────────────────────────────────────
function computeVortexNodes(lines: AstroLine[]): VortexNode[] {
  type Sample = { planet: AstroLinePlanet; angle: AstroLineAngle; lat: number; lon: number };
  const samples: Sample[] = [];
  for (const line of lines)
    for (const seg of line.segments)
      for (const pt of seg)
        samples.push({ planet: line.planet, angle: line.angle, lat: pt.lat, lon: pt.lon });

  const nodes: VortexNode[] = [];
  const seen = new Set<string>();
  const PROX = 8;

  for (let i = 0; i < samples.length; i += 3) {
    const a = samples[i];
    for (let j = i + 1; j < samples.length; j += 3) {
      const b = samples[j];
      if (a.planet === b.planet) continue;
      const dLon = Math.abs(a.lon - b.lon);
      const dist = Math.sqrt(
        Math.min(dLon, 360 - dLon) ** 2 * Math.cos((a.lat * Math.PI) / 180) ** 2 + (a.lat - b.lat) ** 2
      );
      if (dist > PROX) continue;
      const lat = (a.lat + b.lat) / 2;
      const lon = (a.lon + b.lon) / 2;
      const key = `${Math.round(lat)},${Math.round(lon)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const power = Math.round(
        60 + 34 * (1 - dist / PROX) *
        ([a.planet, b.planet].includes("Jupiter") || [a.planet, b.planet].includes("Sun") ? 1.15 : 1)
      );
      nodes.push({
        position: ll2xyz(lat, lon, GLOBE_R + 0.04),
        lat, lon,
        lines: [{ planet: a.planet, angle: a.angle }, { planet: b.planet, angle: b.angle }],
        power,
        label: `${a.planet} ${a.angle} × ${b.planet} ${b.angle}`,
      });
    }
  }
  return nodes.sort((a, b) => b.power - a.power).slice(0, 12);
}

// ─── Main scene ────────────────────────────────────────────────────────────────
function Scene({
  lines, activePlanets, activeAngles, globeMode,
  onLocationClick, onVortexClick,
}: {
  lines:           AstroLine[];
  activePlanets:   Set<AstroLinePlanet>;
  activeAngles:    Set<AstroLineAngle>;
  globeMode:       GlobeMode;
  onLocationClick: (lat: number, lon: number) => void;
  onVortexClick:   (node: VortexNode) => void;
}) {
  // ── Single rotating group — everything geo goes here ──────────────────────
  const globeGroupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (globeGroupRef.current) globeGroupRef.current.rotation.y += dt * 0.015; });

  const showVortexes = globeMode === "vortex";

  // LINES mode ignores planet toggle and shows everything
  const visibleLines = useMemo(() => {
    if (globeMode === "lines") return lines.filter(l => activeAngles.has(l.angle));
    return lines.filter(l => activePlanets.has(l.planet) && activeAngles.has(l.angle));
  }, [lines, activePlanets, activeAngles, globeMode]);

  const lineOpacity = globeMode === "vortex" ? 0.3 : 0.88;

  const vortexNodes = useMemo(
    () => showVortexes ? computeVortexNodes(lines.filter(l => activePlanets.has(l.planet))) : [],
    [lines, activePlanets, showVortexes],
  );

  const bloomIntensity = globeMode === "energy" ? 2.2 : globeMode === "lines" ? 1.8 : 1.4;

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={0.6} color="#446699" />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#2244AA" />

      {/* ── All geography + lines in one rotating group ── */}
      <group ref={globeGroupRef}>
        <GlobeBody />

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

        {globeMode === "planets" && <PlanetLabels lines={visibleLines} />}

        {showVortexes && vortexNodes.map((node, i) => (
          <VortexNodeObject key={i} node={node} onClick={onVortexClick} />
        ))}
      </group>

      <AtmosphereShell />

      <GlobeClickHandler onGlobeClick={onLocationClick} globeGroupRef={globeGroupRef} />

      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={9}
        rotateSpeed={0.4} autoRotate={false} enableDamping dampingFactor={0.05} />

      <EffectComposer>
        <Bloom
          blendFunction={BlendFunction.ADD}
          intensity={bloomIntensity}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.6}
          radius={0.85}
        />
      </EffectComposer>
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export interface VortexNodePublic extends VortexNode {}

export default function GlobeCanvas({
  lines, activePlanets, activeAngles, globeMode, onLocationClick, onVortexClick,
}: {
  lines:           AstroLine[];
  activePlanets:   Set<AstroLinePlanet>;
  activeAngles:    Set<AstroLineAngle>;
  globeMode:       GlobeMode;
  onLocationClick: (lat: number, lon: number) => void;
  onVortexClick:   (node: VortexNodePublic) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 1.5, 6], fov: 45 }} gl={{ antialias: true, alpha: false }} style={{ background: "#050816" }}>
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#050816", 18, 40]} />
      <Scene
        lines={lines}
        activePlanets={activePlanets}
        activeAngles={activeAngles}
        globeMode={globeMode}
        onLocationClick={onLocationClick}
        onVortexClick={onVortexClick}
      />
    </Canvas>
  );
}
