import chartFixture from "../../fixtures/chart.json";
import astrocartographyFixture from "../../fixtures/astrocartography.json";
import transitsFixture from "../../fixtures/transits.json";
import pressureFixture from "../../fixtures/pressure.json";
import oracleAnswerFixture from "../../fixtures/oracle-answer.json";

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

/** SSE body matching the real /api/chat and /api/oracle/stream wire format. */
function sseStream(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

const PRESSURE_BRIEFING =
  `${pressureFixture.level === "critical" ? "The wall is real." : "The pressure is real, even if it isn't at the wall yet."} ` +
  `${pressureFixture.activeSources} independent timing system${pressureFixture.activeSources === 1 ? "" : "s"} agree on this window.\n\n` +
  (pressureFixture.signals as { label: string; detail: string }[])
    .slice(0, 3)
    .map((s, i) => `${i + 1}. ${s.label} — ${s.detail}`)
    .join("\n\n") +
  `\n\nHold decisions loosely until this clears. This is weather, not verdict.`;

/**
 * Installs a mock fetch on `window` that intercepts the exact endpoints the
 * real dashboard pages call, returning data computed by Cosmora's real
 * astrology engine (see fixtures/generate.ts) instead of hitting a live
 * Next.js server — there isn't one inside this Remotion render.
 */
export function installFixtureFetch() {
  const real = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.startsWith("/api/models")) {
      const availability = Object.fromEntries(
        ["claude-opus-5-5", "claude-sonnet-5-5", "gpt-5", "gemini-3-pro"].map((id) => [id, { available: true }])
      );
      return json({ availability });
    }
    if (url.startsWith("/api/pressure")) {
      await new Promise((r) => setTimeout(r, 900));
      return json({ ...pressureFixture, briefing: PRESSURE_BRIEFING });
    }
    if (url.startsWith("/api/transits/forecast")) {
      return json({ events: [] });
    }
    if (url.startsWith("/api/transits")) {
      return json(transitsFixture);
    }
    if (url.startsWith("/api/astrocartography/read")) {
      return sseStream(
        "This line sharpens how you're seen — visible, a little exposed, impossible to blend into the background."
      );
    }
    if (url.startsWith("/api/astrocartography")) {
      return json({ lines: astrocartographyFixture.lines });
    }
    if (url.startsWith("/api/suggest")) {
      return json({ suggestions: ["What about next month?", "Is this a lasting pattern?"] });
    }
    if (url.startsWith("/api/chat") || url.startsWith("/api/oracle/stream") || url.startsWith("/api/dual-oracle")) {
      return sseStream(oracleAnswerFixture.answer);
    }

    return real(input, init);
  };
}

export { chartFixture, astrocartographyFixture, transitsFixture, pressureFixture, oracleAnswerFixture };
