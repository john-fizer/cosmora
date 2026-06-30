import type { AkashicEntry, EntryChartContext, PlacementContext } from "./types";
import type { ChartData } from "@/lib/astrology/types";
import type { SiderealChart, VimshottariData, CharaKarakas } from "@/lib/astrology/sidereal";

export function getEntryChartContext(
  entry: AkashicEntry,
  chart: ChartData,
  sidereal?: SiderealChart | null,
  dasha?: VimshottariData | null,
  karakas?: CharaKarakas | null,
): EntryChartContext {
  const placements: PlacementContext[] = [];

  for (const key of entry.chartKeys) {
    if (key.type === "planet" && key.name) {
      const p = chart.planets.find(pl => pl.name === key.name);
      if (p) {
        const sp = sidereal?.placements.find(pl => pl.name === key.name);
        const nak = sp ? `${sp.nakshatra.nakshatra.name} P${sp.nakshatra.pada}` : "";
        placements.push({
          label: `Your ${p.name.replace("NorthNode", "North Node")}`,
          detail: `${p.sign} · House ${p.house}${nak ? ` · ${nak}` : ""}`,
          extra: p.retrograde ? "Rx" : undefined,
        });
      }
    }

    if (key.type === "sign" && key.name) {
      const inSign = chart.planets.filter(pl => pl.sign === key.name);
      for (const p of inSign) {
        placements.push({
          label: `Your ${p.name.replace("NorthNode", "North Node")}`,
          detail: `in ${p.sign} · House ${p.house}`,
          extra: p.retrograde ? "Rx" : undefined,
        });
      }
    }

    if (key.type === "house" && key.number != null) {
      const inHouse = chart.planets.filter(pl => pl.house === key.number);
      if (inHouse.length > 0) {
        for (const p of inHouse) {
          placements.push({
            label: `Your ${p.name.replace("NorthNode", "North Node")}`,
            detail: `in ${p.sign} · ${key.number}${ordinal(key.number)} House`,
            extra: p.retrograde ? "Rx" : undefined,
          });
        }
      } else {
        const houseSign = chart.houses[key.number - 1]?.sign;
        if (houseSign) placements.push({ label: `Your ${ordinal(key.number)} House`, detail: houseSign });
      }
    }

    if (key.type === "technique") {
      if (key.key === "currentDasha" && dasha?.currentMajor) {
        placements.push({
          label: "Current Dasha",
          detail: `${dasha.currentMajor.ruler} major${dasha.currentAntar ? ` / ${dasha.currentAntar.antardasha} antardasha` : ""}`,
        });
      }
      if (key.key === "ak" && karakas?.ak) {
        placements.push({ label: "Your Atmakaraka (AK)", detail: `${karakas.ak.planet.replace("NorthNode", "Rahu")} · ${karakas.ak.degInSign.toFixed(2)}° in sign` });
      }
      if (key.key === "sect") {
        const sun = chart.planets.find(p => p.name === "Sun");
        if (sun) {
          // Daytime if Sun is in houses 7–12 (above the horizon)
          const sunHouse = chart.houses.findIndex(h => sun.longitude >= h.longitude) + 1;
          const isDay = sunHouse >= 7 && sunHouse <= 12;
          placements.push({ label: "Your Chart Sect", detail: isDay ? "Day Chart" : "Night Chart" });
        }
      }
    }
  }

  const hasRelevance = placements.length > 0;
  const headline = placements.length === 1
    ? `${placements[0].label}: ${placements[0].detail}`
    : placements.length > 1
      ? `${placements.length} of your placements connect to this topic`
      : "A foundational concept in your chart";

  return { hasRelevance, placements, headline };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
