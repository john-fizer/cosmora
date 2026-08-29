import { PLANET_SYMBOLS, TRADITIONAL_RULERS } from "@/lib/astrology/types";
import type { ChartData } from "@/lib/astrology/types";

// ─── Chart context builder ────────────────────────────────────────────────────
//
// Shared by every route that gives the model a natal chart to delineate from
// (currently /api/chat and /api/oracle/stream). This used to live only in
// /api/chat, so a chart-reasoning fix made there silently didn't apply to
// oracle/stream's callers (marriages, pressure, map readings, temporal) —
// keep this as the one place either route pulls chart grounding from.

export function buildChartContext(chart: ChartData): string {
  const p = chart.planets;
  const ascSign = chart.houses[0]?.sign ?? "Unknown";
  const lordOfYear = chart.annualProfection.lordOfYear;

  // Planets grouped by house — makes co-presence (planets sharing a house)
  // visible at a glance instead of requiring a scan of a flat list. Missing
  // a co-present planet was the exact failure mode this was added to fix.
  const byHouse = new Map<number, typeof p>();
  for (const pl of p) {
    if (!byHouse.has(pl.house)) byHouse.set(pl.house, []);
    byHouse.get(pl.house)!.push(pl);
  }

  const planetSummary = p.map(pl => {
    const decanStr = pl.decan ? ` decan ${pl.decan} (${pl.decanLord} face)` : "";
    const lordTag = pl.name === lordOfYear ? " ← LORD OF YEAR (activated this year)" : "";
    return `${PLANET_SYMBOLS[pl.name] ?? pl.name} ${pl.name}: ${pl.signDegree.toFixed(1)}° ${pl.sign}${decanStr} (House ${pl.house})${pl.retrograde ? " Rx" : ""}${pl.dignity ? ` [${pl.dignity}]` : ""}${lordTag}`;
  }).join("\n");

  // Precomputed so the model reads the correct dispositor instead of
  // deriving "sign on cusp → traditional ruler → where that planet actually
  // sits" itself — exactly the multi-step chain it was getting wrong.
  const houseRulers = chart.houses.map(h => {
    const ruler = TRADITIONAL_RULERS[h.sign];
    const rulerPlanet = p.find(pl => pl.name === ruler);
    const coOccupants = (byHouse.get(h.house) ?? []).map(pl => pl.name).join(", ") || "empty";
    const rulerLoc = rulerPlanet
      ? `${rulerPlanet.sign} House ${rulerPlanet.house}${rulerPlanet.retrograde ? " Rx" : ""}${rulerPlanet.dignity ? ` [${rulerPlanet.dignity}]` : ""}${rulerPlanet.name === lordOfYear ? " ← LORD OF YEAR" : ""}`
      : "unknown";
    return `House ${h.house} (${h.sign}): ruled by ${ruler}, who is in ${rulerLoc}. Occupants of House ${h.house}: ${coOccupants}.`;
  }).join("\n");

  const aspects = chart.aspects.slice(0, 12).map(a =>
    `${a.planet1} ${a.type} ${a.planet2} (orb ${a.orb.toFixed(1)}°${a.exact ? ", exact" : ""}${a.applying ? ", applying" : ""})`
  ).join("\n");

  const prof = chart.annualProfection;

  return `
CHART SUMMARY:
- Native: ${ascSign} Rising
- Ascendant: ${chart.ascendant.toFixed(1)}° ${ascSign}
- Midheaven: ${chart.midheaven.toFixed(1)}°
- Sect: ${chart.sect} chart
- House System: ${chart.houseSystem}

NATAL PLANETS:
${planetSummary}

HOUSE RULERS (dispositors — use this table directly, do not re-derive it):
${houseRulers}

KEY ASPECTS:
${aspects}

ANNUAL PROFECTION:
Age ${prof.age}: Activated House ${prof.activatedHouse} (${prof.activatedSign}) — Lord of Year: ${prof.lordOfYear}
Lot of Fortune: ${chart.lotOfFortune.toFixed(1)}° | Lot of Spirit: ${chart.lotOfSpirit.toFixed(1)}°
`.trim();
}

// ─── Delineation methodology ───────────────────────────────────────────────────
//
// The step-by-step order that fixed the original bug (picking the wrong
// starting point instead of the dispositor, omitting a co-present planet's
// significance). Deliberately has no tool-use language in it — /api/chat
// prepends its own "use the available tools" sentence on top of this since
// it has tools; /api/oracle/stream has no tool loop, so it uses this alone.

export const DELINEATION_METHODOLOGY = `
DELINEATION METHODOLOGY — follow this order for ANY house or topic-based reading (e.g. "what about my relationships / career / money"):
1. Identify the relevant house and read its ruler directly from the HOUSE RULERS table in the chart context — that table is precomputed and correct. Never re-derive a dispositor from the sign on the cusp yourself; a wrong dispositor invalidates everything built on it.
2. Note the dispositor's own sign, house, and dignity from that same table entry — this is where the topic's "real story" plays out, not just the house itself.
3. Check that table's "Occupants" list for the dispositor's house AND for the topic house itself. Every co-present planet modifies or shares the story — naming the dispositor while silently skipping a co-occupant (especially the Lord of the Year, marked inline) is an incomplete reading, not a concise one.
4. Cross-reference: is the dispositor, or any co-occupant you just found, the Lord of the Year (tagged in the chart context)? If so, that activation is often the single most important point in the reading — lead with it, don't bury it.
5. Only then check aspects to the dispositor and co-occupants before writing.
Do this silently before you start writing prose — the reader should never have to ask "did you check X" for you to mention it.`.trim();
