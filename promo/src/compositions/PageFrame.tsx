import React from "react";
import { useCurrentFrame, delayRender, continueRender } from "remotion";

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
  const el = Array.from(document.querySelectorAll<HTMLElement>("button, a, [role='button'], [role='radio']")).find(
    (n) => n.textContent?.includes(text)
  );
  el?.click();
}
