"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Sphere as DreiSphere } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import * as THREE from "three";
import type { AstroLine, AstroLinePlanet, AstroLineAngle, LatLon } from "@/lib/astrology/astrocartography";
import { PLANET_COLORS, PLANET_SYMBOLS, ASTRO_PLANETS } from "@/lib/astrology/astrocartography";

// ─── Constants ─────────────────────────────────────────────────────────────────
const GLOBE_R = 2.0;
const ATMO_R  = 2.12;

const ANGLE_DASH: Record<AstroLineAngle, boolean> = {
  MC: false, IC: true, ASC: false, DSC: true,
};

// ─── Lat/Lon → 3D ─────────────────────────────────────────────────────────────
function ll2xyz(lat: number, lon: number, r = GLOBE_R): THREE.Vector3 {
  const φ = (lat  * Math.PI) / 180;
  const λ = (-lon * Math.PI) / 180; // flip lon so east is east
  return new THREE.Vector3(
    r * Math.cos(φ) * Math.cos(λ),
    r * Math.sin(φ),
    r * Math.cos(φ) * Math.sin(λ),
  );
}

// ─── Globe body ────────────────────────────────────────────────────────────────
function GlobeBody() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (meshRef.current) meshRef.current.rotation.y += dt * 0.015; });

  const gridLines = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const r = GLOBE_R + 0.001;
    // latitude rings every 30°
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = -180; lon <= 180; lon += 2) {
        pts.push(ll2xyz(lat, lon, r), ll2xyz(lat, lon + 2, r));
      }
    }
    // longitude meridians every 30°
    for (let lon = -180; lon <= 180; lon += 30) {
      for (let lat = -88; lat <= 88; lat += 2) {
        pts.push(ll2xyz(lat, lon, r), ll2xyz(lat + 2, lon, r));
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return geo;
  }, []);

  return (
    <group ref={meshRef}>
      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_R, 64, 64]} />
        <meshPhongMaterial
          color="#020918"
          emissive="#041230"
          emissiveIntensity={0.4}
          shininess={80}
          specular={new THREE.Color(0x224488)}
        />
      </mesh>
      {/* Grid overlay */}
      <lineSegments geometry={gridLines}>
        <lineBasicMaterial color="#1A3A6A" transparent opacity={0.22} />
      </lineSegments>
      {/* Atmosphere inner glow */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.003, 32, 32]} />
        <meshPhongMaterial
          color="#0A2A6A"
          transparent
          opacity={0.07}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Atmosphere shell ─────────────────────────────────────────────────────────
function AtmosphereShell() {
  return (
    <mesh>
      <sphereGeometry args={[ATMO_R, 32, 32]} />
      <meshPhongMaterial
        color="#1A4AFF"
        transparent
        opacity={0.045}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── A single astrocartography line ───────────────────────────────────────────
function AstroLineObject({
  line,
  color,
  dashed,
  opacity,
}: {
  line: AstroLine;
  color: string;
  dashed: boolean;
  opacity: number;
}) {
  const meshRef = useRef<THREE.Group>(null);

  // Sync rotation with globe body (both rotate at same rate)
  useFrame((_, dt) => { if (meshRef.current) meshRef.current.rotation.y += dt * 0.015; });

  const col = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group ref={meshRef}>
      {line.segments.map((seg, si) => {
        if (seg.length < 2) return null;
        const pts = seg.map(p => ll2xyz(p.lat, p.lon, GLOBE_R + 0.012));
        const curve = new THREE.CatmullRomCurve3(pts, false, "chordal", 0.5);
        const numPts = Math.min(pts.length * 6, 300);

        if (dashed) {
          // Dashed → use plain line with gap simulation
          const sampledPts = curve.getPoints(numPts);
          const geo = new THREE.BufferGeometry().setFromPoints(
            sampledPts.filter((_, i) => Math.floor(i / 6) % 2 === 0)
          );
          return (
            <lineSegments key={si} geometry={geo}>
              <lineBasicMaterial color={col} transparent opacity={opacity * 0.8} linewidth={1} />
            </lineSegments>
          );
        }

        const tubeGeo = new THREE.TubeGeometry(curve, numPts, 0.004, 4, false);
        return (
          <mesh key={si} geometry={tubeGeo}>
            <meshBasicMaterial color={col} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Vortex node (line intersection) ─────────────────────────────────────────
interface VortexNode {
  position: THREE.Vector3;
  lat: number;
  lon: number;
  lines: { planet: AstroLinePlanet; angle: AstroLineAngle }[];
  power: number;
  label: string;
}

function VortexNodeObject({ node, onClick }: { node: VortexNode; onClick: (n: VortexNode) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const rot = useRef(0);

  useFrame((_, dt) => {
    rot.current += dt * 1.8;
    if (meshRef.current) {
      const s = hovered ? 1.4 : 1 + Math.sin(rot.current) * 0.15;
      meshRef.current.scale.setScalar(s * 0.055);
    }
  });

  // Sync with globe rotation
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (groupRef.current) groupRef.current.rotation.y += dt * 0.015; });

  const primaryColor = PLANET_COLORS[node.lines[0].planet];

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        position={node.position}
        scale={0.055}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick(node); }}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={primaryColor} transparent opacity={0.9} />
      </mesh>
      {/* Outer ring */}
      <mesh position={node.position} scale={0.09}>
        <torusGeometry args={[1, 0.15, 4, 24]} />
        <meshBasicMaterial color={primaryColor} transparent opacity={hovered ? 0.6 : 0.3} wireframe />
      </mesh>
    </group>
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
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x, y), camera);

    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), GLOBE_R);
    const target = new THREE.Vector3();
    if (!ray.ray.intersectSphere(sphere, target)) return;

    // Account for globe rotation
    const angle = globeGroupRef.current?.rotation.y ?? 0;
    const cosA = Math.cos(-angle);
    const sinA = Math.sin(-angle);
    const rx = target.x * cosA + target.z * sinA;
    const ry = target.y;
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

// ─── Compute vortex nodes from line intersections ─────────────────────────────
function computeVortexNodes(lines: AstroLine[]): VortexNode[] {
  const nodes: VortexNode[] = [];
  const PROXIMITY = 8; // degrees

  // Sample all line points
  type Sample = { planet: AstroLinePlanet; angle: AstroLineAngle; lat: number; lon: number };
  const samples: Sample[] = [];
  for (const line of lines) {
    for (const seg of line.segments) {
      for (const pt of seg) {
        samples.push({ planet: line.planet, angle: line.angle, lat: pt.lat, lon: pt.lon });
      }
    }
  }

  const seen = new Set<string>();
  for (let i = 0; i < samples.length; i += 3) {
    const a = samples[i];
    for (let j = i + 1; j < samples.length; j += 3) {
      const b = samples[j];
      if (a.planet === b.planet) continue;
      const dLon = Math.abs(a.lon - b.lon);
      const dist = Math.sqrt(
        Math.min(dLon, 360 - dLon) ** 2 * Math.cos((a.lat * Math.PI) / 180) ** 2 +
        (a.lat - b.lat) ** 2
      );
      if (dist > PROXIMITY) continue;

      const lat = (a.lat + b.lat) / 2;
      const lon = (a.lon + b.lon) / 2;
      const key = `${Math.round(lat)},${Math.round(lon)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const power = Math.round(
        60 + 34 * (1 - dist / PROXIMITY) *
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
  lines,
  activePlanets,
  activeAngles,
  showVortexes,
  onLocationClick,
  onVortexClick,
}: {
  lines: AstroLine[];
  activePlanets: Set<AstroLinePlanet>;
  activeAngles:  Set<AstroLineAngle>;
  showVortexes:  boolean;
  onLocationClick: (lat: number, lon: number) => void;
  onVortexClick:   (node: VortexNode) => void;
}) {
  const globeRef = useRef<THREE.Group>(null);

  const visibleLines = useMemo(
    () => lines.filter(l => activePlanets.has(l.planet) && activeAngles.has(l.angle)),
    [lines, activePlanets, activeAngles],
  );

  const vortexNodes = useMemo(
    () => showVortexes ? computeVortexNodes(lines.filter(l => activePlanets.has(l.planet))) : [],
    [lines, activePlanets, showVortexes],
  );

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={0.6} color="#446699" />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#2244AA" />

      <GlobeBody />
      <AtmosphereShell />

      {visibleLines.map(line => (
        <AstroLineObject
          key={`${line.planet}-${line.angle}`}
          line={line}
          color={PLANET_COLORS[line.planet]}
          dashed={ANGLE_DASH[line.angle]}
          opacity={0.88}
        />
      ))}

      {showVortexes && vortexNodes.map((node, i) => (
        <VortexNodeObject key={i} node={node} onClick={onVortexClick} />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={3.5}
        maxDistance={9}
        rotateSpeed={0.4}
        autoRotate={false}
        enableDamping
        dampingFactor={0.05}
      />

      <EffectComposer>
        <Bloom
          blendFunction={BlendFunction.ADD}
          intensity={1.4}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.6}
          radius={0.85}
        />
      </EffectComposer>
    </>
  );
}

// ─── Public export: the full canvas ──────────────────────────────────────────
export interface VortexNodePublic extends VortexNode {}

export default function GlobeCanvas({
  lines,
  activePlanets,
  activeAngles,
  showVortexes,
  onLocationClick,
  onVortexClick,
}: {
  lines:           AstroLine[];
  activePlanets:   Set<AstroLinePlanet>;
  activeAngles:    Set<AstroLineAngle>;
  showVortexes:    boolean;
  onLocationClick: (lat: number, lon: number) => void;
  onVortexClick:   (node: VortexNodePublic) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 6], fov: 45 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#050816" }}
    >
      <color attach="background" args={["#050816"]} />
      <fog attach="fog" args={["#050816", 18, 40]} />
      <Scene
        lines={lines}
        activePlanets={activePlanets}
        activeAngles={activeAngles}
        showVortexes={showVortexes}
        onLocationClick={onLocationClick}
        onVortexClick={onVortexClick}
      />
    </Canvas>
  );
}
