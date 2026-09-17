# VibeVoice Last-Resort TTS Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Microsoft VibeVoice (hosted on Replicate) as a 6th, last-resort link in Cosmora's existing per-planet TTS provider waterfall — it only runs when Cartesia, Azure, Google, ElevenLabs, and OpenAI have all already failed for a request.

**Architecture:** One new synthesizer function (`synthesizeVibeVoice`) in the existing `src/lib/oracle/ttsProviders.ts`, matching the file's established synthesizer signature exactly. It creates a Replicate prediction, polls until done (no reliance on any Replicate "synchronous wait" behavior), and returns the resulting audio as a `Blob`. Wired in as the final entry of every planet's `PLANET_PROVIDER_CHAIN`.

**Tech Stack:** Plain `fetch` against the Replicate REST API (no new npm dependency), consistent with every other provider in this file.

## Global Constraints

- LiveKit's live conversational voice (`agent/agent.py`, Deepgram + Cartesia) is out of scope — this plan touches only the dashboard read-aloud path in `src/lib/oracle/ttsProviders.ts`
- No self-hosted GPU infrastructure — uses Microsoft's `microsoft/vibevoice` model hosted on Replicate
- No new per-planet voice tuning table — speaker selection reuses the existing `AZURE_VOICES[planet].gender` split (`"Male"` / `"Female"`)
- New synthesizer must match the existing signature: `(text: string, planet: VoicePlanet, aspects: Aspect[]) => Promise<Blob>`
- Polling is the committed integration approach (not Replicate's "wait" header) — poll every 2 seconds, 90-second overall timeout
- New env var: `REPLICATE_API_TOKEN` (added to `.env.local` and `.env.example`)
- Verification: `npx tsc --noEmit` (no automated test suite exists for this file — matches its current state)

---

## Phase 0 — Interactive setup (controller + John, NOT a subagent task)

Done in the main session before Task 1:
1. Create a Replicate account at replicate.com if one doesn't already exist (John).
2. Generate an API token from the Replicate account settings (John).
3. Add it to `C:\Users\John\Desktop\cosmora\.env.local`:
   ```
   REPLICATE_API_TOKEN=r8_...
   ```
4. Confirm the model is reachable with the real token:
   ```bash
   curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" https://api.replicate.com/v1/models/microsoft/vibevoice
   ```
   Expected: a JSON body describing the model (not a 401). Note the `latest_version.openapi_schema.components.schemas.Input.properties` field names in that response — if they differ from `text` / `speaker_names` (used in Task 1 below, based on the model's documented CLI usage), update Task 1's request body to match the live schema. The live schema is the source of truth; this plan's code is the best-corroborated starting point, not a guarantee.

---

### Task 1: VibeVoice synthesizer + waterfall wiring

**Files:**
- Modify: `src/lib/oracle/ttsProviders.ts`
- Modify: `.env.example`
- Create: `scripts/verify-vibevoice.ts`

**Interfaces:**
- Consumes: `VoicePlanet` type and `AZURE_VOICES` map (both already defined earlier in this file)
- Produces: `synthesizeVibeVoice(text: string, planet: VoicePlanet): Promise<Blob>` — exported (unlike the other synthesizers, which are file-private) specifically so `scripts/verify-vibevoice.ts` can call it directly for manual verification without going through the full waterfall

- [ ] **Step 1: Add the VibeVoice synthesizer to `src/lib/oracle/ttsProviders.ts`**

Insert after `synthesizeGoogle` (after line 186, before the `// ─── Waterfall ───` comment):

```typescript
// ─── VibeVoice (Replicate) — last-resort fallback ────────────────────────────
// Only reached if every other provider in the chain has already failed. Uses
// Replicate's hosted microsoft/vibevoice model — no self-hosted GPU. Runs as an
// async prediction (~35s typical), so this polls rather than expecting an
// immediate response.

const REPLICATE_PREDICTIONS_URL = "https://api.replicate.com/v1/models/microsoft/vibevoice/predictions";
const REPLICATE_POLL_INTERVAL_MS = 2000;
const REPLICATE_TIMEOUT_MS = 90_000;

// Two fixed sample speakers — reuses the existing per-planet gender lean rather
// than a new tuning table, since this path is rarely hit.
const VIBEVOICE_SPEAKER: Record<"Male" | "Female", string> = {
  Male: "Frank",
  Female: "Alice",
};

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | null;
  error?: string | null;
  urls: { get: string; cancel: string };
}

export async function synthesizeVibeVoice(text: string, planet: VoicePlanet): Promise<Blob> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("no REPLICATE_API_TOKEN");

  const speaker = VIBEVOICE_SPEAKER[AZURE_VOICES[planet].gender];

  const createRes = await fetch(REPLICATE_PREDICTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      input: {
        text: text.slice(0, 4000),
        speaker_names: [speaker],
      },
    }),
  });
  if (!createRes.ok) {
    const msg = await createRes.text().catch(() => createRes.status.toString());
    throw new Error(`VibeVoice create ${createRes.status}: ${msg}`);
  }
  let prediction = await createRes.json() as ReplicatePrediction;

  const deadline = Date.now() + REPLICATE_TIMEOUT_MS;
  const terminal = new Set(["succeeded", "failed", "canceled"]);
  while (!terminal.has(prediction.status)) {
    if (Date.now() > deadline) throw new Error("VibeVoice timed out after 90s");
    await new Promise(resolve => setTimeout(resolve, REPLICATE_POLL_INTERVAL_MS));
    const pollRes = await fetch(prediction.urls.get, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!pollRes.ok) {
      const msg = await pollRes.text().catch(() => pollRes.status.toString());
      throw new Error(`VibeVoice poll ${pollRes.status}: ${msg}`);
    }
    prediction = await pollRes.json() as ReplicatePrediction;
  }

  if (prediction.status !== "succeeded") {
    throw new Error(`VibeVoice ${prediction.status}: ${prediction.error ?? "unknown error"}`);
  }

  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!outputUrl) throw new Error("VibeVoice: empty output");

  const audioRes = await fetch(outputUrl);
  if (!audioRes.ok) throw new Error(`VibeVoice audio fetch ${audioRes.status}`);
  return audioRes.blob();
}
```

- [ ] **Step 2: Wire it into the waterfall map**

In the same file, find `SYNTHESIZERS` (currently lines 190-196) and add the new entry:

```typescript
const SYNTHESIZERS: Record<string, (text: string, planet: VoicePlanet, aspects: Aspect[]) => Promise<Blob>> = {
  cartesia:   (t, p)    => synthesizeCartesia(t, p),
  elevenlabs: (t, p, a) => synthesizeElevenLabs(t, p, a),
  openai:     (t, p)    => synthesizeOpenAI(t, p),
  azure:      (t, p)    => synthesizeAzure(t, p),
  google:     (t, p)    => synthesizeGoogle(t, p),
  vibevoice:  (t, p)    => synthesizeVibeVoice(t, p),
};
```

- [ ] **Step 3: Append `"vibevoice"` to every planet's provider chain**

Replace the full `PLANET_PROVIDER_CHAIN` block (currently lines 8-18) with:

```typescript
export const PLANET_PROVIDER_CHAIN: Record<VoicePlanet, string[]> = {
  Sun:     ["cartesia", "azure",      "google",     "elevenlabs", "openai",     "vibevoice"],
  Moon:    ["cartesia", "openai",     "elevenlabs", "azure",      "google",     "vibevoice"],
  Mercury: ["cartesia", "elevenlabs", "openai",     "google",     "azure",      "vibevoice"],
  Venus:   ["cartesia", "google",     "azure",      "elevenlabs", "openai",     "vibevoice"],
  Mars:    ["cartesia", "azure",      "elevenlabs", "google",     "openai",     "vibevoice"],
  Jupiter: ["cartesia", "openai",     "google",     "azure",      "elevenlabs", "vibevoice"],
  Saturn:  ["cartesia", "google",     "elevenlabs", "azure",      "openai",     "vibevoice"],
  Uranus:  ["cartesia", "elevenlabs", "azure",      "openai",     "google",     "vibevoice"],
  Neptune: ["cartesia", "openai",     "google",     "elevenlabs", "azure",      "vibevoice"],
};
```

- [ ] **Step 4: Document the new env var in `.env.example`**

Add near the existing TTS section:

```
# VibeVoice (Replicate) — last-resort TTS fallback, only used if all other providers fail
REPLICATE_API_TOKEN=
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Create `scripts/verify-vibevoice.ts`**

```typescript
// Manual verification for the VibeVoice fallback — requires a real
// REPLICATE_API_TOKEN in .env.local and makes a real (billed) API call.
// Not part of any automated suite. Run with: npx tsx --env-file=.env.local scripts/verify-vibevoice.ts
import { writeFileSync, mkdirSync } from "fs";
import { synthesizeVibeVoice } from "../src/lib/oracle/ttsProviders";

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("REPLICATE_API_TOKEN not set — run with --env-file=.env.local");
    process.exit(1);
  }

  console.log("Requesting VibeVoice synthesis for planet=Mercury (male-lean speaker)...");
  const start = Date.now();
  const blob = await synthesizeVibeVoice("This is a test of the VibeVoice fallback voice.", "Mercury");
  const elapsedS = ((Date.now() - start) / 1000).toFixed(1);

  const outDir = "scripts/shots";
  mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}/vibevoice-test.mp3`;
  const buf = Buffer.from(await blob.arrayBuffer());
  writeFileSync(outPath, buf);

  console.log(`OK — ${buf.length} bytes in ${elapsedS}s, written to ${outPath}`);
}

main().catch(err => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 7: Run the verification script**

Run: `npx tsx --env-file=.env.local scripts/verify-vibevoice.ts`
Expected: `OK — <N> bytes in <T>s, written to scripts/shots/vibevoice-test.mp3` (T will be roughly 35-90s). Play the resulting file to confirm it's audible, intelligible speech.

If this fails with a schema-related error (e.g. "invalid input: speaker_names"), revisit the live schema captured in Phase 0 step 4 and adjust the `input` body in Step 1 above to match, then re-run.

- [ ] **Step 8: Commit**

```bash
git add src/lib/oracle/ttsProviders.ts .env.example scripts/verify-vibevoice.ts
git commit -m "feat(voice): VibeVoice (Replicate) as last-resort TTS fallback for all planets"
```

---

## Self-Review

**Spec coverage:** waterfall-only integration (no LiveKit changes) ✅; Replicate hosting, no self-hosted GPU ✅; matches existing synthesizer signature ✅; polling committed approach, no reliance on wait-mode ✅ (Phase 0 note documents wait-mode as a future check, not wired into committed code); voice mapping reuses `AZURE_VOICES` gender split ✅; error handling matches existing waterfall pattern (throw → caught by `synthesizeWithWaterfall`'s loop) ✅ — no new error-handling code needed since `synthesizeVibeVoice` follows the exact same throw-on-failure contract as every other synthesizer; testing via typecheck + manual verification script ✅.

**Placeholder scan:** clean — Phase 0 documents that live schema may require a field-name adjustment, but gives the exact command to discover the real schema and says explicitly what to do with it (not a vague TBD).

**Type consistency:** `synthesizeVibeVoice(text: string, planet: VoicePlanet): Promise<Blob>` defined in Task 1 Step 1, consumed identically in Task 1 Step 2 (`SYNTHESIZERS` map) and Task 1 Step 6 (verify script) — matches everywhere.

**Known open item:** the exact Replicate input field names (`text`, `speaker_names`) are the best-corroborated guess from public docs, not a confirmed live schema — Phase 0 step 4 and Task 1 Step 7 both exist specifically to catch and correct this before the commit lands.
