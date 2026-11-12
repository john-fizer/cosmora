"use client";

/**
 * LivingEarthHero — the home hero's background. Replaces the pre-rendered
 * Saturn video loop with a real-time Earth: day/night terminator with city
 * lights, screen-space terrain relief (Schüler's derivative technique — no
 * bump texture needed), a drifting cloud shell,
 * Fresnel atmosphere, a Milky Way + nebula skybox, a twinkling starfield,
 * distant background planets, and gold "radar ping" markers over land (the
 * astrocartography motif, Cosmora's own data stitched into the scene). One
 * continuous rotation — never a boomerang — plus a one-time rise-in and
 * cursor parallax.
 */

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useMemo, useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";
import { CinematicFX } from "@/components/three/postfx/CinematicFX";
import { detectGpuTier, type GpuTier } from "@/lib/design/gpuTier";
import { COLOR } from "@/lib/design/tokens";

const SUN_DIR = new THREE.Vector3(-4, 5, 4).normalize();
const EARTH_R = 2.15;
const BASE_POS = new THREE.Vector3(2.35, -1.05, 0);

// ─── Shaders — day/night terminator, real ocean mask, terrain relief ────────

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewPos;
  varying vec3 vViewNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewPos;
  varying vec3 vViewNormal;

  void main() {
    vec3 N = normalize(vWorldNormal);
    float ndl = dot(N, normalize(uSunDir));
    float dayAmt = smoothstep(-0.12, 0.28, ndl);

    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    // No reliable specular/land mask shipped with these textures — derive
    // water from the day map itself (oceans read distinctly blue-dominant).
    float waterMask = clamp((day.b - max(day.r, day.g)) * 6.0 + 0.1, 0.0, 1.0);

    // Screen-space terrain relief (Schüler technique): perturb the shading
    // normal from the day map's luminance gradient — real coastlines and
    // mountains cast shade with no bump texture or GLTF needed.
    float terrH = dot(day, vec3(0.299, 0.587, 0.114)) * (1.0 - waterMask);
    vec3 vN = normalize(vViewNormal);
    vec3 sigX = dFdx(vViewPos), sigY = dFdy(vViewPos);
    vec3 r1 = cross(sigY, vN), r2 = cross(vN, sigX);
    float det = dot(sigX, r1);
    vec3 grad = sign(det) * (dFdx(terrH) * r1 + dFdy(terrH) * r2);
    vec3 bumped = normalize(abs(det) * vN - 0.4 * grad);
    vec3 viewSunDir = normalize((viewMatrix * vec4(normalize(uSunDir), 0.0)).xyz);
    float relief = dot(bumped, viewSunDir) - ndl;

    vec3 col = mix(night * vec3(1.55, 1.3, 0.85), day, dayAmt);
    col *= clamp(1.0 + relief * 12.0 * dayAmt, 0.6, 1.5);

    // Ocean glint — true specular mask, tight Blinn-style highlight
    float glint = pow(max(ndl, 0.0), 28.0) * waterMask;
    col += glint * vec3(1.0, 0.95, 0.8) * 0.6;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const FRESNEL_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRESNEL_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vViewDir)), uPower);
    vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 1.0, vViewDir.y * 0.5 + 0.5));
    gl_FragColor = vec4(col, f * uIntensity);
  }
`;

// ─── Sky — Milky Way + brand nebula skybox behind the globe ──────────────────

function Sky() {
  const [starsTex, nebula] = useLoader(THREE.TextureLoader, [
    "/textures/space/8k_stars_milky_way.jpg",
    "/textures/space/nebula_brand.png",
  ]);
  starsTex.colorSpace = THREE.SRGBColorSpace;
  nebula.colorSpace = THREE.SRGBColorSpace;
  return (
    <>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[220, 48, 48]} />
        <meshBasicMaterial map={starsTex} side={THREE.BackSide} color="#8a84ad" />
      </mesh>
      <mesh scale={[-1, 1, 1]} rotation={[0.2, 1.4, 0.1]}>
        <sphereGeometry args={[216, 32, 32]} />
        <meshBasicMaterial map={nebula} side={THREE.BackSide} transparent opacity={0.3}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}

// ─── Distant background planets — the wider solar system, far and soft ──────

// Kept high and left — clear of both the hero copy and Earth's own bulk.
// 8k maps + real lighting (see the scene's directional/ambient lights below) —
// the earlier flat, unlit material read as a sticker, not a distant world.
const BG_PLANETS: { tex: string; pos: [number, number, number]; size: number }[] = [
  { tex: "8k_mars.jpg", pos: [-7, 10.5, -38], size: 0.55 },
  { tex: "8k_jupiter.jpg", pos: [-2.2, 8.2, -50], size: 0.95 },
  { tex: "8k_saturn.jpg", pos: [-12.5, 14.5, -66], size: 0.7 },
];

// Slow elliptical drift + a soft breathing glow/fade — distant worlds that live
// and move, instead of sitting frozen in the frame. Never fully vanishes (just
// dims toward the haze and swims back) so it never reads as a hard pop.
function BgPlanet({ tex, pos, size, phase }: { tex: string; pos: [number, number, number]; size: number; phase: number }) {
  const map = useLoader(THREE.TextureLoader, `/textures/planets/${tex}`);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const base = useRef(new THREE.Vector3(...pos));
  useFrame((state, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.012;
    const t = state.clock.elapsedTime * 0.05 + phase;
    ref.current.position.x = base.current.x + Math.sin(t) * 1.7;
    ref.current.position.y = base.current.y + Math.cos(t * 0.64) * 1.0;
    ref.current.position.z = base.current.z + Math.sin(t * 0.37) * 1.4;
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.45 + phase) * 0.04;
    ref.current.scale.setScalar(breathe);
    if (matRef.current) {
      const fade = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.52 + phase * 1.7));
      matRef.current.opacity = fade;
      matRef.current.emissiveIntensity = 0.12 + fade * 0.3;
    }
  });
  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[size, 48, 48]} />
      <meshStandardMaterial ref={matRef} map={map} roughness={1} metalness={0}
        transparent opacity={1} emissive="#8fa3ff" emissiveIntensity={0.15} />
    </mesh>
  );
}

function BackgroundPlanets() {
  return <>{BG_PLANETS.map((p, i) => <BgPlanet key={p.tex} {...p} phase={i * 2.4} />)}</>;
}

// ─── Gold radar-ping markers — a handful of real cities, land only ───────────

const MARKER_LATLON: [number, number][] = [
  [51.5, -0.1],   // London
  [40.7, -74.0],  // New York
  [35.7, 139.7],  // Tokyo
  [-33.9, 151.2], // Sydney
  [30.0, 31.2],   // Cairo
  [-22.9, -43.2], // Rio
  [19.1, 72.9],   // Mumbai
  [64.1, -21.9],  // Reykjavik
  [39.9, 116.4],  // Beijing
  [19.4, -99.1],  // Mexico City
];

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (-lon * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(latRad) * Math.cos(lonRad),
    r * Math.sin(latRad),
    r * Math.cos(latRad) * Math.sin(lonRad)
  );
}

const MARKER_VERT = /* glsl */ `
  attribute float seed;
  uniform float uSize;
  varying float vSeed;
  void main() {
    vSeed = seed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (28.0 / max(-mv.z, 0.1));
    gl_Position = projectionMatrix * mv;
  }
`;

const MARKER_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying float vSeed;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.4, 0.0, d);
    float ph = fract(uTime * 0.3 + vSeed);
    float ring = smoothstep(0.1, 0.0, abs(d - ph)) * (1.0 - ph);
    gl_FragColor = vec4(uColor, clamp(core * 1.4 + ring, 0.0, 1.0));
  }
`;

function GoldMarkers({ radius }: { radius: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(MARKER_LATLON.length * 3);
    const seed = new Float32Array(MARKER_LATLON.length);
    MARKER_LATLON.forEach(([lat, lon], i) => {
      const v = latLonToVec3(lat, lon, radius * 1.01);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      seed[i] = Math.random();
    });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [radius]);

  const uniforms = useMemo(() => ({
    uSize: { value: 3.2 },
    uColor: { value: new THREE.Color(COLOR.solar) },
    uTime: { value: 0 },
  }), []);

  useFrame((_, dt) => { uniforms.uTime.value += dt; });

  return (
    <points geometry={geo}>
      <shaderMaterial
        vertexShader={MARKER_VERT} fragmentShader={MARKER_FRAG} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── The globe ─────────────────────────────────────────────────────────────

const TEX_SET: Record<GpuTier, { day: string; night: string; clouds: string }> = {
  high: { day: "8k_earth_daymap.jpg", night: "8k_earth_nightmap.jpg", clouds: "8k_earth_clouds.jpg" },
  low: { day: "2k_earth_daymap.jpg", night: "2k_earth_nightmap.jpg", clouds: "2k_earth_clouds.jpg" },
};

function Globe({ segments, tier }: { segments: number; tier: GpuTier }) {
  const set = TEX_SET[tier];
  const [day, night, clouds] = useLoader(THREE.TextureLoader, [
    `/textures/planets/${set.day}`,
    `/textures/planets/${set.night}`,
    `/textures/planets/${set.clouds}`,
  ]);
  day.colorSpace = THREE.SRGBColorSpace; day.anisotropy = 8;
  night.colorSpace = THREE.SRGBColorSpace;

  const earthUniforms = useMemo(() => ({
    uDay: { value: day }, uNight: { value: night }, uSunDir: { value: SUN_DIR },
  }), [day, night]);

  const atmoUniforms = useMemo(() => ({
    uColorA: { value: new THREE.Color(COLOR.oracle) },
    uColorB: { value: new THREE.Color(COLOR.solar) },
    uPower: { value: 3.1 }, uIntensity: { value: 0.95 },
  }), []);

  const groupRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  const parallax = useRef({ x: 0, y: 0 });
  const parallaxTarget = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      parallaxTarget.current.x = e.clientX / window.innerWidth - 0.5;
      parallaxTarget.current.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    if (earthRef.current) earthRef.current.rotation.y += dt * 0.045;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.062;

    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - start.current) / 1.7);
    const eased = 1 - Math.pow(1 - t, 3);

    const p = parallax.current, pt = parallaxTarget.current;
    p.x += (pt.x - p.x) * Math.min(1, dt * 2.2);
    p.y += (pt.y - p.y) * Math.min(1, dt * 2.2);

    if (groupRef.current) {
      groupRef.current.position.set(
        BASE_POS.x - p.x * 0.5,
        BASE_POS.y - (1 - eased) * 1.1 - p.y * 0.35,
        BASE_POS.z
      );
    }
  });

  return (
    <group ref={groupRef} position={BASE_POS}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_R, segments, segments]} />
        <shaderMaterial vertexShader={EARTH_VERT} fragmentShader={EARTH_FRAG} uniforms={earthUniforms} />
        <GoldMarkers radius={EARTH_R} />
      </mesh>
      <mesh ref={cloudRef}>
        <sphereGeometry args={[EARTH_R * 1.012, segments * 0.7, segments * 0.7]} />
        <meshStandardMaterial map={clouds} transparent opacity={0.5} depthWrite={false}
          blending={THREE.AdditiveBlending} roughness={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_R * 1.045, segments * 0.5, segments * 0.5]} />
        <shaderMaterial vertexShader={FRESNEL_VERT} fragmentShader={FRESNEL_FRAG}
          uniforms={atmoUniforms} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
      </mesh>
    </group>
  );
}

export default function LivingEarthHero() {
  const tier = useMemo<GpuTier>(() => (typeof window !== "undefined" ? detectGpuTier() : "high"), []);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const id = setTimeout(() => setVisible(true), 60); return () => clearTimeout(id); }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: COLOR.void }}>
      <div style={{ position: "absolute", inset: 0, opacity: visible ? 1 : 0, filter: visible ? "blur(0px)" : "blur(6px)", transition: "opacity 1.4s ease, filter 1.4s ease" }}>
        <Canvas
          camera={{ position: [0, 0, 8.4], fov: 38, near: 0.1, far: 600 }}
          dpr={tier === "high" ? [1, 2] : [1, 1.25]}
          gl={{ antialias: tier === "high", alpha: false }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={[COLOR.void]} />
          {/* The Earth and cloud-veil shaders are fully self-lit, but the
              background planets and the globe's own cloud shell use standard
              PBR materials — without a real light they rendered flat/near-black. */}
          <ambientLight intensity={0.4} color="#9fb4ff" />
          <directionalLight position={SUN_DIR.toArray()} intensity={1.8} color="#fff2da" />
          <Suspense fallback={null}>
            <Sky />
            <Stars radius={60} depth={25} count={tier === "high" ? 4200 : 1600} factor={1.1} saturation={0} fade speed={0.25} />
            {tier === "high" && <BackgroundPlanets />}
            <Globe segments={tier === "high" ? 96 : 48} tier={tier} />
            <CinematicFX quality={tier} bloom={1.15} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
