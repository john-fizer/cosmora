"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 2200;

const VERT = `
uniform float u_time;
uniform vec2 u_mouse;
attribute float a_size;
attribute vec3 a_base;
attribute float a_phase;
varying float v_alpha;

float hash(float n) { return fract(sin(n) * 43758.5453); }
float noise3(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = dot(i, vec3(1.0, 57.0, 113.0));
  return mix(
    mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y),
    mix(mix(hash(n+113.),hash(n+114.),f.x),mix(hash(n+170.),hash(n+171.),f.x),f.y),
    f.z);
}

void main() {
  float t = u_time * 0.35 + a_phase;
  float breath = 1.0 + sin(t * 0.55 + a_phase) * 0.07;
  float n = noise3(a_base * 1.3 + vec3(t * 0.28)) * 2.0 - 1.0;
  vec3 pos = a_base * breath + normalize(a_base) * n * 0.11;

  vec2 toMouse = u_mouse - pos.xy;
  float infl = smoothstep(0.9, 0.0, length(toMouse)) * 0.5;
  pos.xy += toMouse * infl * 0.18;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = a_size * (380.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
  v_alpha = 0.55 + 0.45 * noise3(a_base * 2.5 + vec3(t * 0.15));
}
`;

const FRAG = `
uniform vec3 u_col1;
uniform vec3 u_col2;
varying float v_alpha;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float a = (1.0 - smoothstep(0.0, 0.5, d)) * v_alpha;
  gl_FragColor = vec4(mix(u_col1, u_col2, v_alpha), a * 0.88);
}
`;

function Sphere({ mouseRef }: { mouseRef: React.MutableRefObject<[number, number]> }) {
  const pts = useRef<THREE.Points>(null);

  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const base = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const phases = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.0 + (Math.random() - 0.5) * 0.18;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
      base[i*3]=x; base[i*3+1]=y; base[i*3+2]=z;
      sizes[i] = 1.0 + Math.random() * 2.4;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("a_base", new THREE.BufferAttribute(base, 3));
    g.setAttribute("a_size", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("a_phase", new THREE.BufferAttribute(phases, 1));

    const m = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        u_time:  { value: 0 },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_col1:  { value: new THREE.Color("#7c3aed") },
        u_col2:  { value: new THREE.Color("#06b6d4") },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geo: g, mat: m };
  }, []);

  useFrame((state) => {
    mat.uniforms.u_time.value = state.clock.elapsedTime;
    mat.uniforms.u_mouse.value.set(mouseRef.current[0], mouseRef.current[1]);
    if (pts.current) pts.current.rotation.y = state.clock.elapsedTime * 0.07;
  });

  return <points ref={pts} geometry={geo} material={mat} />;
}

export function ParticlesSphere({ size = 420, className }: { size?: number; className?: string }) {
  const mouseRef = useRef<[number, number]>([0, 0]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      mouseRef.current = [
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      ];
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, pointerEvents: "none" }}
      className={className}
    >
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 48 }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}
        style={{ background: "transparent" }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
        }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[2, 2, 2]} intensity={1.6} color="#a855f7" />
        <pointLight position={[-2, -1, 1]} intensity={0.9} color="#06b6d4" />
        <Sphere mouseRef={mouseRef} />
      </Canvas>
    </div>
  );
}
