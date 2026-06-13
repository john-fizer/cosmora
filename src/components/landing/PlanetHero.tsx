"use client";

/**
 * PlanetHero — a single slowly-rotating textured planet for the landing hero's
 * right side. Saturn with rings, lit warm, on the void, with a faint gold rim.
 * Mouse parallax, auto-rotation, GPU-tier aware. No video.
 */

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { QUALITY, detectGpuTier } from "@/lib/design/gpuTier";

const RIM_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const RIM_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float f = pow(1.0 - abs(dot(vNormal, vView)), uPower);
    gl_FragColor = vec4(uColor, f * uIntensity);
  }
`;

function tex(file: string): THREE.Texture {
  const t = new THREE.TextureLoader().load(`/textures/planets/${file}`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function Saturn({ segments }: { segments: number }) {
  const bodyTex = useMemo(() => tex("2k_saturn.jpg"), []);
  const ringTex = useMemo(() => tex("2k_saturn_ring_alpha.png"), []);
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);

  // Ring geometry with radial UVs
  const ringGeo = useMemo(() => {
    const inner = 1.35, outer = 2.5;
    const g = new THREE.RingGeometry(inner, outer, 160);
    const pos = g.attributes.position, uv = g.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    return g;
  }, []);

  const rimUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color("#C8A55B") },
    uPower: { value: 3.0 },
    uIntensity: { value: 0.8 },
  }), []);

  useFrame((_, dt) => {
    if (body.current) body.current.rotation.y += dt * 0.06;
  });

  return (
    <group ref={group} rotation={[0.42, 0, 0.28]}>
      {/* Planet body */}
      <mesh ref={body}>
        <sphereGeometry args={[1, segments, segments]} />
        <meshStandardMaterial map={bodyTex} roughness={0.92} metalness={0} />
      </mesh>
      {/* Gold Fresnel rim */}
      <mesh>
        <sphereGeometry args={[1.04, segments, segments]} />
        <shaderMaterial vertexShader={RIM_VERT} fragmentShader={RIM_FRAG}
          uniforms={rimUniforms} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
      </mesh>
      {/* Rings */}
      <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial map={ringTex} transparent side={THREE.DoubleSide}
          depthWrite={false} opacity={0.95} />
      </mesh>
    </group>
  );
}

function Starfield() {
  const geo = useMemo(() => {
    const N = 600, pos = new Float32Array(N * 3);
    const h = (n: number) => ((Math.sin(n * 127.1 + 311.7) * 43758.5) % 1 + 1) % 1;
    for (let i = 0; i < N; i++) {
      const r = 12 + h(i) * 30;
      const th = h(i + 50) * Math.PI * 2;
      const ph = (h(i + 99) - 0.5) * Math.PI;
      pos[i * 3] = r * Math.cos(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph);
      pos[i * 3 + 2] = r * Math.cos(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#BFB6E8" size={0.07} sizeAttenuation transparent opacity={0.5} />
    </points>
  );
}

function ParallaxRig() {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });
  useFrame((state, dt) => {
    const px = state.pointer.x, py = state.pointer.y;
    target.current.x += (px * 0.5 - target.current.x) * Math.min(dt * 3, 1);
    target.current.y += (py * 0.3 - target.current.y) * Math.min(dt * 3, 1);
    camera.position.x = target.current.x;
    camera.position.y = 0.3 + target.current.y;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function PlanetHero() {
  const quality = useMemo(() => QUALITY[typeof window !== "undefined" ? detectGpuTier() : "high"], []);
  return (
    <Canvas
      camera={{ position: [0, 0.3, 5], fov: 42 }}
      dpr={quality.dpr}
      gl={{ antialias: quality.antialias, alpha: true }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.25} color="#3a3360" />
      <directionalLight position={[3, 2, 4]} intensity={2.6} color="#fff2d8" />
      <Suspense fallback={null}>
        <Starfield />
        <Saturn segments={quality.sphereSegments} />
        <ParallaxRig />
      </Suspense>
    </Canvas>
  );
}
