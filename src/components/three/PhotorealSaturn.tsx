"use client";

/**
 * PhotorealSaturn — a Saturn you drop INTO a real 3D scene (no Canvas of its
 * own). Custom shaders carry the fidelity:
 *   · world-space sun key + soft terminator + limb darkening
 *   · directional ambient sampled from a Milky-Way equirect (never flat-lit)
 *   · the ring's shadow cast across the globe
 *   · the globe's shadow notching the rings (the Cassini shadow)
 *   · a gold atmospheric Fresnel limb
 * Lit by whatever `sunPos` you pass, so it matches the scene's real sun.
 */

import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const TILT = new THREE.Euler(0.32, 0, 0.42, "XYZ");

const COMMON = /* glsl */ `
  #define PI 3.141592653589793
  uniform vec3  uLightDirWorld;   // light travel direction (world)
  uniform vec3  uToSunLocal;      // unit dir toward sun, in group-local frame
  uniform mat4  uGroupInv;        // world -> group-local
  uniform sampler2D uEnv;
  uniform sampler2D uRing;
  uniform float uRingInner;
  uniform float uRingOuter;
  uniform float uR;
  vec3 envAmbient(vec3 n){
    float u = atan(n.z, n.x) / (2.0*PI) + 0.5;
    float v = asin(clamp(n.y, -1.0, 1.0)) / PI + 0.5;
    return texture2D(uEnv, vec2(u, v)).rgb;
  }
`;

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
    vec3 albedo = pow(texture2D(uMap, vUv).rgb, vec3(2.2));
    vec3 N = normalize(vWN);
    vec3 toSun = -normalize(uLightDirWorld);
    float ndl = dot(N, toSun);
    float lambert = clamp((ndl + 0.08) / 1.08, 0.0, 1.0);

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

    vec3 V = normalize(cameraPosition - vWPos);
    float limb = pow(clamp(dot(N, V), 0.0, 1.0), 0.32);
    vec3 sunCol = vec3(1.0, 0.93, 0.8) * 1.5;
    vec3 ambient = envAmbient(N) * 0.13 + vec3(0.024, 0.028, 0.05);
    vec3 col = albedo * (sunCol * lambert * ringShadow + ambient);
    col *= mix(0.68, 1.0, limb);
    gl_FragColor = vec4(col, 1.0);
  }
`;

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
    vec3 lp = (uGroupInv * vec4(vWPos, 1.0)).xyz;
    float tStar = dot(-lp, uToSunLocal);
    float lit = 1.0;
    if (tStar > 0.0) {
      float d = length(lp - tStar * uToSunLocal);
      lit = smoothstep(uR - 0.06 * uR, uR + 0.06 * uR, d);
      lit = mix(0.16, 1.0, lit);
    }
    vec3 sunCol = vec3(1.0, 0.95, 0.86) * 2.0;
    vec3 ambient = envAmbient(vec3(0.0, 1.0, 0.0)) * 0.10 + vec3(0.04, 0.045, 0.07);
    vec3 col = albedo * (sunCol * lit + ambient);
    gl_FragColor = vec4(col, ring.a);
  }
`;

const RIM_VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }
`;
const RIM_FRAG = /* glsl */ `
  varying vec3 vN; varying vec3 vV; uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
  void main(){ float f = pow(1.0 - abs(dot(vN,vV)), uPower); gl_FragColor = vec4(uColor, f*uIntensity); }
`;

export default function PhotorealSaturn({
  size = 4,
  position = [0, 0, 0],
  sunPos = [0, 0, 0],
  spin = 0.045,
}: {
  size?: number;
  position?: [number, number, number];
  sunPos?: [number, number, number];
  spin?: number;
}) {
  const bodyTex = useLoader(THREE.TextureLoader, "/textures/planets/8k_saturn.jpg");
  const ringTex = useLoader(THREE.TextureLoader, "/textures/planets/8k_saturn_ring_alpha.png");
  const envTex  = useLoader(THREE.TextureLoader, "/textures/space/8k_stars_milky_way.jpg");

  const RING_INNER = size * 1.28;
  const RING_OUTER = size * 2.3;

  useMemo(() => {
    bodyTex.colorSpace = THREE.NoColorSpace; bodyTex.anisotropy = 16;
    ringTex.colorSpace = THREE.NoColorSpace; ringTex.anisotropy = 16;
    envTex.colorSpace  = THREE.NoColorSpace; envTex.mapping = THREE.EquirectangularReflectionMapping;
  }, [bodyTex, ringTex, envTex]);

  // Light travels from the sun to Saturn; toSun is the reverse, in local frame.
  const { lightDirWorld, toSunLocal } = useMemo(() => {
    const p = new THREE.Vector3(...position);
    const s = new THREE.Vector3(...sunPos);
    const ldw = p.clone().sub(s).normalize();
    const q = new THREE.Quaternion().setFromEuler(TILT).invert();
    const tsl = ldw.clone().multiplyScalar(-1).applyQuaternion(q).normalize();
    return { lightDirWorld: ldw, toSunLocal: tsl };
  }, [position, sunPos]);

  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);

  const ringGeo = useMemo(() => {
    const g = new THREE.RingGeometry(RING_INNER, RING_OUTER, 240);
    const pos = g.attributes.position, uv = g.attributes.uv; const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - RING_INNER) / (RING_OUTER - RING_INNER), 0.5); }
    return g;
  }, [RING_INNER, RING_OUTER]);

  const shared = useMemo(() => ({
    uLightDirWorld: { value: lightDirWorld.clone() },
    uToSunLocal:    { value: toSunLocal.clone() },
    uGroupInv:      { value: new THREE.Matrix4() },
    uEnv:           { value: envTex },
    uRing:          { value: ringTex },
    uRingInner:     { value: RING_INNER },
    uRingOuter:     { value: RING_OUTER },
    uR:             { value: size },
  }), [lightDirWorld, toSunLocal, envTex, ringTex, RING_INNER, RING_OUTER, size]);

  const bodyUniforms = useMemo(() => ({ ...shared, uMap: { value: bodyTex } }), [shared, bodyTex]);
  const ringUniforms = useMemo(() => ({ ...shared }), [shared]);
  const rimUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color("#E8C98A") }, uPower: { value: 3.4 }, uIntensity: { value: 0.55 },
  }), []);

  useFrame((_, dt) => {
    if (body.current) body.current.rotation.y += dt * spin;
    if (group.current) {
      group.current.updateMatrixWorld();
      shared.uGroupInv.value.copy(group.current.matrixWorld).invert();
    }
  });

  return (
    <group ref={group} position={position} rotation={TILT}>
      <mesh ref={body}>
        <sphereGeometry args={[size, 192, 192]} />
        <shaderMaterial vertexShader={BODY_VERT} fragmentShader={BODY_FRAG} uniforms={bodyUniforms} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 1.025, 64, 64]} />
        <shaderMaterial vertexShader={RIM_VERT} fragmentShader={RIM_FRAG} uniforms={rimUniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.FrontSide} />
      </mesh>
      <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]}>
        <shaderMaterial vertexShader={RING_VERT} fragmentShader={RING_FRAG} uniforms={ringUniforms}
          transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
