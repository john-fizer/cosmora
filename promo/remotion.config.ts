import path from "path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

// NOTE: __dirname is unreliable here — Remotion bundles/executes this config
// file from a location inside its own package, not from this file's real
// path. process.cwd() is reliable because the CLI is always invoked from
// the promo/ directory.
const PROMO_ROOT = process.cwd();

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// The reused app components (SolarSystemOrrery, ChartWheel glyphs, etc.) fetch
// their textures/images from /public at the app root (e.g. /textures/...,
// /glyphs/...) — serve the real app's public/ folder so those resolve here too.
Config.setPublicDir(path.join(PROMO_ROOT, "..", "public"));

Config.overrideWebpackConfig((currentConfiguration) => {
  const withTailwind = enableTailwind(currentConfiguration);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...(withTailwind.resolve?.alias ?? {}),
        // Exact-match overrides (resolved before the general "@" alias below)
        "next/link$": path.join(PROMO_ROOT, "src/mocks/next-link.tsx"),
        "next/navigation$": path.join(PROMO_ROOT, "src/mocks/next-navigation.ts"),
        "next/dynamic$": path.join(PROMO_ROOT, "src/mocks/next-dynamic.tsx"),
        // Reuse the real app's components/lib straight from ../src
        "@": path.join(PROMO_ROOT, "..", "src"),
      },
    },
  };
});
