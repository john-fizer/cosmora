"use client";

/**
 * CinematicFX — the shared post-processing stack that turns a flat 3D diagram
 * into a filmic scene. ACES tone mapping + selective bloom + gentle depth-of-
 * field + faint chromatic aberration + film grain + vignette. Reused by every
 * real-time 3D surface so they all match.
 */

import { EffectComposer, Bloom, DepthOfField, Noise, Vignette, ChromaticAberration, ToneMapping, GodRays } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";

export function CinematicFX({
  sun = null,
  dof = false,
  bokeh = 1.6,
  bloom = 1.7,
  quality = "high",
}: {
  sun?: THREE.Mesh | null;      // bright source for volumetric god rays
  dof?: boolean;
  bokeh?: number;
  bloom?: number;
  quality?: "high" | "low";
}) {
  // Low-tier devices: drop the heavier effects, keep tone mapping + bloom.
  if (quality === "low") {
    return (
      <EffectComposer multisampling={0}>
        <Bloom intensity={bloom * 0.8} luminanceThreshold={0.12} luminanceSmoothing={0.8} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette eskil={false} offset={0.3} darkness={0.7} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      {sun
        ? <GodRays sun={sun} blendFunction={BlendFunction.SCREEN} samples={60} density={0.94} decay={0.92} weight={0.4} exposure={0.5} clampMax={1} blur />
        : <></>}
      <Bloom intensity={bloom} luminanceThreshold={0.08} luminanceSmoothing={0.82} mipmapBlur radius={0.86} />
      {dof
        ? <DepthOfField focusDistance={0.015} focalLength={0.05} bokehScale={bokeh} />
        : <></>}
      <ChromaticAberration offset={new THREE.Vector2(0.0006, 0.0006)} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />
      <Noise opacity={0.04} premultiply blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.26} darkness={0.74} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
