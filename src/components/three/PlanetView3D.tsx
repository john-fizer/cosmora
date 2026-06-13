"use client";

/**
 * PlanetView3D — a single realistic planet rising over the horizon. Real NASA
 * texture per planet, lit by a key light (day/night terminator), atmospheric
 * Fresnel rim, slow rotation, on a star/nebula field, graded by CinematicFX.
 * Used on the planet detail page in place of the old flat CSS orb.
 */

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { CinematicFX } from "./postfx/CinematicFX";
import { detectGpuTier } from "@/lib/design/gpuTier";

const TEX: Record<string, string> = {
  Sun: "2k_sun.jpg", Moon: "2k_moon.jpg", Mercury: "2k_mercury.jpg",
  Venus: "2k_venus_atmosphere.jpg", Mars: "2k_mars.jpg", Jupiter: "2k_jupiter.jpg",
  Saturn: "2k_saturn.jpg", Uranus: "2k_uranus.jpg", Neptune: "2k_neptune.jpg",
  Earth: "2k_earth_daymap.jpg",
};

const RIM_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }
`;
const RIM_FRAG = /* glsl */ `
  varying vec3 vN; varying vec3 vV; uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
  void main(){ float f = pow(1.0 - abs(dot(vN,vV)), uPower); gl_FragColor = vec4(uColor, f*uIntensity); }
`;

function tex(file: string) {
  const t = new THREE.TextureLoader().load(`/textures/planets/${file}`);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function SaturnRing({ R }: { R: number }) {
  const ringTex = useLoader(THREE.TextureLoader, "/textures/planets/2k_saturn_ring_alpha.png");
  const geo = useMemo(() => {
    const inner = R * 1.25, outer = R * 2.2;
    const g = new THREE.RingGeometry(inner, outer, 180);
    const pos = g.attributes.position, uv = g.attributes.uv; const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5); }
    return g;
  }, [R]);
  return (
    <mesh geometry={geo} rotation={[Math.PI / 2.2, 0, 0]}>
      <meshBasicMaterial map={ringTex} transparent side={THREE.DoubleSide} depthWrite={false} opacity={0.95} />
    </mesh>
  );
}

function Body({ name, color, atmoColor }: { name: string; color: string; atmoColor: string }) {
  const R = 4;
  const file = TEX[name];
  const surfaceTex = useMemo(() => (file ? tex(file) : null), [file]);
  const isStar = name === "Sun";
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.03; });

  const rimUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(atmoColor) }, uPower: { value: 3.2 }, uIntensity: { value: 0.85 },
  }), [atmoColor]);

  return (
    // Sit the planet low so the top hemisphere reads as a horizon
    <group position={[0, -3.4, 0]} rotation={[0.12, 0, 0.08]}>
      <mesh ref={ref}>
        <sphereGeometry args={[R, 128, 128]} />
        {surfaceTex
          ? (isStar
            ? <meshBasicMaterial map={surfaceTex} color="#ffdca0" toneMapped={false} />
            : <meshStandardMaterial map={surfaceTex} roughness={0.95} metalness={0} />)
          : <meshStandardMaterial color={color} roughness={0.9} metalness={0} />}
      </mesh>
      {!isStar && (
        <mesh>
          <sphereGeometry args={[R * 1.03, 64, 64]} />
          <shaderMaterial vertexShader={RIM_VERT} fragmentShader={RIM_FRAG} uniforms={rimUniforms}
            transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
        </mesh>
      )}
      {name === "Saturn" && <SaturnRing R={R} />}
    </group>
  );
}

function Stars() {
  const geo = useMemo(() => {
    const N = 500, pos = new Float32Array(N * 3);
    const h = (n: number) => ((Math.sin(n * 127.1 + 311.7) * 43758.5) % 1 + 1) % 1;
    for (let i = 0; i < N; i++) {
      const r = 18 + h(i) * 30, th = h(i + 50) * Math.PI * 2, ph = (h(i + 99) - 0.5) * Math.PI;
      pos[i * 3] = r * Math.cos(ph) * Math.cos(th); pos[i * 3 + 1] = Math.abs(r * Math.sin(ph)) * 0.6 + 2; pos[i * 3 + 2] = r * Math.cos(ph) * Math.sin(th) - 6;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return g;
  }, []);
  return <points geometry={geo}><pointsMaterial color="#BFB6E8" size={0.06} sizeAttenuation transparent opacity={0.5} /></points>;
}

export default function PlanetView3D({ name, color, atmoColor }: { name: string; color: string; atmoColor?: string }) {
  const tier = useMemo(() => (typeof window !== "undefined" ? detectGpuTier() : "high"), []);
  const isStar = name === "Sun";
  return (
    <Canvas
      camera={{ position: [0, 0.4, 8], fov: 42, near: 0.1, far: 100 }}
      dpr={tier === "high" ? [1, 2] : [1, 1.25]}
      gl={{ antialias: tier === "high", alpha: true }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {/* Key light from upper-left → real terminator. The Sun is its own light. */}
      {!isStar && <directionalLight position={[-4, 5, 4]} intensity={2.8} color="#fff2da" />}
      <ambientLight intensity={isStar ? 0.6 : 0.12} color="#1c1838" />
      <Suspense fallback={null}>
        <Stars />
        <Body name={name} color={color} atmoColor={atmoColor ?? color} />
        <CinematicFX quality={tier} bloom={isStar ? 2.0 : 1.2} />
      </Suspense>
    </Canvas>
  );
}
