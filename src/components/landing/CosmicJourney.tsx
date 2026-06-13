"use client";

/**
 * CosmicJourney — the single continuous WebGL scene behind the landing page.
 * One camera, one spline, five stations: Cosmos → The System → Earth →
 * The Moment → You. Scroll is the only animator. No video anywhere.
 *
 * NASA/SSS texture maps in public/textures. Brand palette only (tokens.ts).
 */

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import * as Astronomy from "astronomy-engine";
import type { MotionValue } from "framer-motion";

// ─── Scene scale ──────────────────────────────────────────────────────────────

const PLANET_DEFS: { name: string; tex: string; radius: number; size: number; body?: Astronomy.Body }[] = [
  { name: "Mercury", tex: "2k_mercury.jpg",          radius: 10, size: 0.30, body: Astronomy.Body.Mercury },
  { name: "Venus",   tex: "2k_venus_atmosphere.jpg", radius: 14, size: 0.55, body: Astronomy.Body.Venus },
  // Earth handled separately — it's a destination, not a prop
  { name: "Mars",    tex: "2k_mars.jpg",             radius: 26, size: 0.45, body: Astronomy.Body.Mars },
  { name: "Jupiter", tex: "2k_jupiter.jpg",          radius: 38, size: 2.6,  body: Astronomy.Body.Jupiter },
  { name: "Saturn",  tex: "2k_saturn.jpg",           radius: 52, size: 2.2,  body: Astronomy.Body.Saturn },
  { name: "Uranus",  tex: "2k_uranus.jpg",           radius: 64, size: 1.1,  body: Astronomy.Body.Uranus },
  { name: "Neptune", tex: "2k_neptune.jpg",          radius: 74, size: 1.05, body: Astronomy.Body.Neptune },
];

const EARTH_ORBIT_R = 20;
const EARTH_SIZE = 1.0;

// Heliocentric ecliptic longitude → scene position (true positions, compressed radii)
function helioLon(body: Astronomy.Body, date: Date): number {
  const v = Astronomy.HelioVector(body, date);
  return Math.atan2(v.y, v.x); // radians, ecliptic frame
}

function onOrbit(lonRad: number, r: number): THREE.Vector3 {
  return new THREE.Vector3(r * Math.cos(lonRad), 0, -r * Math.sin(lonRad));
}

// ─── Shaders ──────────────────────────────────────────────────────────────────

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    float ndl = dot(normalize(vWorldNormal), normalize(uSunDir));
    float dayAmt = smoothstep(-0.12, 0.28, ndl);
    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    // City lights glow warm on the dark side
    vec3 col = mix(night * vec3(1.7, 1.45, 1.05), day, dayAmt);
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
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vViewDir)), uPower);
    gl_FragColor = vec4(uColor, f * uIntensity);
  }
`;

// ─── Skybox — Milky Way, very dim, brand-tinted ──────────────────────────────

function Sky() {
  const [stars, nebula] = useLoader(THREE.TextureLoader, [
    "/textures/space/8k_stars_milky_way.jpg",
    "/textures/space/nebula_brand.png",
  ]);
  stars.colorSpace = THREE.SRGBColorSpace;
  nebula.colorSpace = THREE.SRGBColorSpace;
  return (
    <>
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[400, 48, 48]} />
        <meshBasicMaterial map={stars} side={THREE.BackSide} color="#9a93b8" />
      </mesh>
      {/* Brand nebula — additive haze layer over the star sphere */}
      <mesh scale={[-1, 1, 1]} rotation={[0.15, 2.1, 0.1]}>
        <sphereGeometry args={[395, 32, 32]} />
        <meshBasicMaterial map={nebula} side={THREE.BackSide} transparent opacity={0.55}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}

// ─── Sun ──────────────────────────────────────────────────────────────────────

function JourneySun() {
  const tex = useLoader(THREE.TextureLoader, "/textures/planets/2k_sun.jpg");
  tex.colorSpace = THREE.SRGBColorSpace;
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02; });

  const coronaUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color("#E8C572") },
    uPower: { value: 2.2 },
    uIntensity: { value: 1.0 },
  }), []);

  return (
    <group>
      <pointLight color="#fff5e0" intensity={5.5} distance={400} decay={0.6} />
      <mesh ref={ref}>
        <sphereGeometry args={[3.2, 48, 48]} />
        <meshBasicMaterial map={tex} color="#ffe9b8" />
      </mesh>
      <mesh>
        <sphereGeometry args={[4.6, 32, 32]} />
        <shaderMaterial vertexShader={FRESNEL_VERT} fragmentShader={FRESNEL_FRAG}
          uniforms={coronaUniforms} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ─── Textured planet prop ─────────────────────────────────────────────────────

function PlanetProp({ def, date }: { def: typeof PLANET_DEFS[number]; date: Date }) {
  const tex = useLoader(THREE.TextureLoader, `/textures/planets/${def.tex}`);
  tex.colorSpace = THREE.SRGBColorSpace;
  const pos = useMemo(() => onOrbit(helioLon(def.body!, date), def.radius), [def, date]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.05; });

  return (
    <group position={pos}>
      <mesh ref={ref}>
        <sphereGeometry args={[def.size, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.9} metalness={0} />
      </mesh>
      {def.name === "Saturn" && <SaturnRing size={def.size} />}
      {/* Faint orbit ring */}
      <group position={pos.clone().negate()}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[def.radius - 0.02, def.radius + 0.02, 256]} />
          <meshBasicMaterial color="#C8A55B" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function SaturnRing({ size }: { size: number }) {
  const tex = useLoader(THREE.TextureLoader, "/textures/planets/2k_saturn_ring_alpha.png");
  // Map the ring strip radially: rebuild UVs so u follows radius
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(size * 1.25, size * 2.3, 128);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const r = v3.length();
      uv.setXY(i, (r - size * 1.25) / (size * 2.3 - size * 1.25), 0.5);
    }
    return g;
  }, [size]);
  return (
    <mesh geometry={geo} rotation={[Math.PI / 2.25, 0, 0.3]}>
      <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} depthWrite={false} opacity={0.95} />
    </mesh>
  );
}

// ─── Earth — the destination ──────────────────────────────────────────────────

function JourneyEarth({ position, sunDir }: { position: THREE.Vector3; sunDir: THREE.Vector3 }) {
  const [day, night, clouds] = useLoader(THREE.TextureLoader, [
    "/textures/planets/2k_earth_daymap.jpg",
    "/textures/planets/2k_earth_nightmap.jpg",
    "/textures/planets/2k_earth_clouds.jpg",
  ]);
  day.colorSpace = THREE.SRGBColorSpace;
  night.colorSpace = THREE.SRGBColorSpace;

  const uniforms = useMemo(() => ({
    uDay: { value: day },
    uNight: { value: night },
    uSunDir: { value: sunDir.clone() },
  }), [day, night, sunDir]);

  const atmoUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color("#6FA8FF") },
    uPower: { value: 3.4 },
    uIntensity: { value: 0.9 },
  }), []);

  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (earthRef.current) earthRef.current.rotation.y += dt * 0.012;
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.017;
  });

  return (
    <group position={position}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_SIZE, 96, 96]} />
        <shaderMaterial vertexShader={EARTH_VERT} fragmentShader={EARTH_FRAG} uniforms={uniforms} />
      </mesh>
      <mesh ref={cloudRef}>
        <sphereGeometry args={[EARTH_SIZE * 1.012, 64, 64]} />
        <meshStandardMaterial map={clouds} transparent opacity={0.55} depthWrite={false}
          blending={THREE.AdditiveBlending} roughness={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_SIZE * 1.04, 48, 48]} />
        <shaderMaterial vertexShader={FRESNEL_VERT} fragmentShader={FRESNEL_FRAG}
          uniforms={atmoUniforms} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
      </mesh>
    </group>
  );
}

// ─── Camera rig — the journey ─────────────────────────────────────────────────
// Spline keyframes: where the camera is and what it looks at, per scroll phase.

function CameraRig({ progress, earthPos }: { progress: MotionValue<number>; earthPos: THREE.Vector3 }) {
  const { camera } = useThree();
  const drift = useRef(0);

  const { posCurve, lookKeys } = useMemo(() => {
    const e = earthPos;
    const positions = [
      new THREE.Vector3(0, 34, 110),                       // 0.00 hero — wide cosmos
      new THREE.Vector3(46, 14, 64),                        // 0.20 entering the system (Saturn side)
      new THREE.Vector3(24, 5, 30),                         // 0.42 inner system flythrough
      new THREE.Vector3(e.x + 6.5, 2.6, e.z + 6.5),         // 0.62 Earth approach
      new THREE.Vector3(e.x + 2.1, 0.7, e.z + 2.1),         // 0.82 close orbit
      new THREE.Vector3(e.x + 2.9, 1.5, e.z + 3.4),         // 1.00 settle — the moment
    ];
    const looks = [
      new THREE.Vector3(0, 0, 0),       // at the sun
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(e.x * 0.6, 0, e.z * 0.6),
      e.clone(),
      e.clone(),
      e.clone(),
    ];
    return { posCurve: new THREE.CatmullRomCurve3(positions, false, "centripetal", 0.6), lookKeys: looks };
  }, [earthPos]);

  useFrame((_, dt) => {
    drift.current += dt;
    const t = Math.min(1, Math.max(0, progress.get()));

    // Position along spline + tiny ambient drift so the frame is never dead
    const p = posCurve.getPoint(t);
    p.x += Math.sin(drift.current * 0.13) * 0.35 * (1 - t * 0.7);
    p.y += Math.cos(drift.current * 0.11) * 0.25 * (1 - t * 0.7);
    camera.position.lerp(p, Math.min(dt * 5, 1));

    // Look target: interpolate between keyframes
    const seg = Math.min(lookKeys.length - 2, Math.floor(t * (lookKeys.length - 1)));
    const segT = t * (lookKeys.length - 1) - seg;
    const look = lookKeys[seg].clone().lerp(lookKeys[seg + 1], segT);
    camera.lookAt(look);
  });

  return null;
}

// ─── Scene assembly ───────────────────────────────────────────────────────────

function JourneyScene({ progress }: { progress: MotionValue<number> }) {
  const date = useMemo(() => new Date(), []);
  const earthPos = useMemo(() => onOrbit(helioLon(Astronomy.Body.Earth, date), EARTH_ORBIT_R), [date]);
  const sunDir = useMemo(() => earthPos.clone().negate().normalize(), [earthPos]);

  return (
    <>
      <ambientLight intensity={0.07} color="#1a1535" />
      <Sky />
      <JourneySun />
      {PLANET_DEFS.map(def => <PlanetProp key={def.name} def={def} date={date} />)}
      <JourneyEarth position={earthPos} sunDir={sunDir} />
      {/* Earth orbit ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[EARTH_ORBIT_R - 0.025, EARTH_ORBIT_R + 0.025, 256]} />
        <meshBasicMaterial color="#C8A55B" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <CameraRig progress={progress} earthPos={earthPos} />
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function CosmicJourney({ progress, quality = "high" }: {
  progress: MotionValue<number>;
  quality?: "high" | "low";
}) {
  return (
    <Canvas
      camera={{ position: [0, 34, 110], fov: 46, near: 0.1, far: 900 }}
      dpr={quality === "high" ? [1, 2] : [1, 1.25]}
      gl={{ antialias: quality === "high", alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, background: "#08080F" }}
    >
      <color attach="background" args={["#08080F"]} />
      <Suspense fallback={null}>
        <JourneyScene progress={progress} />
      </Suspense>
    </Canvas>
  );
}
