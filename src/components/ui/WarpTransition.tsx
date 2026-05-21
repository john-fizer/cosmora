"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";

// ─── Same shader as ScrollWarpTunnel (verbatim) ───────────────────────────────

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform float u_progress;
uniform vec2 u_resolution;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0*fract(p*C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x+0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x = a0.x*x0.x + h.x*x0.y;
  g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.0*dot(m,g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 center = uv - 0.5;

  float p = clamp(u_progress, 0.0, 1.0);
  float t = u_time * 0.5;

  float dist = length(center);
  float angle = atan(center.y, center.x);

  float rings = 18.0 + p * 12.0;
  float ringVal = sin((dist * rings - t * 2.5) * 3.14159);

  vec2 tunnelUV = vec2(
    angle / (2.0 * 3.14159) + 0.5,
    fract(1.0 / max(dist, 0.001) * 0.08 - t * 0.3)
  );

  float n1 = snoise(tunnelUV * 3.0 + vec2(t * 0.4, 0.0));
  float n2 = snoise(tunnelUV * 7.0 - vec2(0.0, t * 0.6));

  float noise = n1 * 0.6 + n2 * 0.4;
  noise = noise * 0.5 + 0.5;

  vec3 cVoid    = vec3(0.008, 0.004, 0.020);
  vec3 cViolet  = vec3(0.486, 0.141, 0.933);
  vec3 cCyan    = vec3(0.133, 0.827, 0.933);
  vec3 cGold    = vec3(0.980, 0.800, 0.082);

  float mixA = smoothstep(0.0, 0.5, noise);
  float mixB = smoothstep(0.4, 1.0, noise);
  vec3 col = mix(mix(cVoid, cViolet, mixA), cCyan, mixB);

  col += cCyan * max(0.0, ringVal) * 0.06 * p;
  col += cGold * max(0.0, -ringVal) * 0.03 * p;

  float vignette = 1.0 - smoothstep(0.0 + p * 0.5, 0.8, dist * (1.0 + p * 0.5));
  col *= vignette;
  col *= 0.18 + p * 0.22;
  col *= smoothstep(0.55, 0.2, dist);

  gl_FragColor = vec4(col, p * vignette * 0.95);
}
`;

function mkShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface WarpContextType {
  warpTo: (href: string) => void;
}

const WarpContext = createContext<WarpContextType>({ warpTo: () => {} });

export function useWarpTo() {
  return useContext(WarpContext).warpTo;
}

// ─── WebGL Warp Canvas ────────────────────────────────────────────────────────

function WarpCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { premultipliedAlpha: false });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, mkShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, mkShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);

    const posLoc = gl.getAttribLocation(prog, "a_pos");
    const uTime  = gl.getUniformLocation(prog, "u_time");
    const uProg  = gl.getUniformLocation(prog, "u_progress");
    const uRes   = gl.getUniformLocation(prog, "u_resolution");

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const t0 = performance.now();
    const render = () => {
      const t = (performance.now() - t0) / 1000;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uProg, progressRef.current);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: active ? "all" : "none",
        zIndex: 200,
        opacity: active ? 1 : 0,
        transition: "opacity 0.1s",
      }}
    />
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WarpTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const progressRef = useRef(0);
  const busyRef = useRef(false);

  // Expose progressRef to the WarpCanvas via a shared ref trick
  const canvasProgressRef = useRef(0);

  const animateTo = useCallback((
    target: number,
    durationMs: number,
    onDone?: () => void
  ) => {
    const start = performance.now();
    const from = progressRef.current;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // easeInCubic for warp-in, easeOutCubic for warp-out
      const eased = target > from
        ? t * t * t
        : 1 - Math.pow(1 - t, 3);
      progressRef.current = from + (target - from) * eased;
      // Sync to canvas via DOM (we'll read from a shared ref)
      canvasProgressRef.current = progressRef.current;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        progressRef.current = target;
        canvasProgressRef.current = target;
        onDone?.();
      }
    };
    requestAnimationFrame(tick);
  }, []);

  const warpTo = useCallback((href: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    progressRef.current = 0;
    setActive(true);

    // Phase 1: warp IN (0 → 1) over 650ms
    animateTo(1, 650, () => {
      // Navigate at peak
      router.push(href);

      // Phase 2: warp OUT (1 → 0) over 500ms after short hold
      setTimeout(() => {
        animateTo(0, 500, () => {
          setActive(false);
          busyRef.current = false;
        });
      }, 120);
    });
  }, [animateTo, router]);

  return (
    <WarpContext.Provider value={{ warpTo }}>
      {children}
      <WarpCanvasConnected active={active} progressRef={progressRef} />
    </WarpContext.Provider>
  );
}

// Canvas that reads directly from the progressRef for sync-free updates
function WarpCanvasConnected({
  active,
  progressRef,
}: {
  active: boolean;
  progressRef: React.MutableRefObject<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { premultipliedAlpha: false });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, mkShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, mkShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);

    const posLoc = gl.getAttribLocation(prog, "a_pos");
    const uTime  = gl.getUniformLocation(prog, "u_time");
    const uProg  = gl.getUniformLocation(prog, "u_progress");
    const uRes   = gl.getUniformLocation(prog, "u_resolution");

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const t0 = performance.now();
    const render = () => {
      const t = (performance.now() - t0) / 1000;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uProg, progressRef.current);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [progressRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: active ? "all" : "none",
        zIndex: 200,
        visibility: active ? "visible" : "hidden",
      }}
    />
  );
}
