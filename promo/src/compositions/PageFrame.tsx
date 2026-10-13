import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, delayRender, continueRender } from "remotion";

export interface CameraMove {
  /** rotateX/Y in degrees at [start, end] of the scene. */
  tiltX?: [number, number];
  tiltY?: [number, number];
  /** scale at [start, end] — use >1 for a slow push-in. */
  scale?: [number, number];
  /** translate (px) at [start, end]. */
  panX?: [number, number];
  panY?: [number, number];
}

/**
 * Wraps a mounted real app page at the FULL composition size and applies a
 * gentle CSS 3D camera move. Kept at full composition size (not shrunk into
 * a smaller "device frame") so position:fixed children inside the real page
 * (e.g. DashboardBg's starfield canvas, which sizes itself off
 * window.innerWidth/innerHeight) stay pixel-accurate — a transform alone
 * doesn't change an element's own box size, only how it's painted.
 */
export function PageFrame({
  children,
  move = {},
  origin = "50% 0%",
}: {
  children: React.ReactNode;
  move?: CameraMove;
  /** CSS transform-origin for the camera move. Default top-center (see note below). */
  origin?: string;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = (pair?: [number, number]) =>
    pair ? interpolate(frame, [0, durationInFrames - 1], pair, { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : undefined;

  const tiltX = t(move.tiltX) ?? 0;
  const tiltY = t(move.tiltY) ?? 0;
  const scale = t(move.scale) ?? 1;
  const panX = t(move.panX) ?? 0;
  const panY = t(move.panY) ?? 0;

  // Several real pages render full-bleed (no sidebar gutter here since we
  // don't mount CosmicShell) with text flush to the edge. Any push-in/tilt
  // crops inward from every edge, so give the mounted content a safety
  // margin wide enough to survive the configured move instead of clipping
  // real copy mid-word.
  const inset = 64;

  return (
    <div style={{ width, height, overflow: "hidden", background: "#08080F", perspective: 1800 }}>
      <div
        style={{
          width,
          height,
          boxSizing: "border-box",
          padding: `0 ${inset}px`,
          transform: `translate(${panX}px, ${panY}px) scale(${scale}) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          // Top-anchored: these real pages pack their content near the top
          // (built for a ~900px desktop viewport, not a 1920-tall phone
          // frame), so zooming from the top keeps real UI in frame instead
          // of panning into empty space below it.
          transformOrigin: origin,
        }}
      >
        <div style={{ width: width - inset * 2, height, overflow: "hidden" }}>{children}</div>
      </div>
    </div>
  );
}

/** Fires `cb` once when the timeline crosses `targetFrame`. */
export function useFrameTrigger(targetFrame: number, cb: () => void) {
  const frame = useCurrentFrame();
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (!fired.current && frame >= targetFrame) {
      fired.current = true;
      cb();
    }
  }, [frame, targetFrame, cb]);
}

/**
 * Like useFrameTrigger, but holds this frame's capture (via delayRender)
 * until `cb`'s returned promise settles AND one more paint has flushed —
 * required whenever the triggered action causes async state (a click that
 * kicks off a mocked fetch) so the still/frame doesn't get captured mid-flight.
 */
export function useFrameAction(targetFrame: number, cb: () => Promise<void>) {
  const frame = useCurrentFrame();
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current || frame < targetFrame) return;
    fired.current = true;
    const handle = delayRender(`frame-action-${targetFrame}`);
    cb()
      .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [frame, targetFrame, cb]);
}

/** Dispatches a real click on the first button/element whose text includes `text`. */
export function clickByText(text: string) {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("button, a, [role='button'], [role='radio']"));
  const el = candidates.find((n) => n.textContent?.includes(text));
  // eslint-disable-next-line no-console
  console.log(`[clickByText] "${text}" candidates=${candidates.length} match=${!!el}`, candidates.map((c) => c.textContent));
  el?.click();
}
