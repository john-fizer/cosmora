"use client";

/**
 * ScrollPlanet — the home hero's through-line: a real planet spinning on its
 * tilted axis. As the page scrolls, it glides across the screen and resizes
 * (right→left→center, big→small→mid) tying the marketing sections into one
 * story. Fixed canvas behind the content. Earth: day map + city-light nights
 * + clouds + atmosphere.
 */

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
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

function Saturn({ progress }: { progress?: MotionValue<number> }) {
  const bodyTex = useLoader(THREE.TextureLoader, "/textures/planets/8k_saturn.jpg");
  const ringTex = useLoader(THREE.TextureLoader, "/textures/planets/8k_saturn_ring_alpha.png");
  useMemo(() => {
    bodyTex.colorSpace = THREE.SRGBColorSpace; bodyTex.anisotropy = 16;
    ringTex.colorSpace = THREE.SRGBColorSpace; ringTex.anisotropy = 16;
  }, [bodyTex, ringTex]);

  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const R = 1.5;

  // Rings in the planet's equatorial plane (tilt with the body), radial UVs
  const ringGeo = useMemo(() => {
    const inner = R * 1.28, outer = R * 2.3;
    const g = new THREE.RingGeometry(inner, outer, 200);
    const pos = g.attributes.position, uv = g.attributes.uv; const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5); }
    return g;
  }, []);

  const rimUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color("#E8C98A") }, uPower: { value: 3.6 }, uIntensity: { value: 0.6 },
  }), []);

  useFrame((_, dt) => {
    if (body.current) body.current.rotation.y += dt * 0.05;
    if (group.current && progress) {
      const { x, y, s } = sample(THREE.MathUtils.clamp(progress.get(), 0, 1));
      group.current.position.x += (x - group.current.position.x) * Math.min(dt * 3, 1);
      group.current.position.y += (y - group.current.position.y) * Math.min(dt * 3, 1);
      const cs = group.current.scale.x + (s - group.current.scale.x) * Math.min(dt * 3, 1);
      group.current.scale.setScalar(cs);
    }
  });

  // Tilted axis (Saturn ~26.7°)
  return (
    <group ref={group} position={[2.5, 0.1, 0]} scale={1.1} rotation={[0.32, 0, 0.42]}>
      <mesh ref={body}>
        <sphereGeometry args={[R, 160, 160]} />
        <meshStandardMaterial map={bodyTex} roughness={0.82} metalness={0.02} />
      </mesh>
      {/* gold atmosphere rim */}
      <mesh>
        <sphereGeometry args={[R * 1.03, 64, 64]} />
        <shaderMaterial vertexShader={RIM_VERT} fragmentShader={RIM_FRAG} uniforms={rimUniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
      </mesh>
      {/* rings — flat in the equatorial plane, so they tilt with the planet */}
      <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial map={ringTex} transparent side={THREE.DoubleSide} depthWrite={false} opacity={0.95} />
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
      gl={{ antialias: tier === "high", alpha: false, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#08080F"]} />
      <ambientLight intensity={0.1} color="#1a1730" />
      {/* Warm key from the left, cool gold rim from behind-right for a lit edge */}
      <directionalLight position={[-5, 2.5, 4]} intensity={3.2} color="#fff1d6" />
      <directionalLight position={[6, 1, -3]} intensity={1.1} color="#C8A55B" />
      <Suspense fallback={null}>
        <Starfield />
        <Saturn progress={progress} />
        {tier === "high" && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={1.25} luminanceThreshold={0.15} luminanceSmoothing={0.85} mipmapBlur radius={0.8} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
