"use client";

/**
 * ScrollPlanet — the home hero's through-line: a real planet spinning on its
 * tilted axis. As the page scrolls, it glides across the screen and resizes
 * (right→left→center, big→small→mid) tying the marketing sections into one
 * story. Fixed canvas behind the content. Earth: day map + city-light nights
 * + clouds + atmosphere.
 */

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import { detectGpuTier } from "@/lib/design/gpuTier";

const RIM_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }
`;
const RIM_FRAG = /* glsl */ `
  varying vec3 vN; varying vec3 vV; uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
  void main(){ float f = pow(1.0 - abs(dot(vN,vV)), uPower); gl_FragColor = vec4(uColor, f*uIntensity); }
`;

// Keyframes the planet travels through across the page scroll [0..1]:
// [screenX, screenY, scale]
const KEYS: [number, number, number, number][] = [
  [0.00,  2.5,  0.1, 1.25],  // hero — right, large
  [0.24, -2.6,  0.5, 0.72],  // features — left, small
  [0.48,  0.0,  0.0, 1.05],  // pricing — center, mid
  [0.72,  2.3, -0.3, 0.66],  // faq — right, small
  [1.00,  0.0,  0.0, 1.30],  // cta — center, large
];

function sample(p: number): { x: number; y: number; s: number } {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (p >= KEYS[i][0] && p <= KEYS[i + 1][0]) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  const span = b[0] - a[0] || 1;
  const t = THREE.MathUtils.clamp((p - a[0]) / span, 0, 1);
  const e = t * t * (3 - 2 * t); // smoothstep
  return { x: a[1] + (b[1] - a[1]) * e, y: a[2] + (b[2] - a[2]) * e, s: a[3] + (b[3] - a[3]) * e };
}

function Earth({ progress }: { progress?: MotionValue<number> }) {
  const [day, night, clouds] = useLoader(THREE.TextureLoader, [
    "/textures/planets/2k_earth_daymap.jpg",
    "/textures/planets/2k_earth_nightmap.jpg",
    "/textures/planets/2k_earth_clouds.jpg",
  ]);
  useMemo(() => { day.colorSpace = THREE.SRGBColorSpace; night.colorSpace = THREE.SRGBColorSpace; }, [day, night]);

  const group = useRef<THREE.Group>(null);
  const earth = useRef<THREE.Mesh>(null);
  const cloud = useRef<THREE.Mesh>(null);

  const rimUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color("#6FA8FF") }, uPower: { value: 3.2 }, uIntensity: { value: 0.9 },
  }), []);

  useFrame((_, dt) => {
    if (earth.current) earth.current.rotation.y += dt * 0.05;
    if (cloud.current) cloud.current.rotation.y += dt * 0.065;
    if (group.current && progress) {
      const { x, y, s } = sample(THREE.MathUtils.clamp(progress.get(), 0, 1));
      group.current.position.x += (x - group.current.position.x) * Math.min(dt * 3, 1);
      group.current.position.y += (y - group.current.position.y) * Math.min(dt * 3, 1);
      const cs = group.current.scale.x + (s - group.current.scale.x) * Math.min(dt * 3, 1);
      group.current.scale.setScalar(cs);
    }
  });

  return (
    <group ref={group} position={[2.5, 0.1, 0]} scale={1.25} rotation={[0, 0, 0.41]}>
      <mesh ref={earth}>
        <sphereGeometry args={[1.6, 96, 96]} />
        {/* day side lit; night side shows city lights via emissive map */}
        <meshStandardMaterial map={day} emissiveMap={night} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.95} metalness={0} />
      </mesh>
      <mesh ref={cloud}>
        <sphereGeometry args={[1.625, 64, 64]} />
        <meshStandardMaterial map={clouds} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} roughness={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.68, 64, 64]} />
        <shaderMaterial vertexShader={RIM_VERT} fragmentShader={RIM_FRAG} uniforms={rimUniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
      </mesh>
    </group>
  );
}

function Starfield() {
  const geo = useMemo(() => {
    const N = 600, pos = new Float32Array(N * 3);
    const h = (n: number) => ((Math.sin(n * 127.1 + 311.7) * 43758.5) % 1 + 1) % 1;
    for (let i = 0; i < N; i++) {
      const r = 12 + h(i) * 28, th = h(i + 50) * Math.PI * 2, ph = (h(i + 99) - 0.5) * Math.PI;
      pos[i * 3] = r * Math.cos(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph); pos[i * 3 + 2] = r * Math.cos(ph) * Math.sin(th) - 6;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return g;
  }, []);
  return <points geometry={geo}><pointsMaterial color="#BFB6E8" size={0.05} sizeAttenuation transparent opacity={0.45} /></points>;
}

export default function ScrollPlanet({ progress }: { progress?: MotionValue<number> }) {
  const tier = useMemo(() => (typeof window !== "undefined" ? detectGpuTier() : "high"), []);
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 42, near: 0.1, far: 80 }}
      dpr={tier === "high" ? [1, 2] : [1, 1.25]}
      gl={{ antialias: tier === "high", alpha: true }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.16} color="#1c1838" />
      <directionalLight position={[-4, 2, 5]} intensity={2.6} color="#fff3da" />
      <Suspense fallback={null}>
        <Starfield />
        <Earth progress={progress} />
      </Suspense>
    </Canvas>
  );
}
