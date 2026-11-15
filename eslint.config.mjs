import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // This repo nests a separate git worktree and vendored skill scripts;
    // neither is app source and both have their own tooling.
    ".worktrees/**",
    ".agents/**",
    ".claude/**",
  ]),
  {
    // react-three-fiber animates 3D scenes by mutating Three.js objects
    // (geometry/material/uniforms) every frame inside useFrame — that's the
    // library's whole model, not a bug. These rules exist to guard React
    // Compiler's memoization assumptions, which this project doesn't use
    // (no `experimental.reactCompiler` in next.config.ts) and which r3f is
    // not compatible with today. Scoped to the specific files that do this,
    // not whole directories.
    files: [
      "src/components/landing/CosmicJourney.tsx",
      "src/components/landing/GlassHero.tsx",
      "src/components/landing/LivingEarthHero.tsx",
      "src/components/layout/CosmicShell.tsx",
      "src/components/three/PhotorealSaturn.tsx",
      "src/components/three/SolarSystemOrrery.tsx",
      "src/app/dashboard/map/GlobeCanvas.tsx",
    ],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    // Same per-frame-mutation pattern as the r3f files above, but via a
    // plain <canvas> + requestAnimationFrame loop instead of react-three-fiber:
    // refs are written during render so the rAF loop can read current props
    // without restarting on every change (see the file's own comment).
    files: ["src/components/oracle/AgentHaloRing.tsx"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
