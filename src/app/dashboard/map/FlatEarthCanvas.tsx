"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import * as THREE from "three";

import type { AstroLine, AstroLinePlanet, AstroLineAngle } from "@/lib/astrology/astrocartography";
import { PLANET_COLORS, PLANET_SYMBOLS } from "@/lib/astrology/astrocartography";
import type { CitySpot } from "./GlobeCanvas";

// ─── Constants ────────────────────────────────────────────────────────────────
const DISC_R = 2.2;
const Y0     = 0.006; // elevation above disc face

const PLANET_KEYWORDS: Record<AstroLinePlanet, string> = {
  Sun: "VITALITY", Moon: "EMOTIONS", Mercury: "COMMUNICATION",
  Venus: "LOVE", Mars: "DRIVE", Jupiter: "EXPANSION",
  Saturn: "DISCIPLINE", Uranus: "INNOVATION", Neptune: "SPIRITUALITY",
};

// ─── Projection helpers ───────────────────────────────────────────────────────
function project(lon: number, lat: number, y = Y0): THREE.Vector3 {
  const r = Math.max(0, 90 - lat) / 90 * DISC_R;
  const θ = lon * Math.PI / 180;
  return new THREE.Vector3(r * Math.sin(θ), y, -r * Math.cos(θ));
}

function unproject(x: number, z: number): { lat: number; lon: number } {
  const r   = Math.sqrt(x * x + z * z);
  const lat = 90 - (r / DISC_R) * 90;
  const lon = Math.atan2(x, -z) * 180 / Math.PI;
  return { lat: Math.max(-90, Math.min(90, lat)), lon };
}

// ─── Star field ───────────────────────────────────────────────────────────────
function StarField() {
  const geom = useMemo(() => {
    const positions: number[] = [];
    const h = (n: number) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
    for (let i = 0; i < 900; i++) {
      const r = 9 + h(i) * 14;
      const θ = h(i + 100) * Math.PI * 2;
      const φ = (h(i + 200) - 0.5) * Math.PI * 0.9;
      positions.push(
        r * Math.cos(φ) * Math.cos(θ),
        r * Math.sin(φ),
        r * Math.cos(φ) * Math.sin(θ),
      );
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

// ─── Disc base ────────────────────────────────────────────────────────────────
function DiscBase() {
  const rimRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!rimRef.current) return;
    const mat = rimRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.65 + 0.15 * Math.sin(state.clock.getElapsedTime() * 1.2);
  });

  return (
    <group>
      {/* Main disc face */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[DISC_R, 128]} />
        <meshPhongMaterial color="#040B1E" emissive="#020610" emissiveIntensity={0.45} shininess={15} />
      </mesh>

      {/* Disc edge — thin cylinder wall */}
      <mesh>
        <cylinderGeometry args={[DISC_R, DISC_R, 0.09, 128, 1, true]} />
        <meshPhongMaterial
          color="#0A1A3A" emissive="#050F22" emissiveIntensity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rim glow — pulsing */}
      <mesh ref={rimRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[DISC_R - 0.03, DISC_R + 0.05, 128]} />
        <meshBasicMaterial color="#32D5FF" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Outer ambient rings */}
      {[0.12, 0.26, 0.44].map((off, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[DISC_R + off, DISC_R + off + 0.07, 128]} />
          <meshBasicMaterial color="#1A8AFF" transparent opacity={0.1 - i * 0.028} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Graticule ────────────────────────────────────────────────────────────────
function GraticuleLines() {
  const latLoops = useMemo(() =>
    [-60, -30, 0, 30, 60].map(lat => {
      const r  = (90 - lat) / 90 * DISC_R;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const θ = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.sin(θ), Y0, -r * Math.cos(θ)));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      return { g, lat };
    }), []);

  const meridians = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => i * 30).map(lon => {
      const θ = lon * Math.PI / 180;
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, Y0, 0),
        new THREE.Vector3(DISC_R * Math.sin(θ), Y0, -DISC_R * Math.cos(θ)),
      ]);
      return { g, lon };
    }), []);

  return (
    <group>
      {latLoops.map(({ g, lat }) => (
        <primitive key={lat} object={new THREE.Line(g,
          new THREE.LineBasicMaterial({
            color: lat === 0 ? 0x2244AA : 0x111E55,
            transparent: true,
            opacity: lat === 0 ? 0.22 : 0.1,
          })
        )} />
      ))}
      {meridians.map(({ g, lon }) => (
        <primitive key={lon} object={new THREE.Line(g,
          new THREE.LineBasicMaterial({ color: 0x111E55, transparent: true, opacity: 0.1 })
        )} />
      ))}
    </group>
  );
}

// ─── Coastlines ───────────────────────────────────────────────────────────────
function CoastlineLayer() {
  const [coastlines, setCoastlines] = useState<number[][][]>([]);
  useEffect(() => {
    fetch("/geo/coastlines.json").then(r => r.json()).then(setCoastlines).catch(() => {});
  }, []);

  const obj = useMemo(() => {
    if (!coastlines.length) return null;
    const positions: number[] = [];
    for (const seg of coastlines) {
      if (seg.length < 2) continue;
      let prev: THREE.Vector3 | null = null;
      let prevLon = seg[0][0];
      for (const [lon, lat] of seg) {
        if (lat <= -78) { prev = null; continue; }
        if (Math.abs(lon - prevLon) > 120) { prev = null; }
        const pt = project(lon, lat);
        if (prev) { positions.push(prev.x, prev.y, prev.z, pt.x, pt.y, pt.z); }
        prev = pt;
        prevLon = lon;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: 0x1A5EFF, transparent: true, opacity: 0.48,
    }));
  }, [coastlines]);

  return obj ? <primitive object={obj} /> : null;
}

// ─── Planet lines ─────────────────────────────────────────────────────────────
function PlanetLineLayer({
  lines, activePlanets, activeAngles, dimmed,
}: {
  lines: AstroLine[];
  activePlanets: Set<AstroLinePlanet>;
  activeAngles: Set<AstroLineAngle>;
  dimmed: boolean;
}) {
  const objs = useMemo(() => {
    return lines
      .filter(l => activePlanets.has(l.planet) && activeAngles.has(l.angle))
      .map(line => {
        const positions: number[] = [];
        for (const seg of line.segments) {
          let prev: THREE.Vector3 | null = null;
          for (const pt of seg) {
            if (pt.lat <= -78) { prev = null; continue; }
            const p3 = project(pt.lon, pt.lat);
            if (prev) positions.push(prev.x, prev.y, prev.z, p3.x, p3.y, p3.z);
            prev = p3;
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        return new THREE.LineSegments(g, new THREE.LineBasicMaterial({
          color: new THREE.Color(PLANET_COLORS[line.planet]),
          transparent: true,
          opacity: dimmed ? 0.42 : 0.78,
        }));
      });
  }, [lines, activePlanets, activeAngles, dimmed]);

  return (
    <group>
      {objs.map((obj, i) => <primitive key={i} object={obj} />)}
    </group>
  );
}

// ─── City tower ───────────────────────────────────────────────────────────────
function CityTower({ spot }: { spot: CitySpot }) {
  const pos      = useMemo(() => project(spot.lon, spot.lat, 0), [spot.lat, spot.lon]);
  const top      = spot.scores[0]?.planet;
  const color    = top ? PLANET_COLORS[top] : "#4488FF";
  const sym      = top ? PLANET_SYMBOLS[top] : "✦";
  const keyword  = top ? PLANET_KEYWORDS[top] : "";
  const towerH   = 0.13 + (spot.power / 99) * 0.24;
  const threeCol = useMemo(() => new THREE.Color(color), [color]);

  const beamRef = useRef<THREE.Mesh>(null);
  const rimRef  = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.55 + 0.3 * Math.sin(t * 1.8 + spot.lat * 0.3);
    }
    if (rimRef.current) {
      (rimRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.35 + 0.2 * Math.sin(t * 2.2 + spot.lon * 0.1);
    }
  });

  return (
    <group position={[pos.x, 0, pos.z]}>
      {/* Base ring */}
      <mesh ref={rimRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, Y0, 0]}>
        <ringGeometry args={[0.055, 0.085, 36]} />
        <meshBasicMaterial color={threeCol} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Inner base dot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y0 * 1.2, 0]}>
        <circleGeometry args={[0.022, 16]} />
        <meshBasicMaterial color={threeCol} transparent opacity={0.7} />
      </mesh>

      {/* Tower beam */}
      <mesh ref={beamRef} position={[0, towerH / 2, 0]}>
        <cylinderGeometry args={[0.005, 0.012, towerH, 6]} />
        <meshBasicMaterial color={threeCol} transparent opacity={0.7} />
      </mesh>

      {/* Tip glow sphere */}
      <mesh position={[0, towerH + 0.008, 0]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* HTML label above tip */}
      <Html position={[0, towerH + 0.1, 0]} center distanceFactor={5.5} style={{ pointerEvents: "none" }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
          fontFamily: "'Fragment Mono', monospace",
          filter: `drop-shadow(0 0 5px ${color})`,
        }}>
          <span style={{ fontSize: 13, color, lineHeight: 1 }}>{sym}</span>
          <span style={{ fontSize: 7, color: "#E8F0FF", letterSpacing: "0.08em", whiteSpace: "nowrap", fontWeight: 700 }}>
            {spot.city.split(",")[0].toUpperCase()}
          </span>
          <span style={{ fontSize: 6, color, letterSpacing: "0.06em", opacity: 0.8 }}>
            {(top ?? "").toUpperCase()}
          </span>
          <span style={{ fontSize: 6, color, letterSpacing: "0.06em", opacity: 0.5 }}>
            {keyword}
          </span>
        </div>
      </Html>
    </group>
  );
}

// ─── Birth pulse rings ────────────────────────────────────────────────────────
function BirthPulseDisc({ lat, lon }: { lat: number; lon: number }) {
  const pos     = useMemo(() => project(lon, lat, 0), [lat, lon]);
  const ringsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ringsRef.current) return;
    const t = state.clock.getElapsedTime();
    ringsRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const phase = ((t * 0.45 + i * 0.34) % 1);
        child.scale.setScalar(1 + phase * 3.5);
        (child.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.5;
      }
    });
  });

  return (
    <group position={[pos.x, Y0, pos.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <group ref={ringsRef}>
        {[0, 1, 2].map(i => (
          <mesh key={i}>
            <ringGeometry args={[0.04, 0.058, 48]} />
            <meshBasicMaterial color="#c4b5fd" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <mesh>
        <circleGeometry args={[0.022, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Html center distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div style={{
          color: "#c4b5fd", fontSize: 7,
          fontFamily: "'Fragment Mono', monospace",
          letterSpacing: "0.15em",
          textShadow: "0 0 6px #c4b5fd",
        }}>
          BIRTH
        </div>
      </Html>
    </group>
  );
}

// ─── North Pole marker ────────────────────────────────────────────────────────
function NorthPoleMarker() {
  return (
    <Html position={[0, Y0 + 0.08, 0]} center distanceFactor={5} style={{ pointerEvents: "none" }}>
      <div style={{
        color: "#32D5FF", fontSize: 8, fontFamily: "'Fragment Mono', monospace",
        letterSpacing: "0.2em", textAlign: "center",
        textShadow: "0 0 8px #32D5FF", opacity: 0.65,
        lineHeight: 1.4,
      }}>
        NORTH<br />POLE
      </div>
    </Html>
  );
}

// ─── Disc click handler ───────────────────────────────────────────────────────
function DiscClickHandler({ onDiscClick }: { onDiscClick: (lat: number, lon: number) => void }) {
  const { camera, gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  const handleClick = useCallback((e: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const target = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, target)) return;
    if (Math.sqrt(target.x * target.x + target.z * target.z) > DISC_R) return;
    const { lat, lon } = unproject(target.x, target.z);
    onDiscClick(lat, lon);
  }, [camera, gl, plane, onDiscClick]);

  useEffect(() => {
    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [gl, handleClick]);

  return null;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function FlatEarthScene({
  lines, activePlanets, activeAngles, topSpots,
  birthLat, birthLon, showCities, showLines, onLocationClick,
}: {
  lines: AstroLine[];
  activePlanets: Set<AstroLinePlanet>;
  activeAngles: Set<AstroLineAngle>;
  topSpots: CitySpot[];
  birthLat: number; birthLon: number;
  showCities: boolean; showLines: boolean;
  onLocationClick: (lat: number, lon: number) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.08} />
      <pointLight position={[0, 6, 0]} intensity={0.25} color="#3355AA" />
      <pointLight position={[-4, 2, -4]} intensity={0.15} color="#1133AA" />

      <StarField />
      <DiscBase />
      <GraticuleLines />
      <CoastlineLayer />

      {showLines && (
        <PlanetLineLayer
          lines={lines}
          activePlanets={activePlanets}
          activeAngles={activeAngles}
          dimmed={showCities}
        />
      )}

      {showCities && topSpots.map(spot => (
        <CityTower key={spot.city} spot={spot} />
      ))}

      <BirthPulseDisc lat={birthLat} lon={birthLon} />
      <NorthPoleMarker />
      <DiscClickHandler onDiscClick={onLocationClick} />

      <OrbitControls
        enablePan
        minDistance={1.5}
        maxDistance={9}
        maxPolarAngle={Math.PI / 2.1}
        rotateSpeed={0.45}
        dampingFactor={0.07}
        enableDamping
      />

      <EffectComposer>
        <Bloom
          blendFunction={BlendFunction.ADD}
          intensity={2.0}
          luminanceThreshold={0.07}
          luminanceSmoothing={0.6}
          radius={0.9}
        />
      </EffectComposer>
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export interface FlatEarthCanvasProps {
  lines: AstroLine[];
  activePlanets: Set<AstroLinePlanet>;
  activeAngles: Set<AstroLineAngle>;
  topSpots: CitySpot[];
  birthLat?: number;
  birthLon?: number;
  showCities?: boolean;
  showLines?: boolean;
  onLocationClick: (lat: number, lon: number) => void;
}

export default function FlatEarthCanvas({
  lines, activePlanets, activeAngles, topSpots,
  birthLat = 34.05, birthLon = -118.24,
  showCities = true, showLines = true,
  onLocationClick,
}: FlatEarthCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 4.8, 3.4], fov: 44, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#010810" }}
    >
      <FlatEarthScene
        lines={lines}
        activePlanets={activePlanets}
        activeAngles={activeAngles}
        topSpots={topSpots}
        birthLat={birthLat}
        birthLon={birthLon}
        showCities={showCities}
        showLines={showLines}
        onLocationClick={onLocationClick}
      />
    </Canvas>
  );
}
