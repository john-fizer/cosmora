"use client";

import { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, OrbitControls, Html } from "@react-three/drei";
import { CinematicFX } from "./postfx/CinematicFX";
import * as THREE from "three";
import type { ChartData, PlanetName, Aspect } from "@/lib/astrology/types";
import { PLANET_SYMBOLS } from "@/lib/astrology/types";
import { getPlanetMeta } from "@/lib/astrology/planetMeta";
import { QUALITY, detectGpuTier } from "@/lib/design/gpuTier";

// ─── Constants ────────────────────────────────────────────────────────────────

const ORBITAL_RADII: Record<string, number> = {
  Sun: 0, Moon: 2.4, Mercury: 4.0, Venus: 5.6,
  Mars: 7.6, Jupiter: 11.2, Saturn: 15.0,
  Uranus: 18.8, Neptune: 22.4, Pluto: 25.8,
  NorthNode: 6.6, Chiron: 9.4,
};

// Artistic scale — true-to-scale planets are invisible dots at orbital distance;
// bumped hard for cinematic presence while keeping relative ordering recognizable.
const PLANET_SIZES: Record<string, number> = {
  Sun: 2.1, Moon: 0.54, Mercury: 0.5, Venus: 0.72,
  Mars: 0.6, Jupiter: 1.3, Saturn: 1.08,
  Uranus: 0.82, Neptune: 0.8, Pluto: 0.42,
  NorthNode: 0.3, Chiron: 0.3,
};

// Astro glyph font (loaded in globals.css) so zodiac/planet symbols render —
// not the missing-glyph tofu boxes.
const GLYPH_FONT = "'Noto Sans Symbols 2', 'Fragment Mono', sans-serif";

const ROTATION_SPEEDS: Record<string, number> = {
  Sun: 0.04, Moon: 0.02, Mercury: 0.035, Venus: -0.015, Mars: 0.045,
  Jupiter: 0.12, Saturn: 0.10, Uranus: -0.06, Neptune: 0.08, Pluto: 0.015,
  NorthNode: 0, Chiron: 0.01,
};

const DEMO_LONGITUDES: Record<string, number> = {
  Sun: 78, Moon: 218, Mercury: 58, Venus: 115,
  Mars: 308, Jupiter: 183, Saturn: 292,
  Uranus: 44, Neptune: 354, Pluto: 298,
  NorthNode: 14, Chiron: 150,
};

const DEMO_ASPECTS: Aspect[] = [
  { planet1: "Sun",     planet2: "Venus",   type: "sextile",     orb: 1.2, exact: false, applying: true },
  { planet1: "Moon",    planet2: "Jupiter", type: "opposition",  orb: 0.8, exact: false, applying: false },
  { planet1: "Mercury", planet2: "Venus",   type: "conjunction", orb: 0.5, exact: false, applying: true },
  { planet1: "Venus",   planet2: "Neptune", type: "trine",       orb: 1.1, exact: false, applying: false },
  { planet1: "Mars",    planet2: "Saturn",  type: "sextile",     orb: 1.6, exact: false, applying: true },
  { planet1: "Jupiter", planet2: "Pluto",   type: "square",      orb: 0.9, exact: false, applying: false },
  { planet1: "Sun",     planet2: "Mars",    type: "square",      orb: 2.0, exact: false, applying: true },
];

const ASPECT_COLORS: Record<string, string> = {
  conjunction: "#9C8AC4", opposition: "#ef4444", trine: "#22c55e",
  square: "#f97316", sextile: "#06b6d4", quincunx: "#94a3b8",
};

const ZODIAC_SYMBOLS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];

const ELEMENT_COLORS = [
  "#ef4444","#86efac","#06b6d4","#818cf8",
  "#ef4444","#86efac","#06b6d4","#818cf8",
  "#ef4444","#86efac","#06b6d4","#818cf8",
];

// ─── Coordinate math ──────────────────────────────────────────────────────────

function lonToVec3(lon: number, radius: number): THREE.Vector3 {
  const rad = (lon * Math.PI) / 180;
  return new THREE.Vector3(radius * Math.cos(rad), 0, -radius * Math.sin(rad));
}

// ─── Planet surfaces ──────────────────────────────────────────────────────────
// NASA/SSS texture maps where we have them; procedural fallback for points
// without photographic surfaces (Pluto 2k unavailable, nodes, Chiron).

const TEXTURE_FILES: Record<string, string> = {
  Sun: "2k_sun.jpg", Moon: "2k_moon.jpg", Mercury: "2k_mercury.jpg",
  Venus: "2k_venus_atmosphere.jpg", Mars: "2k_mars.jpg", Jupiter: "2k_jupiter.jpg",
  Saturn: "2k_saturn.jpg", Uranus: "2k_uranus.jpg", Neptune: "2k_neptune.jpg",
};

function loadPlanetFile(file: string): THREE.Texture {
  const t = new THREE.TextureLoader().load(`/textures/planets/${file}`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ─── Nebula skybox — real cosmic backdrop instead of flat black ───────────────

function Skybox() {
  const stars = useMemo(() => { const t = new THREE.TextureLoader().load("/textures/space/8k_stars_milky_way.jpg"); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  const nebula = useMemo(() => { const t = new THREE.TextureLoader().load("/textures/space/nebula_brand.png"); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  return (
    <>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[260, 48, 48]} />
        <meshBasicMaterial map={stars} side={THREE.BackSide} color="#7d7799" />
      </mesh>
      <mesh scale={[-1, 1, 1]} rotation={[0.2, 1.6, 0.1]}>
        <sphereGeometry args={[255, 32, 32]} />
        <meshBasicMaterial map={nebula} side={THREE.BackSide} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

function makeValueNoise(seed: number, grid = 24) {
  const vals = new Float32Array(grid * grid);
  let s = seed * 1e6;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < vals.length; i++) vals[i] = rnd();
  return (x: number, y: number): number => {
    const gx = ((x % 1) + 1) % 1 * grid, gy = ((y % 1) + 1) % 1 * grid;
    const x0 = Math.floor(gx) % grid, y0 = Math.floor(gy) % grid;
    const x1 = (x0 + 1) % grid, y1 = (y0 + 1) % grid;
    const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = vals[y0 * grid + x0], b = vals[y0 * grid + x1];
    const c = vals[y1 * grid + x0], d = vals[y1 * grid + x1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function makePlanetTexture(name: string, baseColor: string): THREE.CanvasTexture {
  const W = 512, H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const base = new THREE.Color(baseColor);

  const seed = hashSeed(name);
  const n1 = makeValueNoise(seed, 16);
  const n2 = makeValueNoise(seed + 0.37, 48);
  const n3 = makeValueNoise(seed + 0.71, 96);
  const fbm = (x: number, y: number) => n1(x, y) * 0.55 + n2(x, y) * 0.3 + n3(x, y) * 0.15;

  const banded = name === "Jupiter" || name === "Saturn";
  const icy    = name === "Uranus" || name === "Neptune";
  const cloudy = name === "Venus";

  const px = new THREE.Color();
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      let light: number;
      if (banded) {
        // Latitudinal bands warped by turbulence
        const turb = fbm(u * 3, v * 2) * 0.35;
        const band = Math.sin((v + turb) * Math.PI * (name === "Jupiter" ? 14 : 10));
        light = 0.72 + band * 0.20 + (fbm(u * 6, v * 6) - 0.5) * 0.12;
      } else if (icy) {
        // Smooth ice-giant gradient with faint streaks
        const streak = Math.sin((v + fbm(u * 2, v) * 0.15) * Math.PI * 6) * 0.05;
        light = 0.82 + streak + (fbm(u * 4, v * 4) - 0.5) * 0.06;
      } else if (cloudy) {
        // Swirling sulfuric cloud deck
        const swirl = fbm(u * 4 + fbm(u * 2, v * 2) * 0.8, v * 3);
        light = 0.75 + (swirl - 0.5) * 0.45;
      } else {
        // Rocky regolith mottling
        const m = fbm(u * 5, v * 5);
        light = 0.55 + (m - 0.5) * 0.75;
      }
      px.copy(base).multiplyScalar(Math.max(0.15, light));
      const i = (y * W + x) * 4;
      img.data[i] = px.r * 255; img.data[i + 1] = px.g * 255; img.data[i + 2] = px.b * 255; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Craters for airless rock
  if (["Moon", "Mercury", "Pluto", "Chiron"].includes(name)) {
    let s = seed * 233280;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const count = name === "Moon" ? 90 : 60;
    for (let i = 0; i < count; i++) {
      const cxp = rnd() * W, cyp = rnd() * H, cr = 1.5 + rnd() * rnd() * 9;
      const g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, cr);
      g.addColorStop(0, "rgba(0,0,0,0.38)");
      g.addColorStop(0.75, "rgba(0,0,0,0.18)");
      g.addColorStop(0.9, "rgba(255,255,255,0.12)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cxp, cyp, cr, 0, Math.PI * 2); ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ─── Shaders ─────────────────────────────────────────────────────────────────

const CORONA_VERT = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const CORONA_FRAG = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  uniform float u_scale;
  void main() {
    float rim = 1.0 - max(0.0, dot(normalize(vNormal), normalize(vViewPos)));
    float glow = pow(rim, 1.5) * u_scale;
    vec3 inner = vec3(1.0, 0.97, 0.65);
    vec3 outer  = vec3(1.0, 0.32, 0.02);
    gl_FragColor = vec4(mix(inner, outer, pow(rim, 0.8)), glow * 0.9);
  }
`;

// Atmospheric rim haze — per-planet color
const ATMO_VERT = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const ATMO_FRAG = `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  uniform vec3 u_color;
  uniform float u_intensity;
  void main() {
    float rim = 1.0 - max(0.0, dot(normalize(vNormal), normalize(vViewPos)));
    float glow = pow(rim, 1.6) * u_intensity;
    gl_FragColor = vec4(u_color, glow);
  }
`;

// ─── Sun ──────────────────────────────────────────────────────────────────────

function Sun({ onCore }: { onCore?: (m: THREE.Mesh | null) => void }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const rotRef = useRef<THREE.Group>(null);
  const sunTex = useMemo(() => loadPlanetFile("2k_sun.jpg"), []);
  const coronaUniforms = useMemo(() => ({ u_scale: { value: 1.6 } }), []);

  useFrame((_, dt) => {
    if (rotRef.current) rotRef.current.rotation.y += dt * 0.05;
  });

  return (
    <group>
      {/* The sun is the ONLY light source — gives every planet a real day/night terminator */}
      <pointLight color="#fff4dc" intensity={6.0} distance={500} decay={0.5} />
      <ambientLight color="#13112a" intensity={0.16} />
      {/* Bright textured star core (bloom does the glow) */}
      <group ref={rotRef}>
        <mesh ref={(m) => { coreRef.current = m as THREE.Mesh; onCore?.(m as THREE.Mesh | null); }}>
          <sphereGeometry args={[1.75, 64, 64]} />
          <meshBasicMaterial map={sunTex} color="#ffe2a8" toneMapped={false} />
        </mesh>
      </group>
      {/* Inner bright halo so the sun reads as a glowing star, not a dim dot */}
      <mesh>
        <sphereGeometry args={[1.95, 48, 48]} />
        <meshBasicMaterial color="#ffcf7a" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Corona glow shell — additive Fresnel halo (the sun is allowed a corona;
          this is NOT the nested-planet-shell problem) */}
      <mesh>
        <sphereGeometry args={[2.3, 48, 48]} />
        <shaderMaterial vertexShader={CORONA_VERT} fragmentShader={CORONA_FRAG} uniforms={coronaUniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ─── Orbit ring + motion trail ────────────────────────────────────────────────

function OrbitRing({ radius, color }: { radius: number; color: string }) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {/* crisp bright orbit line */}
      <mesh>
        <ringGeometry args={[radius - 0.018, radius + 0.018, 240]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* soft glow band around it */}
      <mesh>
        <ringGeometry args={[radius - 0.12, radius + 0.12, 240]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// Golden comet-trail arc fading behind the planet (additive, vertex-faded)
function OrbitTrail({ radius, longitude, color }: { radius: number; longitude: number; color: string }) {
  const geo = useMemo(() => {
    const SEGS = 90, SWEEP = 130; // degrees of trail behind the body
    const pos: number[] = [], col: number[] = [];
    const c = new THREE.Color(color);
    for (let i = 0; i < SEGS; i++) {
      const f0 = i / SEGS, f1 = (i + 1) / SEGS;
      const a0 = ((longitude - f0 * SWEEP) * Math.PI) / 180;
      const a1 = ((longitude - f1 * SWEEP) * Math.PI) / 180;
      pos.push(radius * Math.cos(a0), 0, -radius * Math.sin(a0));
      pos.push(radius * Math.cos(a1), 0, -radius * Math.sin(a1));
      const w0 = Math.pow(1 - f0, 2.2), w1 = Math.pow(1 - f1, 2.2);
      col.push(c.r * w0, c.g * w0, c.b * w0, c.r * w1, c.g * w1, c.b * w1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color",    new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [radius, longitude, color]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

// ─── Saturn ring system ───────────────────────────────────────────────────────

function SaturnRings({ pos }: { pos: THREE.Vector3 }) {
  const tex = useMemo(() => loadPlanetFile("2k_saturn_ring_alpha.png"), []);
  // Radial UVs so the ring strip texture maps inner→outer
  const geo = useMemo(() => {
    const inner = 0.44, outer = 0.96;
    const g = new THREE.RingGeometry(inner, outer, 128);
    const posAttr = g.attributes.position, uv = g.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    return g;
  }, []);
  return (
    <group position={pos.toArray()} rotation={[0.45, 0, 0.28]}>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} scale={2.3}>
        <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} depthWrite={false} opacity={0.95} />
      </mesh>
    </group>
  );
}

// ─── Planet ───────────────────────────────────────────────────────────────────

function Planet({
  name, longitude, isHovered,
  onClick, onPointerEnter, onPointerLeave,
}: {
  name: string;
  longitude: number;
  isHovered: boolean;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const radius = ORBITAL_RADII[name] ?? 8;
  const size   = PLANET_SIZES[name]  ?? 0.16;
  const meta   = getPlanetMeta(name as PlanetName);
  const color  = meta.color;
  const pos    = lonToVec3(longitude, radius);
  const meshRef    = useRef<THREE.Mesh>(null);
  const selfRotRef = useRef<THREE.Group>(null);
  const rotSpeed   = ROTATION_SPEEDS[name] ?? 0.03;

  // NASA map when available; procedural fallback otherwise
  const surfaceTex = useMemo(() => {
    const file = TEXTURE_FILES[name];
    return file ? loadPlanetFile(file) : makePlanetTexture(name, color);
  }, [name, color]);

  useFrame((_, dt) => {
    if (selfRotRef.current) selfRotRef.current.rotation.y += rotSpeed * dt;
    if (meshRef.current) {
      const target = isHovered ? 1.18 : 1.0;
      const cur = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(cur + (target - cur) * Math.min(dt * 10, 1));
    }
  });

  return (
    <group position={pos.toArray()}>
      {/* ONE solid sphere, lit by the sun (real day/night terminator). No glow shells. */}
      <group ref={selfRotRef} rotation={[0, 0, 0.41]}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerEnter={(e) => { e.stopPropagation(); onPointerEnter(); }}
          onPointerLeave={() => onPointerLeave()}
        >
          <sphereGeometry args={[size, 64, 64]} />
          <meshStandardMaterial map={surfaceTex} roughness={0.95} metalness={0.0} />
        </mesh>
      </group>

      {/* Hover label */}
      {isHovered && (
        <Html center distanceFactor={18} style={{ pointerEvents: "none" }}>
          <div style={{
            marginTop: -52,
            background: "rgba(3,3,22,0.92)",
            border: `1px solid ${color}55`,
            borderRadius: 12,
            padding: "5px 14px",
            color,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            whiteSpace: "nowrap",
            backdropFilter: "blur(16px)",
            boxShadow: `0 0 20px ${color}30`,
            fontFamily: GLYPH_FONT,
          }}>
            {PLANET_SYMBOLS[name as PlanetName] ?? "✦"} {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Aspect line (pulsing) ────────────────────────────────────────────────────

function AspectLine({
  p1, p2, type, phase,
}: {
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  type: string;
  phase: number;
}) {
  const color = ASPECT_COLORS[type] ?? "#64748b";
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const geometry = useMemo(() => {
    const curve = new THREE.LineCurve3(p1, p2);
    return new THREE.TubeGeometry(curve, 1, 0.013, 6, false);
  }, [p1, p2]);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.25 + Math.sin(clock.elapsedTime * 1.8 + phase) * 0.15;
    }
  });

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial ref={matRef} color={color} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}

// ─── Depth grid — holographic floor plane ─────────────────────────────────────

function DepthGrid() {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(160, 64, 0x2a1e66, 0x14103a);
    g.position.y = -4.2;
    const mats = Array.isArray(g.material) ? g.material : [g.material];
    mats.forEach(m => { m.transparent = true; m.opacity = 0.22; m.depthWrite = false; });
    return g;
  }, []);
  return <primitive object={grid} />;
}

// ─── Zodiac belt ──────────────────────────────────────────────────────────────

const ZODIAC_R = 30;

function ZodiacBelt() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ZODIAC_R - 0.8, ZODIAC_R + 0.8, 256]} />
        <meshBasicMaterial color="#1a0f40" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {Array.from({ length: 12 }).map((_, i) => {
        const rad = (i * 30 * Math.PI) / 180;
        const x1 = (ZODIAC_R - 1.2) * Math.cos(rad), z1 = -(ZODIAC_R - 1.2) * Math.sin(rad);
        const x2 = (ZODIAC_R + 1.2) * Math.cos(rad), z2 = -(ZODIAC_R + 1.2) * Math.sin(rad);
        const mid = new THREE.Vector3((x1 + x2) / 2, 0, (z1 + z2) / 2);
        const len = new THREE.Vector3(x2 - x1, 0, z2 - z1).length();
        const angle = Math.atan2(-(z2 - z1), x2 - x1);
        return (
          <mesh key={i} position={mid.toArray()} rotation={[Math.PI / 2, 0, -angle]}>
            <cylinderGeometry args={[0.025, 0.025, len, 4]} />
            <meshBasicMaterial color={ELEMENT_COLORS[i]} transparent opacity={0.5} />
          </mesh>
        );
      })}

      {ZODIAC_SYMBOLS.map((sym, i) => {
        const midRad = ((i * 30 + 15) * Math.PI) / 180;
        const x = ZODIAC_R * Math.cos(midRad);
        const z = -ZODIAC_R * Math.sin(midRad);
        return (
          <Html key={i} position={[x, 0.2, z]} center distanceFactor={30} style={{ pointerEvents: "none" }}>
            <div style={{ color: ELEMENT_COLORS[i], fontSize: 22, opacity: 0.85, userSelect: "none",
              fontFamily: GLYPH_FONT, textShadow: `0 0 10px ${ELEMENT_COLORS[i]}80` }}>
              {sym}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

// ─── Camera rig ───────────────────────────────────────────────────────────────

interface FlyState {
  active: boolean;
  target: THREE.Vector3 | null;
  planetName: string | null;
  arrived: boolean;
}

function OrreryCamera({
  flyRef,
  onArrived,
  autoRotate,
}: {
  flyRef: React.MutableRefObject<FlyState>;
  onArrived: (name: string) => void;
  autoRotate: boolean;
}) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  useFrame((_, dt) => {
    const ctrl = controlsRef.current;
    const fly  = flyRef.current;
    if (!ctrl) return;

    if (fly.active && fly.target && !fly.arrived) {
      ctrl.enabled = false;

      const toPlanet = fly.target.clone().normalize();
      const goal = fly.target.clone()
        .add(toPlanet.clone().multiplyScalar(3.5))
        .add(new THREE.Vector3(0, 2.0, 0));

      camera.position.lerp(goal, Math.min(dt * 1.4, 1));
      camera.lookAt(fly.target);

      if (camera.position.distanceTo(fly.target) < 6.0) {
        fly.arrived = true;
        const name = fly.planetName!;
        fly.active = false;
        fly.planetName = null;
        fly.target = null;
        if (isMounted.current) onArrived(name);
      }
    } else if (!fly.active) {
      ctrl.enabled = true;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      minDistance={5}
      maxDistance={90}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI * 0.88}
      autoRotate={autoRotate}
      autoRotateSpeed={0.3}
    />
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function OrreryScene({
  chart,
  onNavigate,
  autoRotate,
}: {
  chart?: ChartData;
  onNavigate?: (name: string) => void;
  autoRotate: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null);
  const tier = useMemo(() => detectGpuTier(), []);
  const flyRef = useRef<FlyState>({ active: false, target: null, planetName: null, arrived: false });

  const planets = useMemo(() => {
    if (chart?.planets) {
      return chart.planets
        .filter(p => ORBITAL_RADII[p.name] !== undefined)
        .map(p => ({ name: p.name, longitude: p.longitude }));
    }
    return Object.entries(DEMO_LONGITUDES).map(([name, lon]) => ({ name, longitude: lon }));
  }, [chart]);

  const posMap = useMemo(() => {
    const map: Record<string, THREE.Vector3> = {};
    planets.forEach(p => {
      map[p.name] = lonToVec3(p.longitude, ORBITAL_RADII[p.name] ?? 8);
    });
    return map;
  }, [planets]);

  const aspects = useMemo(() => chart?.aspects ?? DEMO_ASPECTS, [chart]);

  const handlePlanetClick = (name: string) => {
    const pos = posMap[name];
    if (!pos) return;
    flyRef.current = { active: true, target: pos.clone(), planetName: name, arrived: false };
  };

  const saturnPos = posMap["Saturn"];

  return (
    <>
      <color attach="background" args={["#05050E"]} />

      <Skybox />
      <Stars radius={170} depth={50} count={3500} factor={2.8} saturation={0.1} fade speed={0.25} />

      <Sun onCore={setSunMesh} />

      {planets.map(p => {
        const r = ORBITAL_RADII[p.name];
        if (!r) return null;
        const meta = getPlanetMeta(p.name as PlanetName);
        return (
          <group key={p.name}>
            <OrbitRing radius={r} color={meta.color} />
            <OrbitTrail radius={r} longitude={p.longitude} color={meta.color} />
          </group>
        );
      })}

      {saturnPos && <SaturnRings pos={saturnPos} />}

      {aspects.map((asp, i) => {
        const p1 = posMap[asp.planet1];
        const p2 = posMap[asp.planet2];
        if (!p1 || !p2) return null;
        return <AspectLine key={i} p1={p1} p2={p2} type={asp.type} phase={i * 0.9} />;
      })}

      {planets.map(p => (
        <Planet
          key={p.name}
          name={p.name}
          longitude={p.longitude}
          isHovered={hovered === p.name}
          onClick={() => handlePlanetClick(p.name)}
          onPointerEnter={() => setHovered(p.name)}
          onPointerLeave={() => setHovered(null)}
        />
      ))}

      <ZodiacBelt />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, ZODIAC_R - 1.5, 128, 1]} />
        <meshBasicMaterial color="#0d1040" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <OrreryCamera flyRef={flyRef} onArrived={(name) => onNavigate?.(name)} autoRotate={autoRotate} />

      <CinematicFX quality={tier} sun={sunMesh} dof={tier === "high"} bokeh={1.4} bloom={2.0} />
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function SolarSystemOrrery({
  chart,
  onPlanetNavigate,
  autoRotate = false,
  className,
  style,
}: {
  chart?: ChartData;
  onPlanetNavigate?: (name: PlanetName) => void;
  autoRotate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const navigateRef = useRef(onPlanetNavigate);
  useEffect(() => { navigateRef.current = onPlanetNavigate; }, [onPlanetNavigate]);
  const quality = useMemo(() => QUALITY[detectGpuTier()], []);

  return (
    <div className={className} style={{ width: "100%", height: "100%", ...style }}>
      <Canvas
        camera={{ position: [0, 13, 21], fov: 47, near: 0.1, far: 500 }}
        gl={{ antialias: quality.antialias, alpha: false, powerPreference: "high-performance" }}
        dpr={quality.dpr}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <OrreryScene
            chart={chart}
            onNavigate={(name) => navigateRef.current?.(name as PlanetName)}
            autoRotate={autoRotate}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
