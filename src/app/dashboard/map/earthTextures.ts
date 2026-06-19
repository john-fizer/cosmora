import type { GpuTier } from "@/lib/design/gpuTier";

export interface EarthTextureSet {
  night: string;
  day: string;
  clouds: string;
  specular: string;
}

/** Map GPU tier → Earth texture URLs. 8k on high, 2k on low. Specular is always 2k. */
export function earthTextureSet(tier: GpuTier): EarthTextureSet {
  const res = tier === "high" ? "8k" : "2k";
  return {
    night:    `/textures/planets/${res}_earth_nightmap.jpg`,
    day:      `/textures/planets/${res}_earth_daymap.jpg`,
    clouds:   `/textures/planets/${res}_earth_clouds.jpg`,
    specular: `/textures/planets/2k_earth_specular_map.jpg`,
  };
}
