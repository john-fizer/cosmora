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
]);

export default eslintConfig;
