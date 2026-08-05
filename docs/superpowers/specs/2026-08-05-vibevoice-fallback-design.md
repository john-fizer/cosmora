# VibeVoice Last-Resort TTS Fallback — Design

## Goal

Add Microsoft VibeVoice as a 6th, final link in Cosmora's existing per-planet TTS
provider waterfall (`src/lib/oracle/ttsProviders.ts`). It only runs if every other
configured provider fails for a given request. Not user-selectable, no UI changes.

## Non-goals

- **LiveKit live voice sessions are out of scope.** `agent/agent.py`'s real-time
  conversational voice (Deepgram STT + Cartesia TTS) is a separate system and is not
  touched by this work.
- No self-hosted GPU infrastructure — this uses Microsoft's model hosted on Replicate.
- No new per-planet voice tuning table — VibeVoice's speaker selection reuses the
  existing male/female lean already encoded in `AZURE_VOICES[planet].gender`.

## Background: existing waterfall

`ttsProviders.ts` already implements exactly the pattern this needs. Each planet has
an ordered provider list (`PLANET_PROVIDER_CHAIN`); `synthesizeWithWaterfall` tries
each in turn, catching and logging failures, returning the first success:

```typescript
export async function synthesizeWithWaterfall(
  text: string, planet: VoicePlanet, aspects: Aspect[],
): Promise<{ blob: Blob; provider: string }> {
  const chain = PLANET_PROVIDER_CHAIN[planet];
  for (const name of chain) {
    try { return { blob: await SYNTHESIZERS[name](text, planet, aspects), provider: name }; }
    catch (err) { /* log, continue */ }
  }
  throw new Error(`All TTS providers failed for ${planet}: ...`);
}
```

Current chains list 5 providers each (`cartesia`, `azure`, `google`, `elevenlabs`,
`openai`), in a per-planet order. This design appends `"vibevoice"` as the 6th entry
on every planet's chain.

## Hosting: Replicate

Microsoft publishes `microsoft/vibevoice` as a hosted model on Replicate
(https://replicate.com/microsoft/vibevoice). No infrastructure to run or maintain;
pay-per-inference (~$0.033/run at time of writing), so cost is only incurred on the
rare occasion this fallback actually fires. Runs on an L40S GPU; typical generation
takes ~35 seconds (this is a batch prediction, not a stream — the full audio file is
returned only once generation completes).

New env var: `REPLICATE_API_TOKEN` (added to `.env.local` and documented in
`.env.example`).

## New code: `synthesizeVibeVoice`

Added to `src/lib/oracle/ttsProviders.ts`, matching the existing synthesizer function
signature exactly: `(text: string, planet: VoicePlanet, aspects: Aspect[]) => Promise<Blob>`.

**Flow:**
1. POST to Replicate's prediction-creation endpoint with the model version, input text
   (respecting whatever length cap the model documents), and the chosen speaker name.
2. Poll the prediction's status URL (returned in the creation response) every ~2
   seconds until `status` is `"succeeded"` or `"failed"`, capped at a 90-second overall
   timeout (comfortably above the ~35s typical runtime, to absorb variance).
   - On `"failed"`: throw with Replicate's provided error detail.
   - On timeout: throw a timeout-specific error.
3. On `"succeeded"`, fetch the output audio URL from the prediction result and return
   its bytes as a `Blob`, exactly like every other synthesizer.

**Implementation note carried into the plan:** Replicate has historically offered a
"wait" mode (a header that blocks the initial request until the job completes,
avoiding a manual polling loop). This design does not depend on it — polling is the
committed approach, guaranteed correct regardless of current platform behavior — but
the plan should note it as a candidate simplification worth checking against current
Replicate docs during implementation, not a blocker.

## Voice mapping

Two fixed VibeVoice sample speakers are used: one for planets whose `AZURE_VOICES`
entry has `gender: "Male"`, one for `gender: "Female"`. No new per-planet tuning file —
this reuses data that already exists in `ttsProviders.ts`. Exact speaker names (e.g.
`"Frank"` / `"Alice"` from Replicate's example usage) to be confirmed against the
model's current input schema during implementation.

## Error handling

No new error-handling pattern — this follows the waterfall's existing behavior
exactly. A VibeVoice failure (including a timeout) is caught by
`synthesizeWithWaterfall`'s loop like any other provider failure, logged, and — since
it's last in the chain — is what surfaces as the final "all providers failed" error to
the caller if it's also the last one tried. This matches current behavior when all 5
existing providers fail; VibeVoice simply extends the chain by one link.

## Testing / verification

`ttsProviders.ts` has no automated test suite today. Verification for this change:
- `npx tsc --noEmit` — clean typecheck.
- Manual check: temporarily reorder one planet's chain to `["vibevoice"]` only,
  trigger a read-aloud request, confirm audio is returned and plays.
- Confirm the 90s timeout path behaves reasonably (doesn't hang the request
  indefinitely) — can be forced by testing with an invalid `REPLICATE_API_TOKEN` to
  exercise the failure branch, or by inspection of the polling loop's exit conditions.

This matches the manual-verification approach used for other recent Cosmora changes
in this session (typecheck + targeted Playwright/manual checks), since the codebase
has no broader automated test suite.
