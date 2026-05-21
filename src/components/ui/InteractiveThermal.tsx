"use client";

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 mouse = u_mouse / u_resolution;
  mouse.y = 1.0 - mouse.y;

  float t = u_time * 0.18;

  vec2 toMouse = uv - mouse;
  float mouseDist = length(toMouse);
  float mInfluence = smoothstep(0.55, 0.0, mouseDist) * 0.35;

  float n1 = snoise(uv * 2.2 + vec2(t * 0.9, t * 0.45));
  float n2 = snoise(uv * 4.5 - vec2(t * 0.6, t * 0.25) + toMouse * mInfluence * 2.5);
  float n3 = snoise(uv * 9.0 + vec2(t * 1.5, -t * 0.8));
  float n4 = snoise(uv * 1.4 + vec2(-t * 0.4, t * 0.6) + mouse * 0.15);

  float noise = n1 * 0.45 + n2 * 0.28 + n3 * 0.15 + n4 * 0.12 + mInfluence * 0.6;
  noise = clamp(noise * 0.5 + 0.5, 0.0, 1.0);

  vec3 c0 = vec3(0.008, 0.004, 0.020);
  vec3 c1 = vec3(0.032, 0.051, 0.122);
  vec3 c2 = vec3(0.086, 0.039, 0.180);
  vec3 c3 = vec3(0.486, 0.231, 0.847);
  vec3 c4 = vec3(0.133, 0.827, 0.933);

  vec3 col;
  if (noise < 0.25) {
    col = mix(c0, c1, noise / 0.25);
  } else if (noise < 0.50) {
    col = mix(c1, c2, (noise - 0.25) / 0.25);
  } else if (noise < 0.75) {
    col = mix(c2, c3, (noise - 0.50) / 0.25);
  } else {
    col = mix(c3, c4, (noise - 0.75) / 0.25);
  }

  col *= 0.22;
  float vig = 1.0 - smoothstep(0.35, 1.3, length(uv - vec2(0.5)));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

function mkShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function mkProgram(gl: WebGLRenderingContext): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, mkShader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, mkShader(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(p);
  return p;
}

export function InteractiveThermal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const prog = mkProgram(gl);
    const posLoc = gl.getAttribLocation(prog, "a_position");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const resize = () => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMouse = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      mouse.current = { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
    };
    window.addEventListener("mousemove", onMouse, { passive: true });

    const t0 = performance.now();
    const render = () => {
      const t = (performance.now() - t0) / 1000;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouse.current.x, mouse.current.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf.current = requestAnimationFrame(render);
    };
    raf.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
