"use client";

/**
 * ScrollPlanet — the home hero's through-line: a PHOTOREAL Saturn rendered in
 * real time, spinning continuously on its tilted axis (one direction, no loop,
 * ever). As the page scrolls it glides across the screen and resizes
 * (right→left→center→right→center) tying the marketing sections into one story.
 *
 * Fidelity is carried by custom shaders, not flat meshStandard:
 *   · world-space sun key + limb darkening on the gas giant
 *   · directional ambient sampled from a Milky-Way equirect (never flat-lit)
 *   · the ring's shadow cast across the globe
 *   · the globe's shadow notching the rings (the Cassini shadow)
 *   · a gold atmospheric Fresnel limb
 * finished with the shared CinematicFX post stack (bloom + DOF + ACES + grain).
 */

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import { detectGpuTier } from "@/lib/design/gpuTier";
import { CinematicFX } from "@/components/three/postfx/CinematicFX";

const R = 1.5;
const RING_INNER = R * 1.28;
const RING_OUTER = R * 2.3;

// Constant tilt (Saturn ~26.7°), and a constant world sun direction (travel dir).
const TILT = new THREE.Euler(0.32, 0, 0.42, "XYZ");
const LIGHT_DIR_WORLD = new THREE.Vector3(5, -2.5, -4).normalize(); // light travels this way
// Sun direction in the group's local frame (group orientation is fixed): used
// for the ring/globe shadow geometry, which is rigid inside the tilted group.
const TO_SUN_LOCAL = (() => {
  const q = new THREE.Quaternion().setFromEuler(TILT).invert();
  return LIGHT_DIR_WORLD.clone().multiplyScalar(-1).applyQuaternion(q).normalize();
})();

// Keyframes the planet travels through across the page scroll [0..1]:
// [scrollP, screenX, screenY, scale] — matches page.tsx section alignment.
const KEYS: [number, number, number, number][] = [
  [0.00,  2.6,  0.15, 1.28],  // hero — right, large
  [0.24, -2.7,  0.45, 0.74],  // instrument — left, small
  [0.48,  0.0,  0.0,  1.06],  // pricing — center, mid
  [0.72,  2.4, -0.25, 0.7 ],  // faq — right, small
  [1.00,  0.0,  0.0,  1.32],  // cta — center, large
];

function sample(p: number) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (p >= KEYS[i][0] && p <= KEYS[i + 1][0]) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  const span = b[0] - a[0] || 1;
  const t = THREE.MathUtils.clamp((p - a[0]) / span, 0, 1);
  const e = t * t * (3 - 2 * t); // smoothstep
  return { x: a[1] + (b[1] - a[1]) * e, y: a[2] + (b[2] - a[2]) * e, s: a[3] + (b[3] - a[3]) * e };
}

// ── Shared GLSL ──────────────────────────────────────────────────────────────
const COMMON = /* glsl */ `
  #define PI 3.141592653589793
  uniform vec3  uLightDirWorld;   // light travel direction (world)
  uniform vec3  uToSunLocal;      // unit dir toward sun, in group-local frame
  uniform mat4  uGroupInv;        // world -> group-local
  uniform sampler2D uEnv;         // milky-way equirect for ambient
  uniform sampler2D uRing;        // ring color+alpha (radial)
  uniform float uRingInner;
  uniform float uRingOuter;
  uniform float uR;               // planet radius (local)

  vec3 envAmbient(vec3 n){
    float u = atan(n.z, n.x) / (2.0*PI) + 0.5;
    float v = asin(clamp(n.y, -1.0, 1.0)) / PI + 0.5;
    return texture2D(uEnv, vec2(u, v)).rgb;
  }
`;

// ── Planet (gas giant) ────────────────────────────────────────────────────────
const BODY_VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vWPos; varying vec3 vWN;
  void main(){
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWPos = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const BODY_FRAG = /* glsl */ `
  ${COMMON}
  uniform sampler2D uMap;
  varying vec2 vUv; varying vec3 vWPos; varying vec3 vWN;

  void main(){
    vec3 albedo = pow(texture2D(uMap, vUv).rgb, vec3(2.2)); // sRGB -> linear
    vec3 N = normalize(vWN);
    vec3 toSun = -normalize(uLightDirWorld);

    // Soft, slightly wrapped terminator so the night side isn't a hard edge.
    float ndl = dot(N, toSun);
    float lambert = clamp((ndl + 0.08) / 1.08, 0.0, 1.0);

    // Ring shadow cast onto the globe (march the fragment toward the sun to the
    // ring plane; if it lands within the ring annulus, the ring occludes the sun).
    float ringShadow = 1.0;
    vec3 lp = (uGroupInv * vec4(vWPos, 1.0)).xyz;
    if (abs(uToSunLocal.y) > 0.001) {
      float t = -lp.y / uToSunLocal.y;
      if (t > 0.0) {
        vec2 hit = (lp + t * uToSunLocal).xz;
        float r = length(hit);
        if (r > uRingInner && r < uRingOuter) {
          float ru = (r - uRingInner) / (uRingOuter - uRingInner);
          float a = texture2D(uRing, vec2(ru, 0.5)).a;
          ringShadow = 1.0 - a * 0.8;
        }
      }
    }

    // Limb darkening + view-dependent darkening toward the edge of the disc.
    vec3 V = normalize(cameraPosition - vWPos);
    float limb = pow(clamp(dot(N, V), 0.0, 1.0), 0.32);

    vec3 sunCol = vec3(1.0, 0.93, 0.8) * 1.5;
    vec3 ambient = envAmbient(N) * 0.13 + vec3(0.024, 0.028, 0.05);

    vec3 col = albedo * (sunCol * lambert * ringShadow + ambient);
    col *= mix(0.68, 1.0, limb);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Rings ─────────────────────────────────────────────────────────────────────
const RING_VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vWPos;
  void main(){
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const RING_FRAG = /* glsl */ `
  ${COMMON}
  varying vec2 vUv; varying vec3 vWPos;

  void main(){
    vec4 ring = texture2D(uRing, vec2(vUv.x, 0.5));
    if (ring.a < 0.02) discard;
    vec3 albedo = pow(ring.rgb, vec3(2.2));

    // Globe shadow notching the rings: does the ray from this fragment toward
    // the sun pass through the planet sphere (centred at local origin, radius uR)?
    vec3 lp = (uGroupInv * vec4(vWPos, 1.0)).xyz;
    float tStar = dot(-lp, uToSunLocal);
    float lit = 1.0;
    if (tStar > 0.0) {
      float d = length(lp - tStar * uToSunLocal); // closest approach to planet centre
      lit = smoothstep(uR - 0.06, uR + 0.06, d);  // 0 inside the shadow, 1 outside
      lit = mix(0.16, 1.0, lit);
    }

    // Rings are lit by direct sun + a touch of sky ambient; ice scatters warm.
    vec3 sunCol = vec3(1.0, 0.95, 0.86) * 2.2;
    vec3 ambient = envAmbient(vec3(0.0, 1.0, 0.0)) * 0.10 + vec3(0.04, 0.045, 0.07);
    vec3 col = albedo * (sunCol * lit + ambient);
    gl_FragColor = vec4(col, ring.a);
  }
`;

// ── Atmosphere limb (gold Fresnel shell) ───────────────────────────────────────
const RIM_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }
`;
const RIM_FRAG = /* glsl */ `
  varying vec3 vN; varying vec3 vV; uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
  void main(){ float f = pow(1.0 - abs(dot(vN,vV)), uPower); gl_FragColor = vec4(uColor, f*uIntensity); }
`;

function Saturn({ progress }: { progress?: MotionValue<number> }) {
  const bodyTex = useLoader(THREE.TextureLoader, "/textures/planets/8k_saturn.jpg");
  const ringTex = useLoader(THREE.TextureLoader, "/textures/planets/8k_saturn_ring_alpha.png");
  const envTex  = useLoader(THREE.TextureLoader, "/textures/space/8k_stars_milky_way.jpg");

  useMemo(() => {
    bodyTex.colorSpace = THREE.NoColorSpace; bodyTex.anisotropy = 16; // we de-gamma in-shader
    ringTex.colorSpace = THREE.NoColorSpace; ringTex.anisotropy = 16;
    envTex.colorSpace  = THREE.NoColorSpace; envTex.mapping = THREE.EquirectangularReflectionMapping;
  }, [bodyTex, ringTex, envTex]);

  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);

  // Rings flat in the planet's equatorial plane, radial UVs.
  const ringGeo = useMemo(() => {
    const g = new THREE.RingGeometry(RING_INNER, RING_OUTER, 240);
    const pos = g.attributes.position, uv = g.attributes.uv; const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - RING_INNER) / (RING_OUTER - RING_INNER), 0.5); }
    return g;
  }, []);

  const shared = useMemo(() => ({
    uLightDirWorld: { value: LIGHT_DIR_WORLD.clone() },
    uToSunLocal:    { value: TO_SUN_LOCAL.clone() },
    uGroupInv:      { value: new THREE.Matrix4() },
    uEnv:           { value: envTex },
    uRing:          { value: ringTex },
    uRingInner:     { value: RING_INNER },
    uRingOuter:     { value: RING_OUTER },
    uR:             { value: R },
  }), [envTex, ringTex]);

  const bodyUniforms = useMemo(() => ({ ...shared, uMap: { value: bodyTex } }), [shared, bodyTex]);
  const ringUniforms = useMemo(() => ({ ...shared }), [shared]);
  const rimUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color("#E8C98A") }, uPower: { value: 3.4 }, uIntensity: { value: 0.55 },
  }), []);

  useFrame((_, dt) => {
    if (body.current) body.current.rotation.y += dt * 0.045;
    if (group.current) {
      group.current.updateMatrixWorld();
      shared.uGroupInv.value.copy(group.current.matrixWorld).invert();
      if (progress) {
        const { x, y, s } = sample(THREE.MathUtils.clamp(progress.get(), 0, 1));
        const k = Math.min(dt * 3, 1);
        group.current.position.x += (x - group.current.position.x) * k;
        group.current.position.y += (y - group.current.position.y) * k;
        const cs = group.current.scale.x + (s - group.current.scale.x) * k;
        group.current.scale.setScalar(cs);
      }
    }
  });

  return (
    <group ref={group} position={[2.6, 0.15, 0]} scale={1.28} rotation={TILT}>
      <mesh ref={body}>
        <sphereGeometry args={[R, 192, 192]} />
        <shaderMaterial vertexShader={BODY_VERT} fragmentShader={BODY_FRAG} uniforms={bodyUniforms} />
      </mesh>
      {/* gold atmosphere limb */}
      <mesh>
        <sphereGeometry args={[R * 1.025, 64, 64]} />
        <shaderMaterial vertexShader={RIM_VERT} fragmentShader={RIM_FRAG} uniforms={rimUniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
      </mesh>
      {/* rings — flat in the equatorial plane, so they tilt with the planet */}
      <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <shaderMaterial vertexShader={RING_VERT} fragmentShader={RING_FRAG} uniforms={ringUniforms}
          transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Starfield() {
  const geo = useMemo(() => {
    const N = 700, pos = new Float32Array(N * 3);
    const h = (n: number) => ((Math.sin(n * 127.1 + 311.7) * 43758.5) % 1 + 1) % 1;
    for (let i = 0; i < N; i++) {
      const r = 12 + h(i) * 30, th = h(i + 50) * Math.PI * 2, ph = (h(i + 99) - 0.5) * Math.PI;
      pos[i * 3] = r * Math.cos(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph); pos[i * 3 + 2] = r * Math.cos(ph) * Math.sin(th) - 6;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); return g;
  }, []);
  return <points geometry={geo}><pointsMaterial color="#BFB6E8" size={0.045} sizeAttenuation transparent opacity={0.4} /></points>;
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
      <Suspense fallback={null}>
        <Starfield />
        <Saturn progress={progress} />
        <CinematicFX quality={tier === "high" ? "high" : "low"} bloom={1.25} />
      </Suspense>
    </Canvas>
  );
}
