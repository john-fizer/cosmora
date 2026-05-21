"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Sparkles, Html } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import type { ChartData, PlanetPosition } from "@/lib/astrology/types";

// ─── Color maps ───────────────────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  Sun: "#ffd700", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f9a8d4",
  Mars: "#ff5555", Jupiter: "#fbbf24", Saturn: "#e8d5a3", Uranus: "#67e8f9",
  Neptune: "#60a5fa", Pluto: "#a78bfa", NorthNode: "#94a3b8",
};

const PLANET_EMISSIVE: Record<string, string> = {
  Sun: "#ff6600", Moon: "#6d28d9", Mercury: "#5b21b6", Venus: "#be185d",
  Mars: "#991b1b", Jupiter: "#92400e", Saturn: "#57534e", Uranus: "#0e7490",
  Neptune: "#1e3a8a", Pluto: "#4c1d95", NorthNode: "#1e293b",
};

const PLANET_RADII: Record<string, number> = {
  Sun: 0.068, Jupiter: 0.054, Saturn: 0.048, Moon: 0.042,
  Venus: 0.038, Mars: 0.033, Uranus: 0.035, Neptune: 0.035,
  Mercury: 0.029, Pluto: 0.027, NorthNode: 0.020,
};

const SIGN_COLORS: string[] = [
  "#ef4444", "#22c55e", "#eab308", "#a855f7",
  "#f97316", "#6366f1", "#ec4899", "#dc2626",
  "#f59e0b", "#64748b", "#06b6d4", "#8b5cf6",
];

const ZODIAC_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];

const ASPECT_COLORS: Record<string, string> = {
  conjunction: "#a855f7", opposition: "#ef4444", trine: "#22c55e",
  square: "#f59e0b", sextile: "#06b6d4", quincunx: "#94a3b8",
};

// ─── Animated torus ring ─────────────────────────────────────────────────────

function TorusRing({
  radius, tube = 0.003, color = "#7c3aed", opacity = 0.3, speed = 0,
}: {
  radius: number; tube?: number; color?: string; opacity?: number; speed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current && speed !== 0) ref.current.rotation.z += speed * dt;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, tube, 8, 128]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Line primitive ───────────────────────────────────────────────────────────

function PrimitiveLine({
  points, color, opacity = 1,
}: {
  points: THREE.Vector3[]; color: string; opacity?: number;
}) {
  const obj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    return new THREE.Line(geo, mat);
  }, [points, color, opacity]);
  return <primitive object={obj} />;
}

// ─── Arc primitive ────────────────────────────────────────────────────────────

function ArcLine({
  radius, startDeg, endDeg, color, opacity = 1, segments = 32,
}: {
  radius: number; startDeg: number; endDeg: number; color: string; opacity?: number; segments?: number;
}) {
  const obj = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = ((startDeg + (i / segments) * (endDeg - startDeg) - 90) * Math.PI) / 180;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    return new THREE.Line(geo, mat);
  }, [radius, startDeg, endDeg, color, opacity, segments]);
  return <primitive object={obj} />;
}

// ─── Slowly rotating group ────────────────────────────────────────────────────

function RotatingGroup({ children, speed = 0.0006 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += speed * dt;
  });
  return <group ref={ref}>{children}</group>;
}

// ─── Sun corona ───────────────────────────────────────────────────────────────

function SunCorona({ radius }: { radius: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.14);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.07 + Math.sin(t * 0.6) * 0.025;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius * 3.8, 16, 16]} />
      <meshBasicMaterial
        color="#ff7700"
        transparent
        opacity={0.07}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─── Planet orb ───────────────────────────────────────────────────────────────

function PlanetOrb({
  planet, orbitRadius, onClick,
}: {
  planet: PlanetPosition;
  orbitRadius: number;
  onClick: (p: PlanetPosition) => void;
}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = PLANET_COLORS[planet.name] ?? "#ffffff";
  const emissive = PLANET_EMISSIVE[planet.name] ?? color;
  const radius = PLANET_RADII[planet.name] ?? 0.030;
  const isSun = planet.name === "Sun";
  const isSaturn = planet.name === "Saturn";

  const angle = ((planet.longitude - 90) * Math.PI) / 180;
  const x = Math.cos(angle) * orbitRadius;
  const y = Math.sin(angle) * orbitRadius;

  useFrame((state) => {
    if (!coreRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = isSun
      ? Math.sin(t * 1.4) * 0.10
      : Math.sin(t * 2.2 + angle) * 0.07;
    coreRef.current.scale.setScalar(hovered ? 1.45 : 1 + pulse);
  });

  return (
    <group position={[x, y, 0]}>
      {/* Outer halo */}
      <mesh>
        <sphereGeometry args={[radius * 4.5, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.10 : 0.038}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Mid glow */}
      <mesh>
        <sphereGeometry args={[radius * 2.2, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.22 : 0.10}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Planet core — clickable */}
      <mesh
        ref={coreRef}
        onClick={(e) => { e.stopPropagation(); onClick(planet); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isSun ? 3.2 : 0.85}
          roughness={isSun ? 0.1 : 0.45}
          metalness={0.1}
        />
      </mesh>

      {/* Saturn ring */}
      {isSaturn && (
        <mesh rotation={[Math.PI / 2.3, 0.35, 0.45]}>
          <ringGeometry args={[radius * 1.65, radius * 2.85, 48]} />
          <meshBasicMaterial
            color="#c8a96e"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Sun corona */}
      {isSun && <SunCorona radius={radius} />}
    </group>
  );
}

// ─── House spokes ─────────────────────────────────────────────────────────────

function HouseSpokes({ chart, innerR, outerR }: { chart: ChartData; innerR: number; outerR: number }) {
  const lines = useMemo(() =>
    chart.houses.map((h) => {
      const a = ((h.longitude - 90) * Math.PI) / 180;
      const isAngular = [0, 3, 6, 9].includes(chart.houses.indexOf(h));
      return {
        pts: [
          new THREE.Vector3(Math.cos(a) * innerR, Math.sin(a) * innerR, 0),
          new THREE.Vector3(Math.cos(a) * outerR, Math.sin(a) * outerR, 0),
        ],
        opacity: isAngular ? 0.35 : 0.15,
        color: isAngular ? "#7c3aed" : "#4f46e5",
      };
    }),
    [chart.houses, innerR, outerR]
  );
  return (
    <>
      {lines.map(({ pts, opacity, color }, i) => (
        <PrimitiveLine key={i} points={pts} color={color} opacity={opacity} />
      ))}
    </>
  );
}

// ─── Aspect lines ─────────────────────────────────────────────────────────────

function AspectLines({ chart, outerRadius }: { chart: ChartData; outerRadius: number }) {
  const lines = useMemo(() =>
    chart.aspects.slice(0, 20).map((a) => {
      const p1 = chart.planets.find(p => p.name === a.planet1);
      const p2 = chart.planets.find(p => p.name === a.planet2);
      if (!p1 || !p2) return null;
      const a1 = ((p1.longitude - 90) * Math.PI) / 180;
      const a2 = ((p2.longitude - 90) * Math.PI) / 180;
      const r = outerRadius * 0.78;
      return {
        pts: [
          new THREE.Vector3(Math.cos(a1) * r, Math.sin(a1) * r, 0),
          new THREE.Vector3(Math.cos(a2) * r, Math.sin(a2) * r, 0),
        ],
        color: ASPECT_COLORS[a.type] ?? "#ffffff",
        key: `${a.planet1}-${a.planet2}`,
        exact: a.exact,
      };
    }).filter(Boolean),
    [chart, outerRadius]
  );
  return (
    <>
      {lines.map((l) =>
        l ? (
          <PrimitiveLine key={l.key} points={l.pts} color={l.color} opacity={l.exact ? 0.32 : 0.16} />
        ) : null
      )}
    </>
  );
}

// ─── Zodiac arcs ──────────────────────────────────────────────────────────────

function ZodiacArcs({ outerRadius }: { outerRadius: number }) {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <ArcLine
          key={i}
          radius={outerRadius}
          startDeg={i * 30}
          endDeg={(i + 1) * 30}
          color={SIGN_COLORS[i]}
          opacity={0.6}
        />
      ))}
    </>
  );
}

// ─── Zodiac glyph labels ──────────────────────────────────────────────────────

function ZodiacGlyphs({ outerRadius }: { outerRadius: number }) {
  return (
    <>
      {ZODIAC_GLYPHS.map((glyph, i) => {
        const midDeg = i * 30 + 15;
        const a = ((midDeg - 90) * Math.PI) / 180;
        const r = outerRadius + 0.15;
        return (
          <Html key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} center>
            <div style={{
              color: SIGN_COLORS[i],
              fontSize: 9,
              lineHeight: 1,
              pointerEvents: "none",
              userSelect: "none",
              opacity: 0.85,
              textShadow: `0 0 6px ${SIGN_COLORS[i]}88`,
            }}>
              {glyph}
            </div>
          </Html>
        );
      })}
    </>
  );
}

// ─── House number labels ──────────────────────────────────────────────────────

function HouseLabels({ chart, houseRingR }: { chart: ChartData; houseRingR: number }) {
  const labels = useMemo(() => {
    return chart.houses.map((h, i) => {
      const next = chart.houses[(i + 1) % 12];
      let midLon = h.longitude;
      if (next) {
        const diff = ((next.longitude - h.longitude) + 360) % 360;
        midLon = h.longitude + diff / 2;
      } else {
        midLon = h.longitude + 15;
      }
      const a = ((midLon - 90) * Math.PI) / 180;
      const r = houseRingR + 0.04;
      return { num: i + 1, x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
  }, [chart.houses, houseRingR]);

  return (
    <>
      {labels.map(({ num, x, y }) => (
        <Html key={num} position={[x, y, 0]} center>
          <div style={{
            color: "rgba(99,102,241,0.65)",
            fontSize: 6,
            fontWeight: "bold",
            fontFamily: "monospace",
            letterSpacing: "0.02em",
            pointerEvents: "none",
            userSelect: "none",
          }}>
            {num}
          </div>
        </Html>
      ))}
    </>
  );
}

// ─── Angle (ASC/DSC/MC/IC) labels ─────────────────────────────────────────────

function AngleLabels({ chart, outerRadius }: { chart: ChartData; outerRadius: number }) {
  const ANGLES = [
    { label: "ASC", idx: 0, color: "#06b6d4" },
    { label: "IC",  idx: 3, color: "#8b5cf6" },
    { label: "DSC", idx: 6, color: "#06b6d4" },
    { label: "MC",  idx: 9, color: "#a78bfa" },
  ];

  return (
    <>
      {ANGLES.map(({ label, idx, color }) => {
        const lon = chart.houses[idx]?.longitude;
        if (lon === undefined) return null;
        const a = ((lon - 90) * Math.PI) / 180;
        const r = outerRadius - 0.08;
        return (
          <Html key={label} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} center>
            <div style={{
              color,
              fontSize: 7,
              fontWeight: "bold",
              fontFamily: "monospace",
              letterSpacing: "0.12em",
              textShadow: `0 0 8px ${color}`,
              pointerEvents: "none",
              userSelect: "none",
            }}>
              {label}
            </div>
          </Html>
        );
      })}
    </>
  );
}

// ─── Glowing core ─────────────────────────────────────────────────────────────

function GlowCore() {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (outerRef.current) {
      outerRef.current.scale.setScalar(1 + Math.sin(t * 0.55) * 0.1);
      (outerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.055 + Math.sin(t * 0.8) * 0.02;
    }
    if (innerRef.current) {
      innerRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.14);
    }
  });
  return (
    <group>
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial
          color="#7c3aed"
          transparent
          opacity={0.055}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial
          color="#9d4edd"
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.044, 24, 24]} />
        <meshStandardMaterial
          color="#c084fc"
          emissive="#7c3aed"
          emissiveIntensity={2.5}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

// ─── Camera controller ────────────────────────────────────────────────────────

export type SceneView = "overview" | "planets" | "houses" | "aspects" | "transits";

function CameraController({ view }: { view: SceneView }) {
  const { camera } = useThree();
  useEffect(() => {
    const targets: Record<SceneView, [number, number, number]> = {
      overview: [0, 0, 5],
      planets:  [0, 0, 3.2],
      houses:   [0, 0, 3.8],
      aspects:  [0, 0, 3.0],
      transits: [2.2, 0, 3.5],
    };
    const [tx, ty, tz] = targets[view];
    gsap.to(camera.position, { x: tx, y: ty, z: tz, duration: 1.4, ease: "power3.inOut" });
    gsap.to(camera, {
      fov: view === "planets" ? 56 : 70,
      duration: 1.4,
      ease: "power3.inOut",
      onUpdate: () => camera.updateProjectionMatrix(),
    });
  }, [view, camera]);
  return null;
}

// ─── Cosmic wheel ─────────────────────────────────────────────────────────────

const OUTER_R = 1.42;
const HOUSE_R = 1.14;
const ORBIT_R = 0.88;

function CosmicWheel({
  chart, view, onSelectPlanet,
}: {
  chart: ChartData;
  view: SceneView;
  onSelectPlanet: (p: PlanetPosition | null) => void;
}) {
  const showAspects = view === "aspects" || view === "overview";
  const showPlanets = view !== "houses";
  const showLabels  = view === "overview" || view === "houses";

  return (
    <group>
      {/* Decorative slow-rotating outer ring */}
      <RotatingGroup speed={0.0003}>
        <TorusRing radius={OUTER_R + 0.12} tube={0.003} color="#4f46e5" opacity={0.12} />
      </RotatingGroup>

      {/* Fixed zodiac arcs */}
      <ZodiacArcs outerRadius={OUTER_R} />
      <TorusRing radius={OUTER_R} tube={0.005} color="#7c3aed" opacity={0.40} />
      <ZodiacGlyphs outerRadius={OUTER_R} />

      {/* Angular labels */}
      {showLabels && <AngleLabels chart={chart} outerRadius={OUTER_R} />}

      {/* House ring */}
      <TorusRing radius={HOUSE_R} tube={0.002} color="#4f46e5" opacity={0.22} />
      <TorusRing radius={HOUSE_R - 0.06} tube={0.002} color="#06b6d4" opacity={0.14} speed={-0.025} />

      {/* House number labels */}
      {showLabels && <HouseLabels chart={chart} houseRingR={HOUSE_R} />}

      {/* House spokes */}
      <HouseSpokes chart={chart} innerR={0} outerR={HOUSE_R} />

      {/* Planet orbit ring */}
      <TorusRing radius={ORBIT_R} tube={0.002} color="#a855f7" opacity={0.14} />

      {/* Aspect lines */}
      {showAspects && <AspectLines chart={chart} outerRadius={ORBIT_R} />}

      {/* Planets */}
      {showPlanets && chart.planets.map((p) => (
        <PlanetOrb key={p.name} planet={p} orbitRadius={ORBIT_R} onClick={onSelectPlanet} />
      ))}

      {/* Inner rings */}
      <TorusRing radius={0.52} tube={0.002} color="#7c3aed" opacity={0.10} speed={0.07} />
      <TorusRing radius={0.28} tube={0.002} color="#06b6d4" opacity={0.13} speed={-0.12} />

      {/* Glowing core */}
      <GlowCore />
    </group>
  );
}

// ─── Exported canvas ──────────────────────────────────────────────────────────

export function CosmicScene({
  chart, view = "overview", onSelectPlanet,
}: {
  chart: ChartData | null;
  view?: SceneView;
  onSelectPlanet?: (p: PlanetPosition | null) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 70 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      {/* Lighting for realistic planet shading */}
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 0, 4]} intensity={1.8} color="#ffffff" />
      <pointLight position={[4, 3, 3]} intensity={1.0} color="#a855f7" />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#06b6d4" />
      <directionalLight position={[5, 5, 5]} intensity={0.5} color="#fbbf24" />

      <Stars radius={30} depth={20} count={4000} factor={0.5} saturation={0.5} fade speed={0.2} />
      <Sparkles count={100} scale={5} size={1.0} speed={0.2} color="#06b6d4" opacity={0.3} />

      <CameraController view={view} />

      {chart && (
        <CosmicWheel
          chart={chart}
          view={view}
          onSelectPlanet={onSelectPlanet ?? (() => {})}
        />
      )}
    </Canvas>
  );
}
