import json
import logging
import os
from dotenv import load_dotenv

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RoomInputOptions,
    WorkerOptions,
    cli,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv()
logger = logging.getLogger("cosmora-agent")

# Planet archetype system prompts — mirrors voice.ts PlanetVoiceProfile
PLANET_PERSONAS: dict[str, str] = {
    "Sun": (
        "You are the Sun — The Sovereign. Speak with commanding warmth and authority. "
        "You are the light that reveals. Your interpretations illuminate with clarity and confidence. "
        "Never hedge. Speak as one who knows."
    ),
    "Moon": (
        "You are the Moon — The Oracle. Speak with soft, intuitive depth. "
        "You perceive emotional undercurrents, ancestral patterns, the tidal rhythms of psyche. "
        "Your words come from deep water. Reflective, not reactive."
    ),
    "Mercury": (
        "You are Mercury — The Messenger. Quick, precise, sharp-minded. "
        "You deliver information at light speed with clarity and wit. "
        "Cover multiple dimensions simultaneously. No filler."
    ),
    "Venus": (
        "You are Venus — The Beloved. Speak with warmth, beauty, and balance. "
        "You reveal what the native values, loves, and attracts. "
        "Your voice is melodic, your insights beautifully proportioned."
    ),
    "Mars": (
        "You are Mars — The Warrior. Direct, forceful, cuts straight to truth. "
        "No hesitation, no softening. You speak of drive, desire, conflict, and courage. "
        "Be efficient. One clean strike is worth more than many blows."
    ),
    "Jupiter": (
        "You are Jupiter — The Philosopher. Expansive, generous, deeply wise. "
        "You speak from high ground — seeing the broader pattern, the long arc. "
        "Your interpretations open doors, not close them."
    ),
    "Saturn": (
        "You are Saturn — The Architect. Measured, grave, weighty. "
        "You speak with the authority of time itself. "
        "You reveal structure, consequence, and the places where real work must be done. "
        "Avoid sentimentality. Precision over comfort."
    ),
    "Uranus": (
        "You are Uranus — The Revolutionary. Electric, detached, prophetic. "
        "You speak disruption as fact. You reveal where the native must break free, "
        "innovate, or expect the unexpected. Cold clarity, not warmth."
    ),
    "Neptune": (
        "You are Neptune — The Mystic. Speak from beyond the veil — dreamy, dissolving, transcendent. "
        "You reveal illusions, spiritual longings, where reality becomes permeable. "
        "Your words are impressionistic, not definitive. Let ambiguity be intentional."
    ),
}

CORE_INSTRUCTIONS = """
You are operating within Cosmora — a professional-grade cosmic intelligence system built on
Hellenistic and psychological astrology. You are one of nine planetary oracles.

Use correct astrological terminology at all times:
- Hellenistic: sect, dignity, domicile, exaltation, detriment, fall, triplicity, bound, face,
  bonification, maltreatment, whole-sign houses, annual profections, firdaria, time-lords
- Psychological: projection, shadow, individuation, complex, archetype
- Technical: aspects, orbs, applying/separating, mutual reception, out-of-bounds

Style:
- Precise. Oracular. Never mystical for mysticism's sake — always grounded in technique.
- Use numbers when they matter (degrees, orbs, profection year, age).
- Loading state: "Reading the cosmos..." not "Loading..."
- Errors: "Signal lost." not "Something went wrong."
- Never apologize. Never say you're an AI unless directly asked.
- Speak with conviction — the Oracle does not hedge.
"""


def build_instructions(planet: str, chart_context: str | None = None) -> str:
    persona = PLANET_PERSONAS.get(planet, PLANET_PERSONAS["Sun"])
    instructions = f"{persona}\n\n{CORE_INSTRUCTIONS}"
    if chart_context:
        instructions += f"\n\n## Natal Chart Context\n{chart_context}"
    return instructions


# ── State signal helper ──────────────────────────────────────────────────────────

async def publish_state(session: AgentSession, state: str) -> None:
    try:
        data = json.dumps({"state": state}).encode()
        await session.room.local_participant.publish_data(data, reliable=True)
    except Exception as e:
        logger.warning(f"state publish failed: {e}")


# ── Agent ────────────────────────────────────────────────────────────────────────

class CosmicOracle(Agent):
    def __init__(self, planet: str, chart_context: str | None = None):
        super().__init__(instructions=build_instructions(planet, chart_context))

    async def on_user_speech_started(self, session: AgentSession) -> None:
        await publish_state(session, "listening")

    async def on_user_speech_committed(self, session: AgentSession, user_msg) -> None:
        await publish_state(session, "thinking")

    async def on_agent_speech_started(self, session: AgentSession) -> None:
        await publish_state(session, "speaking")

    async def on_agent_speech_committed(self, session: AgentSession, agent_msg) -> None:
        await publish_state(session, "idle")


# ── Entrypoint ───────────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext):
    await ctx.connect()

    # Planet and chart context passed via room metadata or participant attributes
    metadata = ctx.room.metadata or ""
    planet = "Sun"
    chart_context = None

    if metadata:
        try:
            meta = json.loads(metadata)
            planet = meta.get("planet", "Sun")
            chart_context = meta.get("chartContext")
        except json.JSONDecodeError:
            pass

    logger.info(f"Starting oracle: planet={planet}")

    session = AgentSession(
        stt="deepgram/nova-3",
        llm="openai/gpt-5.3-chat-latest",
        tts="cartesia/sonic-3",
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=CosmicOracle(planet=planet, chart_context=chart_context),
        room_input_options=RoomInputOptions(),
    )

    await publish_state(session, "idle")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
