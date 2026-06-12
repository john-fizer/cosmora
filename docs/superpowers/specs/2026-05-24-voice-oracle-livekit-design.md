# Voice Oracle — LiveKit Wiring Design
**Date:** 2026-05-24
**Scope:** Wire `AgentHaloRing` + LiveKit real-time voice into Cosmora's VoiceOracle component, and ship the ring to native-os too.

---

## What We're Building

Replace the current one-way ElevenLabs TTS oracle with a live, bidirectional voice session powered by LiveKit. When the user activates voice, they speak to the planetary oracle and it responds in real-time. The session is visualized by a new `AgentHaloRing` component — a 3D tube ring that tumbles through multi-axis rotation and pulses with audio volume.

---

## Visual Component — `AgentHaloRing`

**Replaces:** `AgentAudioVisualizerAura` in both projects.

**Renderer:** Canvas-based 3D tube ring (v3 design):
- 3 stripes on a torus surface — highlight / center / shadow — derived from a single base `color` prop
- Multi-axis rotation: `ax`, `ay`, `az` advance at incommensurable rates (creating NE/NW/SW/N/S precession)
- Liquid distortion on ring perimeter driven by `agentVolume`
- Radial pulse driven by `userVolume`
- Holographic hue drift: base color shifts ±range over time via HSL
- Z-depth fade: back arc becomes semi-transparent
- Bloom glow layer on highlight stripe
- Inner specular arc highlight

**Props:**
```tsx
interface AgentHaloRingProps {
  width?: number          // default 300
  height?: number         // default 200  (nav: 48×32)
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | string
  color: string           // hex — drives all 3 stripe hues
  agentVolume?: number    // 0–1
  userVolume?: number     // 0–1
}
```

**Color derivation from single `color` prop:**
- Parse hex → HSL
- Stripe 0 (highlight): `H`, `S+5%`, `L+20%`, alpha 0.9
- Stripe 1 (center): `H+8`, `S`, `L`, alpha 0.6
- Stripe 2 (shadow): `H+18`, `S-10%`, `L-18%`, alpha 0.35

**State → rotation speed + distortion:**
| State | axSpeed | aySpeed | azSpeed | distMult |
|---|---|---|---|---|
| idle | 0.10 | 0.17 | 0.06 | 0.25 |
| listening | 0.22 | 0.35 | 0.13 | 0.90 |
| thinking | 0.50 | 0.67 | 0.28 | 0.50 |
| speaking | 0.28 | 0.44 | 0.16 | 1.70 |

**Placement:**
- Cosmora: nav pill at 48×32, color = `PLANET_VOICES[planet].color`
- native-os: nav or wherever used, color = `#1FD5F9` (fixed cyan)

---

## LiveKit Architecture

```
Browser (Next.js)                    LiveKit Cloud
─────────────────                    ─────────────
VoiceOracle toggle ON
  → POST /api/livekit/token          ← generates AccessToken
  ← { token, url, roomName }
  → Room.connect(url, token)    ────→ Room created
  → dispatch agent              ────→ agent/agent.py joins room
                                       planet + chartContext
                                       loaded from room.metadata
  ← agent joins, publishes audio
  ← RPC state updates
  → AgentHaloRing animates
```

**Files to create/modify:**

### 1. `/api/livekit/token/route.ts` (new — both projects)
- `POST { planet, chartContext? }`
- Creates `AccessToken` with `RoomJoin` grant using `livekit-server-sdk`
- Sets room metadata: `JSON.stringify({ planet, chartContext })`
- Returns `{ token, url: LIVEKIT_URL, roomName }`
- Room name: `oracle-${profileId}-${Date.now()}` (unique per session)

### 2. `useOracleSession` hook (new — Cosmora)
Location: `src/lib/oracle/useOracleSession.ts`

```typescript
// Returns:
{
  connect: (planet, chartContext?) => Promise<void>
  disconnect: () => void
  isConnected: boolean
  agentState: 'idle' | 'listening' | 'thinking' | 'speaking'
  agentVolume: number   // 0–1, from agent audio track analyser
  userVolume: number    // 0–1, from local mic analyser
  agentTrack: RemoteAudioTrack | null
}
```

- Uses `Room` from `livekit-client`
- Subscribes to `RoomEvent.DataReceived` for agent state updates
- Uses `createAudioAnalyser` on both agent track and local mic for volume
- Cleans up room + analysers on disconnect

### 3. `AgentHaloRing` component (new — both projects)
- Cosmora: `src/components/oracle/AgentHaloRing.tsx`
- native-os: `src/components/AgentHaloRing.tsx`
- Replaces existing `AgentAudioVisualizerAura.tsx` in both

### 4. `VoiceOracle.tsx` (modify — Cosmora only)
- Add `onLiveVoice?: (active: boolean) => void` prop
- When enabled toggle fires: also call `connect(planet, chartContext)` via `useOracleSession`
- Replace the small dot/ring in the pill with `<AgentHaloRing width={48} height={32} ... />`
- Show connection status: "LIVE" label when connected vs "VOICE" when off

### 5. Oracle page (`dashboard/oracle/page.tsx`) — minor wiring
- Pass `agentState`, `agentVolume`, `userVolume` into VoiceOracle
- Existing `orbState` can stay as-is (drives the text indicator)

---

## Agent State Protocol

The Python agent signals state changes to the frontend via LiveKit data messages:

```python
# In agent.py — add to CosmicOracle
async def on_user_speech_started(self):
    await self.session.room.local_participant.publish_data(
        b'{"state":"listening"}', reliable=True
    )
async def on_agent_speech_started(self):
    await self.session.room.local_participant.publish_data(
        b'{"state":"speaking"}', reliable=True
    )
# etc.
```

Frontend `useOracleSession` listens for these and updates `agentState`.

---

## Scope

**In scope:**
- `AgentHaloRing` component (both projects, replaces `AgentAudioVisualizerAura`)
- `/api/livekit/token` route (both projects)
- `useOracleSession` hook (Cosmora)
- `VoiceOracle.tsx` wired to LiveKit (Cosmora)
- Agent state signals in `agent.py` (both)

**Out of scope (future):**
- Replacing `InsightPlayer` ElevenLabs playback — those stay as-is
- Cosmora planet voice → Cartesia voice ID mapping
- native-os full voice UI (just the component for now)

---

## .gitignore
Add `.superpowers/` to Cosmora's `.gitignore` if not already present.
