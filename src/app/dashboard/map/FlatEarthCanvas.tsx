"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Billboard } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import * as THREE from "three";

import type { AstroLine, AstroLinePlanet, AstroLineAngle } from "@/lib/astrology/astrocartography";
import { PLANET_COLORS, PLANET_SYMBOLS } from "@/lib/astrology/astrocartography";
import type { CitySpot } from "./GlobeCanvas";
import { buildSkylineGeo } from "./GlobeCanvas";
import type { Prim } from "@/lib/astrology/skylines";
import { LANDMARKS, proceduralSkyline } from "@/lib/astrology/skylines";

// ─── Constants ────────────────────────────────────────────────────────────────
const DISC_R = 2.2;
const Y0     = 0.006; // elevation above disc face


// ─── Projection helpers ───────────────────────────────────────────────────────
// Azimuthal equidistant: north pole at centre, south pole at the rim (full 180° span)
function project(lon: number, lat: number, y = Y0): THREE.Vector3 {
  const r = Math.max(0, 90 - lat) / 180 * DISC_R;
  const θ = lon * Math.PI / 180;
  return new THREE.Vector3(r * Math.sin(θ), y, -r * Math.cos(θ));
}

function unproject(x: number, z: number): { lat: number; lon: number } {
  const r   = Math.sqrt(x * x + z * z);
  const lat = 90 - (r / DISC_R) * 180;
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
        <meshBasicMaterial color="#C8A55B" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
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

// ─── Map face — baked azimuthal projection texture ────────────────────────────
// Filled continents, ocean gradient, labeled graticule, Antarctic ice ring.
function MapFace() {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/coastlines.json")
      .then(r => r.json())
      .then((coastlines: number[][][]) => {
        if (cancelled) return;
        const W = 2048;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = W;
        const ctx = canvas.getContext("2d")!;
        const cx = W / 2, cy = W / 2;
        const Rpx = W / 2 - 8;

        const toPx = (lon: number, lat: number): [number, number] => {
          const r = Math.max(0, 90 - lat) / 180 * Rpx;
          const θ = (lon * Math.PI) / 180;
          return [cx + r * Math.sin(θ), cy + r * Math.cos(θ)];
        };

        // ── Ocean ──
        const ocean = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rpx);
        ocean.addColorStop(0,    "#03102A");
        ocean.addColorStop(0.65, "#020B1E");
        ocean.addColorStop(1,    "#010614");
        ctx.fillStyle = ocean;
        ctx.beginPath(); ctx.arc(cx, cy, Rpx, 0, Math.PI * 2); ctx.fill();

        // ── Graticule — parallels ──
        ctx.font = "22px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let lat = 75; lat >= -60; lat -= 15) {
          const r = (90 - lat) / 180 * Rpx;
          const isEquator = lat === 0;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = isEquator ? "rgba(50,120,255,0.40)" : "rgba(28,52,130,0.30)";
          ctx.lineWidth = isEquator ? 2.5 : 1;
          if (!isEquator) ctx.setLineDash([6, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
          // Latitude label down the prime meridian
          if (lat !== 75) {
            ctx.fillStyle = "rgba(80,140,255,0.5)";
            ctx.fillText(`${Math.abs(lat)}°${lat > 0 ? "N" : lat < 0 ? "S" : ""}`, cx + 28, cy + r - 16);
          }
        }

        // ── Graticule — meridians with rim labels ──
        for (let lon = 0; lon < 360; lon += 30) {
          const θ = (lon * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Rpx * Math.sin(θ), cy + Rpx * Math.cos(θ));
          ctx.strokeStyle = "rgba(28,52,130,0.28)";
          ctx.lineWidth = 1;
          ctx.stroke();
          // Label just inside the rim
          const lr = Rpx - 34;
          const display = lon <= 180 ? lon : 360 - lon;
          const suffix = lon === 0 || lon === 180 ? "" : lon < 180 ? "E" : "W";
          ctx.fillStyle = "rgba(80,140,255,0.55)";
          ctx.fillText(`${display}°${suffix}`, cx + lr * Math.sin(θ), cy + lr * Math.cos(θ));
        }

        // ── Land — filled polygons ──
        for (const ring of coastlines) {
          if (ring.length < 4) continue;
          const meanLat = ring.reduce((a, p) => a + p[1], 0) / ring.length;
          if (meanLat < -60) continue; // Antarctica → ice ring instead
          ctx.beginPath();
          ring.forEach(([lon, lat], i) => {
            const [px, py] = toPx(lon, lat);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          });
          ctx.closePath();
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rpx);
          grad.addColorStop(0, "rgba(16,48,96,0.85)");
          grad.addColorStop(1, "rgba(10,32,68,0.85)");
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // ── Coast strokes with glow ──
        ctx.shadowColor = "rgba(40,110,255,0.8)";
        ctx.shadowBlur = 6;
        ctx.strokeStyle = "rgba(58,130,255,0.85)";
        ctx.lineWidth = 1.6;
        for (const ring of coastlines) {
          if (ring.length < 2) continue;
          const meanLat = ring.reduce((a, p) => a + p[1], 0) / ring.length;
          if (meanLat < -60) continue;
          ctx.beginPath();
          let started = false;
          let prevLon = ring[0][0];
          for (const [lon, lat] of ring) {
            if (Math.abs(lon - prevLon) > 120) started = false;
            const [px, py] = toPx(lon, lat);
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
            prevLon = lon;
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // ── Antarctic ice ring at the rim ──
        const iceInner = (90 - -60) / 180 * Rpx;
        const ice = ctx.createRadialGradient(cx, cy, iceInner, cx, cy, Rpx);
        ice.addColorStop(0, "rgba(140,180,255,0)");
        ice.addColorStop(0.55, "rgba(150,190,255,0.10)");
        ice.addColorStop(1, "rgba(190,220,255,0.22)");
        ctx.beginPath();
        ctx.arc(cx, cy, Rpx, 0, Math.PI * 2);
        ctx.arc(cx, cy, iceInner, 0, Math.PI * 2, true);
        ctx.fillStyle = ice;
        ctx.fill();

        const t = new THREE.CanvasTexture(canvas);
        t.anisotropy = 8;
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!tex) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y0 * 0.5, 0]}>
      <circleGeometry args={[DISC_R, 128]} />
      <meshBasicMaterial map={tex} transparent opacity={0.96} />
    </mesh>
  );
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

const FLAT_H = 0.22; // hologram height above disc surface

// ─── City hologram (flat-earth view) — skyline silhouette instead of beacon ───
function CityTower({ spot, spotIndex }: { spot: CitySpot; spotIndex: number }) {
  const pos       = useMemo(() => project(spot.lon, spot.lat, 0), [spot.lat, spot.lon]);
  const top       = spot.scores[0]?.planet;
  const color     = top ? PLANET_COLORS[top] : "#4488FF";
  const threeCol  = useMemo(() => new THREE.Color(color), [color]);
  const brightCol = useMemo(() => threeCol.clone().multiplyScalar(3.0), [threeCol]);

  const prims = useMemo<Prim[]>(() => {
    const sk = spot.skyline;
    if (sk?.tier === "landmark" && sk.landmark && LANDMARKS[sk.landmark]) return LANDMARKS[sk.landmark];
    const seed = (spotIndex * 997 + Math.round(spot.lat * 13) + Math.round(spot.lon * 7)) | 0;
    return proceduralSkyline(sk?.height ?? 1, sk?.density ?? 1, seed);
  }, [spot.skyline, spot.lat, spot.lon, spotIndex]);

  const { geo: skylineGeo, totalH } = useMemo(() => buildSkylineGeo(prims), [prims]);

  const groundRingGeo = useMemo(() => new THREE.RingGeometry(0.058, 0.064, 48), []);
  const scanRingGeo   = useMemo(() => new THREE.RingGeometry(0.028, 0.050, 48), []);
  const dotGeo        = useMemo(() => new THREE.CircleGeometry(0.015, 12), []);
  const stemGeo       = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, FLAT_H, 0),
  ]), []);

  const scanRef = useRef<THREE.Mesh>(null);
  const pulseT  = useRef(spotIndex * 1.17);
  const scoreVal = spot.scores?.[0]?.influence ?? 0;

  useFrame((_, dt) => {
    pulseT.current += dt;
    if (scanRef.current) {
      const phase = (pulseT.current * 0.5) % 1.0;
      const m = scanRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = Math.max(0, (1 - phase) * 0.85);
      scanRef.current.scale.setScalar(1 + phase * 2.6);
    }
  });

  return (
    <group position={[pos.x, 0, pos.z]}>
      {/* Static ground ring */}
      <mesh geometry={groundRingGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, Y0, 0]}>
        <meshBasicMaterial color={threeCol} transparent opacity={0.30}
          side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Pulsing scan ring */}
      <mesh ref={scanRef} geometry={scanRingGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, Y0, 0]}>
        <meshBasicMaterial color={brightCol} transparent opacity={0.85}
          side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Anchor dot */}
      <mesh geometry={dotGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, Y0 * 1.4, 0]}>
        <meshBasicMaterial color={brightCol} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Vertical stem */}
      <lineSegments geometry={stemGeo}>
        <lineBasicMaterial color={brightCol} transparent opacity={0.55}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>

      {/* Skyline panel — Billboard always faces camera in the flat view */}
      <Billboard position={[0, FLAT_H, 0]}>
        {/* buildSkylineGeo already applies SKYW/SKYH; scale down further for flat-disc scene */}
        <group scale={[0.28, 0.28, 1]}>
          <lineSegments geometry={skylineGeo}>
            <lineBasicMaterial color={brightCol} blending={THREE.AdditiveBlending} depthWrite={false} />
          </lineSegments>
        </group>
        <Html position={[0, totalH * 0.28 + 0.06, 0]} center distanceFactor={5.5} zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}>
          <div style={{ textAlign: "center", lineHeight: 1.25 }}>
            <div style={{
              color, fontSize: 9, fontFamily: "'Fragment Mono', monospace",
              letterSpacing: "0.16em", fontWeight: 700,
              textShadow: `0 0 14px ${color}EE`,
              background: `${color}18`,
              border: `1px solid ${color}66`,
              borderBottom: "none",
              padding: "2px 7px 1px", whiteSpace: "nowrap",
            }}>
              {spot.city.split(",")[0].toUpperCase()}
            </div>
            <div style={{
              color, fontSize: 6.5, fontFamily: "'Fragment Mono', monospace",
              opacity: 0.85, letterSpacing: "0.10em",
              background: `${color}10`,
              border: `1px solid ${color}44`,
              borderTop: "none",
              padding: "1px 7px 2px", whiteSpace: "nowrap",
            }}>
              {top ? PLANET_SYMBOLS[top] : "·"}&nbsp;{Math.round(scoreVal * 100)}%&nbsp;{top?.toUpperCase() ?? "COSMIC"}
            </div>
          </div>
        </Html>
      </Billboard>
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
            <meshBasicMaterial color="#BFB6E8" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <mesh>
        <circleGeometry args={[0.022, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Html center distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div style={{
          color: "#BFB6E8", fontSize: 7,
          fontFamily: "'Fragment Mono', monospace",
          letterSpacing: "0.15em",
          textShadow: "0 0 6px #BFB6E8",
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
        color: "#C8A55B", fontSize: 8, fontFamily: "'Fragment Mono', monospace",
        letterSpacing: "0.2em", textAlign: "center",
        textShadow: "0 0 8px #C8A55B", opacity: 0.65,
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
      <MapFace />

      {showLines && (
        <PlanetLineLayer
          lines={lines}
          activePlanets={activePlanets}
          activeAngles={activeAngles}
          dimmed={showCities}
        />
      )}

      {showCities && topSpots.map((spot, i) => (
        <CityTower key={spot.city} spot={spot} spotIndex={i} />
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
