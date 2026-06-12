/**
 * GPU tier heuristic — quality presets for every three.js scene in the app.
 * Cheap signals only (no benchmark): screen, memory, cores, mobile UA.
 */

export type GpuTier = "high" | "low";

export interface QualityPreset {
  dpr: [number, number];
  antialias: boolean;
  postprocessing: boolean;
  sphereSegments: number;
}

export const QUALITY: Record<GpuTier, QualityPreset> = {
  high: { dpr: [1, 2],    antialias: true,  postprocessing: true,  sphereSegments: 64 },
  low:  { dpr: [1, 1.25], antialias: false, postprocessing: false, sphereSegments: 32 },
};

export function detectGpuTier(): GpuTier {
  if (typeof window === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
  const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory <= 4;
  const fewCores = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
  return isMobile || lowMemory || fewCores ? "low" : "high";
}
