import type { ChartData, PlanetName } from "./types";
import { TRADITIONAL_RULERS } from "./types";
import { calculateTransits, type TransitAspect } from "./transits";
import { buildZRData } from "./zodiacalReleasing";

/**
 * Pressure Windows — stacked-technique convergence detector.
 * Three independent timing systems are read in parallel; when two or more
 * flag the same season, the window is real. "When the universe has your
 * back against the wall" — detected deterministically, explained by the Oracle.
 */

export interface PressureSignal {
  source: "transits" | "profection" | "releasing";
  weight: number;          // 0–1 contribution
  label: string;           // short technical label
  detail: string;          // one-sentence technical description
  easesBy?: string;        // ISO date when this signal releases, if known
}

export type PressureLevel = "clear" | "elevated" | "critical";

export interface PressureReport {
  score: number;           // 0–100
  level: PressureLevel;
  activeSources: number;   // how many independent systems agree
  signals: PressureSignal[];
  computedAt: string;
}

const MALEFICS: PlanetName[] = ["Saturn", "Mars", "Pluto"];
const HARD_ASPECTS = new Set(["conjunction", "square", "opposition"]);
const SENSITIVE_POINTS: PlanetName[] = ["Sun", "Moon"];

function transitSignals(chart: ChartData, date: Date): PressureSignal[] {
  const { aspects } = calculateTransits(chart, date);
  const lord = chart.annualProfection.lordOfYear;
  const out: PressureSignal[] = [];

  const hard = (a: TransitAspect) =>
    HARD_ASPECTS.has(a.type) && MALEFICS.includes(a.transitPlanet) && a.transitPlanet !== a.natalPlanet;

  for (const a of aspects.filter(hard)) {
    const hitsLuminary = SENSITIVE_POINTS.includes(a.natalPlanet);
    const hitsLord = a.natalPlanet === lord;
    if (!hitsLuminary && !hitsLord) continue;

    // Applying within orb is heavier than separating; slow planets are heavier
    const slowness = a.transitPlanet === "Pluto" ? 1.0 : a.transitPlanet === "Saturn" ? 0.85 : 0.55;
    const phase = a.applying ? 1.0 : 0.55;
    const target = hitsLord ? 0.9 : 1.0;
    const weight = Math.min(1, 0.45 * slowness * phase * target + (a.exact ? 0.25 : 0));

    const eases = a.daysToExact !== null && a.daysToExact > 0
      ? new Date(date.getTime() + (a.daysToExact + 14) * 86400000).toISOString().slice(0, 10)
      : undefined;

    out.push({
      source: "transits",
      weight,
      label: `${a.transitPlanet} ${a.type} natal ${a.natalPlanet}${hitsLord ? " (Lord of Year)" : ""}`,
      detail: `Transiting ${a.transitPlanet} ${a.type} natal ${a.natalPlanet} — orb ${a.orb.toFixed(1)}°, ${a.applying ? "applying" : "separating"}${a.exact ? ", exact" : ""}.`,
      easesBy: eases,
    });
  }
  return out;
}

function profectionSignals(chart: ChartData, date: Date): PressureSignal[] {
  const lord = chart.annualProfection.lordOfYear;
  const lordNatal = chart.planets.find(p => p.name === lord);
  if (!lordNatal) return [];
  const out: PressureSignal[] = [];

  // A debilitated Lord of the Year colors the whole year
  if (lordNatal.dignity === "fall" || lordNatal.dignity === "detriment") {
    out.push({
      source: "profection",
      weight: 0.45,
      label: `Lord of Year ${lord} in ${lordNatal.dignity}`,
      detail: `This year is governed by ${lord}, natally in ${lordNatal.dignity} in ${lordNatal.sign} — the year's agenda runs through a debilitated ruler.`,
    });
  }

  // Profection year activating a house holding a natal malefic
  const activated = chart.annualProfection.activatedHouse;
  const maleficInHouse = chart.planets.find(p => MALEFICS.includes(p.name) && p.house === activated);
  if (maleficInHouse) {
    out.push({
      source: "profection",
      weight: 0.4,
      label: `Profection year activates natal ${maleficInHouse.name} (H${activated})`,
      detail: `The annual profection has turned the spotlight on house ${activated}, where natal ${maleficInHouse.name} sits — its themes are live all year.`,
    });
  }
  return out;
}

function releasingSignals(chart: ChartData, birthDatetime: string): PressureSignal[] {
  const out: PressureSignal[] = [];
  try {
    const zr = buildZRData(chart.lotOfSpirit, birthDatetime);
    const l2 = zr.currentL2;
    if (!l2) return out;

    if (l2.isLooseningOfBonds) {
      out.push({
        source: "releasing",
        weight: 0.85,
        label: "Loosening of the Bonds (ZR L2 opposition)",
        detail: `The current Spirit L2 period (${l2.sign}) stands in the 7th sign from the L1 — the classical signature of major life restructuring.`,
        easesBy: l2.end.toISOString().slice(0, 10),
      });
    } else if ([4, 10].includes(l2.derivedHouse)) {
      out.push({
        source: "releasing",
        weight: 0.4,
        label: `ZR L2 angular from L1 (${l2.derivedHouse}th sign)`,
        detail: `The current Spirit sub-period (${l2.sign}) is angular from the major period — an intensified, eventful chapter.`,
        easesBy: l2.end.toISOString().slice(0, 10),
      });
    }
    // Malefic ruling the current L2 with debility adds friction
    const l2Ruler = TRADITIONAL_RULERS[l2.sign];
    const rulerNatal = chart.planets.find(p => p.name === l2Ruler);
    if (rulerNatal && MALEFICS.includes(l2Ruler) && (rulerNatal.dignity === "fall" || rulerNatal.dignity === "detriment")) {
      out.push({
        source: "releasing",
        weight: 0.3,
        label: `ZR period ruled by debilitated ${l2Ruler}`,
        detail: `The current releasing period hands time to ${l2Ruler}, natally in ${rulerNatal.dignity} — the chapter is administered by a strained hand.`,
        easesBy: l2.end.toISOString().slice(0, 10),
      });
    }
  } catch { /* ZR data unavailable — skip the layer */ }
  return out;
}

export function detectPressure(chart: ChartData, birthDatetime: string, date: Date = new Date()): PressureReport {
  const signals = [
    ...transitSignals(chart, date),
    ...profectionSignals(chart, date),
    ...releasingSignals(chart, birthDatetime),
  ].sort((a, b) => b.weight - a.weight);

  const activeSources = new Set(signals.map(s => s.source)).size;

  // Convergence law: one system alone caps at "elevated" territory;
  // agreement multiplies. raw = Σ weights × source-agreement multiplier.
  const raw = signals.reduce((a, s) => a + s.weight, 0);
  const multiplier = activeSources >= 3 ? 1.25 : activeSources === 2 ? 1.0 : 0.6;
  const score = Math.round(Math.min(100, raw * multiplier * 38));

  const level: PressureLevel =
    score >= 62 && activeSources >= 2 ? "critical" :
    score >= 30 ? "elevated" : "clear";

  return { score, level, activeSources, signals, computedAt: date.toISOString() };
}
