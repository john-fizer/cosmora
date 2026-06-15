"use client";

/**
 * HomeCosmos — the home page's real-3D scroll. ONE camera flies through a real
 * solar system; scroll is the only animator. It opens tight on a photoreal
 * Saturn, then drifts INWARD past the planets — because the camera translates
 * through depth, every planet parallaxes (near ones sweep past fast, far ones
 * drift slow). That depth-parallax is what makes it read as a real journey,
 * not a flat image being pushed around.
 *
 * It stays a backdrop (it does NOT land on Earth) — the full dive-to-Earth into
 * the interactive chart is reserved for the "Enter Cosmora" moment.
 */

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import PhotorealSaturn from "@/components/three/PhotorealSaturn";
import { CinematicFX } from "@/components/three/postfx/CinematicFX";

const SUN_POS: [number, number, number] = [-22, 12, -120];

// Planet props laid out in depth (-z) so the camera flies through them.
const PROPS: { name: string; tex: string; pos: [number, number, number]; size: number; spin: number }[] = [
  { name: "Jupiter", tex: "8k_jupiter.jpg", pos: [-9, -1.5, -40], size: 3.4, spin: 0.05 },
  { name: "Mars",    tex: "8k_mars.jpg",    pos: [5, 1.5, -62],   size: 0.8, spin: 0.06 },
  { name: "Earth",   tex: "8k_earth_daymap.jpg", pos: [-4, 0, -74], size: 1.0, spin: 0.04 },
  { name: "Venus",   tex: "2k_venus_atmosphere.jpg", pos: [3, -1, -86], size: 0.8, spin: 0.03 },
  { name: "Mercury", tex: "8k_mars.jpg",    pos: [-2, 0.5, -96],  size: 0.5, spin: 0.04 },
];

const SATURN_POS: [number, number, number] = [7, 0.5, -12];

// ── Skybox — Milky Way + brand nebula, dim ───────────────────────────────────
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
        <sphereGeometry args={[600, 48, 48]} />
        <meshBasicMaterial map={stars} side={THREE.BackSide} color="#8c86ad" />
      </mesh>
      <mesh scale={[-1, 1, 1]} rotation={[0.15, 2.1, 0.1]}>
        <sphereGeometry args={[594, 32, 32]} />
        <meshBasicMaterial map={nebula} side={THREE.BackSide} transparent opacity={0.5}
          blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}

function Sun() {
  const tex = useLoader(THREE.TextureLoader, "/textures/planets/2k_sun.jpg");
  tex.colorSpace = THREE.SRGBColorSpace;
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02; });
  return (
    <group position={SUN_POS}>
      <pointLight color="#fff5e0" intensity={6} distance={600} decay={0.5} />
      <mesh ref={ref}>
        <sphereGeometry args={[7, 48, 48]} />
        <meshBasicMaterial map={tex} color="#ffe9b8" />
      </mesh>
    </group>
  );
}

function PlanetProp({ def }: { def: typeof PROPS[number] }) {
  const tex = useLoader(THREE.TextureLoader, `/textures/planets/${def.tex}`);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * def.spin; });
  return (
    <mesh ref={ref} position={def.pos}>
      <sphereGeometry args={[def.size, 96, 96]} />
      <meshStandardMaterial map={tex} roughness={0.92} metalness={0} />
    </mesh>
  );
}

// ── Camera rig — Saturn → inward, scroll-driven, smooth curves ────────────────
function CameraRig({ progress }: { progress: MotionValue<number> }) {
  const { camera } = useThree();
  const drift = useRef(0);
  const lookRef = useRef<THREE.Vector3 | null>(null);

  const { posCurve, lookCurve } = useMemo(() => {
    const positions = [
      new THREE.Vector3(3.0, 1.2, 2),    // 0.00 — tight on Saturn, framed right
      new THREE.Vector3(1.0, 1.6, -14),  // leaving Saturn, turning inward
      new THREE.Vector3(-2.0, 1.0, -34), // mid-flight, Jupiter sweeping past
      new THREE.Vector3(1.5, 0.5, -52),  // deeper into the field
      new THREE.Vector3(0.0, 0.3, -66),  // 1.00 — deep, sun glowing ahead (backdrop end)
    ];
    const looks = [
      new THREE.Vector3(7, 0.5, -12),    // Saturn (right of frame)
      new THREE.Vector3(-9, -1.5, -40),  // toward Jupiter / inward
      new THREE.Vector3(0, 0, -64),
      new THREE.Vector3(-2, 0, -86),
      new THREE.Vector3(-10, 4, -120),   // toward the distant sun
    ];
    return {
      posCurve: new THREE.CatmullRomCurve3(positions, false, "centripetal", 0.5),
      lookCurve: new THREE.CatmullRomCurve3(looks, false, "centripetal", 0.5),
    };
  }, []);

  useFrame((_, dt) => {
    drift.current += dt;
    const t = Math.min(1, Math.max(0, progress.get()));
    const k = Math.min(dt * 3.5, 1);

    const p = posCurve.getPoint(t);
    const fade = 0.4 + 0.6 * (1 - t); // gentle idle drift, never fully still
    p.x += Math.sin(drift.current * 0.13) * 0.35 * fade;
    p.y += Math.cos(drift.current * 0.11) * 0.25 * fade;
    camera.position.lerp(p, k);

    const desired = lookCurve.getPoint(t);
    if (!lookRef.current) lookRef.current = desired.clone();
    else lookRef.current.lerp(desired, k);
    camera.lookAt(lookRef.current);
  });

  return null;
}

function Scene({ progress }: { progress: MotionValue<number> }) {
  return (
    <>
      <ambientLight intensity={0.06} color="#1a1535" />
      <Sky />
      <Sun />
      <PhotorealSaturn size={4.2} position={SATURN_POS} sunPos={SUN_POS} />
      {PROPS.map(def => <PlanetProp key={def.name} def={def} />)}
      <CameraRig progress={progress} />
    </>
  );
}

export default function HomeCosmos({ progress, quality = "high" }: {
  progress: MotionValue<number>;
  quality?: "high" | "low";
}) {
  return (
    <Canvas
      camera={{ position: [3, 1.2, 2], fov: 46, near: 0.1, far: 1400 }}
      dpr={quality === "high" ? [1, 2] : [1, 1.25]}
      gl={{ antialias: quality === "high", alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, background: "#08080F" }}
    >
      <color attach="background" args={["#08080F"]} />
      <Suspense fallback={null}>
        <Scene progress={progress} />
        <CinematicFX quality={quality} bloom={1.1} />
      </Suspense>
    </Canvas>
  );
}
