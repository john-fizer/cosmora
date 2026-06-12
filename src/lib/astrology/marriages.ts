import {
  ZodiacSign, PlanetName, ChartData,
  ZODIAC_SIGNS, TRADITIONAL_RULERS, DOMICILE, EXALTATION,
} from "./types";

export type MarriageNumber = 1 | 2 | 3 | 4;

// Whole-sign offsets from Moon (1-indexed)
const MARRIAGE_OFFSETS: Record<MarriageNumber, number> = {
  1: 7,  // opposite Moon
  2: 2,
  3: 9,
  4: 3,
};

export type EssentialDignity = "domicile" | "exaltation" | "detriment" | "fall" | "peregrine";
export type AccidentalStrength = "angular" | "succedent" | "cadent";

export interface MarriageAspect {
  fromPlanet: PlanetName;
  type: "conjunction" | "opposition" | "trine" | "square" | "sextile" | "quincunx";
  orb: number;
  applying: boolean;
  nature: "benefic" | "malefic" | "neutral";
}

export interface PlanetInSign {
  name: PlanetName;
  sign: ZodiacSign;
  house: number;
  dignity: EssentialDignity;
  retrograde: boolean;
}

export interface MarriageSignificator {
  marriage: MarriageNumber;
  marriageSign: ZodiacSign;
  moonSign: ZodiacSign;
  ruler: PlanetName;
  rulerSign: ZodiacSign;
  rulerHouse: number;
  rulerDignity: EssentialDignity;
  rulerAccidental: AccidentalStrength;
  rulerRetrograde: boolean;
  aspectsToRuler: MarriageAspect[];
  coSignificators: PlanetInSign[];      // planets in same sign as ruler
  planetsInMarriageSign: PlanetInSign[]; // planets in the marriage sign itself
  mutualReceptions: PlanetName[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function essentialDignity(planet: PlanetName, sign: ZodiacSign): EssentialDignity {
  if (DOMICILE[planet]?.includes(sign)) return "domicile";
  if (EXALTATION[planet] === sign) return "exaltation";

  const domicileSigns = DOMICILE[planet] ?? [];
  const detrimentSigns = domicileSigns.map(s => ZODIAC_SIGNS[(ZODIAC_SIGNS.indexOf(s) + 6) % 12]);
  if (detrimentSigns.includes(sign)) return "detriment";

  const exaltSign = EXALTATION[planet];
  if (exaltSign) {
    const fallSign = ZODIAC_SIGNS[(ZODIAC_SIGNS.indexOf(exaltSign) + 6) % 12];
    if (fallSign === sign) return "fall";
  }

  return "peregrine";
}

function accidentalStrength(house: number): AccidentalStrength {
  if ([1, 4, 7, 10].includes(house)) return "angular";
  if ([2, 5, 8, 11].includes(house)) return "succedent";
  return "cadent";
}

const BENEFIC_PLANETS: PlanetName[] = ["Jupiter", "Venus", "Moon", "Sun"];
const MALEFIC_PLANETS: PlanetName[] = ["Saturn", "Mars"];

function planetNature(planet: PlanetName): "benefic" | "malefic" | "neutral" {
  if (BENEFIC_PLANETS.includes(planet)) return "benefic";
  if (MALEFIC_PLANETS.includes(planet)) return "malefic";
  return "neutral";
}

function toPlanetInSign(p: { name: PlanetName; sign: ZodiacSign; house: number; retrograde: boolean }): PlanetInSign {
  return {
    name: p.name,
    sign: p.sign,
    house: p.house,
    dignity: essentialDignity(p.name, p.sign),
    retrograde: p.retrograde,
  };
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export function calculateMarriageSignificators(chart: ChartData): MarriageSignificator[] {
  const moon = chart.planets.find(p => p.name === "Moon");
  if (!moon) return [];

  const moonIdx = ZODIAC_SIGNS.indexOf(moon.sign);

  return ([1, 2, 3, 4] as MarriageNumber[]).flatMap(marriage => {
    const offset = MARRIAGE_OFFSETS[marriage];
    const marriageSign = ZODIAC_SIGNS[(moonIdx + offset - 1) % 12];
    const ruler = TRADITIONAL_RULERS[marriageSign];
    const rulerPlanet = chart.planets.find(p => p.name === ruler);
    if (!rulerPlanet) return [];

    const aspectsToRuler: MarriageAspect[] = chart.aspects
      .filter(a => a.planet1 === ruler || a.planet2 === ruler)
      .map(a => ({
        fromPlanet: a.planet1 === ruler ? a.planet2 : a.planet1,
        type: a.type,
        orb: a.orb,
        applying: a.applying,
        nature: planetNature(a.planet1 === ruler ? a.planet2 : a.planet1),
      }));

    const coSignificators = chart.planets
      .filter(p => p.name !== ruler && p.sign === rulerPlanet.sign)
      .map(toPlanetInSign);

    const planetsInMarriageSign = chart.planets
      .filter(p => p.sign === marriageSign)
      .map(toPlanetInSign);

    // Mutual reception: ruler is in X's domicile, X is in ruler's domicile
    const mutualReceptions = chart.planets
      .filter(p => {
        if (p.name === ruler) return false;
        return (
          TRADITIONAL_RULERS[rulerPlanet.sign] === p.name &&
          TRADITIONAL_RULERS[p.sign] === ruler
        );
      })
      .map(p => p.name);

    return [{
      marriage,
      marriageSign,
      moonSign: moon.sign,
      ruler,
      rulerSign: rulerPlanet.sign,
      rulerHouse: rulerPlanet.house,
      rulerDignity: essentialDignity(ruler, rulerPlanet.sign),
      rulerAccidental: accidentalStrength(rulerPlanet.house),
      rulerRetrograde: rulerPlanet.retrograde,
      aspectsToRuler,
      coSignificators,
      planetsInMarriageSign,
      mutualReceptions,
    }];
  });
}

// ─── Serialise significators to a structured prompt block ─────────────────────

const ORDINALS: Record<MarriageNumber, string> = { 1: "First", 2: "Second", 3: "Third", 4: "Fourth" };
const OFFSET_DESC: Record<MarriageNumber, string> = {
  1: "7th from Moon (opposite)",
  2: "2nd from Moon",
  3: "9th from Moon",
  4: "3rd from Moon",
};

// ─── Divorce / release indicators ─────────────────────────────────────────────

export interface DivorceIndicator {
  id: string;
  chip: string;          // short label for UI chips, e.g. "Mars H7"
  severity: "strong" | "moderate";
  starText: string;      // astrological phrasing
  spiritText: string;    // spiritual phrasing
}

const MUTABLE_SIGNS: ZodiacSign[] = ["Gemini", "Virgo", "Sagittarius", "Pisces"];

export function detectDivorceIndicators(
  chart: ChartData,
  sig: MarriageSignificator,
): DivorceIndicator[] {
  const out: DivorceIndicator[] = [];

  const mars = chart.planets.find(p => p.name === "Mars");
  if (mars?.house === 7) {
    out.push({
      id: "mars_h7",
      chip: "Mars H7",
      severity: "strong",
      starText: "Mars occupies the 7th house — the classical Manglik signature. Conflict, severing energy, and combative intensity live directly in the house of partnership.",
      spiritText: "A warrior force resides in your partnership sphere. Unions in this life carry heat — passion and friction arrive together, and separation energy is woven into how you bond.",
    });
  }

  const nn = chart.planets.find(p => p.name === "NorthNode");
  if (nn) {
    const southNodeHouse = ((nn.house + 5) % 12) + 1;
    if (southNodeHouse === 7) {
      out.push({
        id: "ketu_h7",
        chip: "South Node H7",
        severity: "strong",
        starText: "The South Node (Ketu) falls in the 7th house — a karmic release point in partnerships. Relationships feel fated yet familiar, and the soul's momentum is toward letting them go.",
        spiritText: "Your soul has done partnership before — many times. There is a deep familiarity in how you bond, and an equally deep pull to release. Unions are where old contracts come up for completion.",
      });
    }
  }

  if (sig.rulerDignity === "fall" || sig.rulerDignity === "detriment") {
    out.push({
      id: "ruler_debility",
      chip: `${sig.ruler} ${sig.rulerDignity}`,
      severity: "strong",
      starText: `${sig.ruler}, ruler of this marriage, sits in ${sig.rulerDignity} in ${sig.rulerSign} — the significator is essentially debilitated, weakening the union's foundation.`,
      spiritText: "The force that governs this union operates far from its natural strength. The bond asks for more conscious effort than it would if the current ran in its own channel.",
    });
  }

  // Malefic pressure on the ruler without benefic relief
  const hardFromMalefic = sig.aspectsToRuler.some(
    a => a.nature === "malefic" && (a.type === "square" || a.type === "opposition")
  );
  const beneficRelief = sig.aspectsToRuler.some(
    a => a.nature === "benefic" && (a.type === "trine" || a.type === "sextile")
  );
  if (hardFromMalefic && !beneficRelief) {
    out.push({
      id: "malefic_siege",
      chip: "Afflicted ruler",
      severity: "moderate",
      starText: `The marriage ruler receives hard aspects from the malefics with no benefic relief — pressure on the union arrives without a natural counterbalance.`,
      spiritText: "The union's governing force is tested from more than one direction, and the easing influences are quiet. What holds this bond together must be built, not inherited.",
    });
  }

  if (MUTABLE_SIGNS.includes(sig.marriageSign)) {
    out.push({
      id: "mutable_sign",
      chip: `${sig.marriageSign} (mutable)`,
      severity: "moderate",
      starText: `The marriage sign ${sig.marriageSign} is mutable — adaptable but changeable. Mutable marriage signs classically incline toward impermanence or plurality of unions.`,
      spiritText: "This union lives under a changeable sky. It bends rather than breaks — but what bends can also drift. Constancy here is a practice, not a given.",
    });
  }

  return out;
}

// ─── Remedies — blended Vedic / Western / Archetypal prescriptions ────────────

export type RemedyTrack = "vedic" | "western" | "archetypal";

export interface Remedy {
  track: RemedyTrack;
  title: string;
  star: string;    // full-astrology phrasing
  spirit: string;  // jargon-free phrasing
}

const REMEDY_LIBRARY: Record<string, Remedy[]> = {
  mars_h7: [
    {
      track: "vedic",
      title: "The Symbolic First Marriage",
      star: "The classical Manglik remedy: marry twice. A private or symbolic first ceremony — courthouse, intimate vow exchange, or the traditional kumbh vivah — absorbs the first-marriage karma of Mars in the 7th, protecting the public union that follows. Fasting on Tuesdays and recitation of the Hanuman Chalisa pacify Mars directly.",
      spirit: "An old tradition holds that the first vow absorbs the storm. Marry twice — once quietly, once in celebration. Let the private ceremony receive the turbulence so the public one stands clear of it. Tuesdays are this force's day: simplicity and devotion on that day soften it.",
    },
    {
      track: "western",
      title: "Elect the Moment",
      star: "Time the wedding electionally: Mars cadent (houses 3, 6, 9, 12), in dignity (Aries, Scorpio, Capricorn), or in a sign-based trine to the natal 7th ruler. Avoid Mars angular or configured to the wedding-chart Descendant. Channel natal Mars through shared physical pursuits — train together, build together.",
      spirit: "When you choose the day you commit, choose it deliberately — there are moments when the combative current runs quiet, and a union begun in a quiet moment inherits that quiet. And give the warrior between you a job: move together, build together, sweat toward shared aims.",
    },
    {
      track: "archetypal",
      title: "Conscious Conflict",
      star: "Mars in the 7th externalizes the inner warrior onto the partner. The remedy is ritualized conflict: explicit fair-fighting agreements, scheduled grievance airing, and physical discharge of anger away from the relationship. Unconscious Mars severs; conscious Mars protects.",
      spirit: "The fire in your partnership sphere will burn something — let it burn fuel, not the house. Make rules for the fight before the fight arrives. Name grievances on schedule, not in eruption. Anger given a ritual becomes a guardian instead of a destroyer.",
    },
  ],
  ketu_h7: [
    {
      track: "vedic",
      title: "Pacifying Ketu",
      star: "Ketu in the 7th is remediated through Ganesha worship (Ketu's overlord deity), donation of sesame, blankets, or mixed grains on Saturdays, and the Ketu beeja mantra (Om Sram Sreem Sraum Sah Ketave Namah) — 108 repetitions, ideally during Ketu's hora.",
      spirit: "The releasing force in your bonds is honored, not fought. Give things away regularly — warmth, food, what others need — especially on Saturdays. Generosity given without account settles the old ledger this force keeps.",
    },
    {
      track: "western",
      title: "Nodal Return Vigilance",
      star: "The Nodes return every ~18.6 years and square themselves every ~9.3. These are the windows when South Node 7th-house patterns activate — relationships dissolve or karmically resolve. Mark these ages; do not initiate or end unions impulsively inside the window without review.",
      spirit: "Your release pattern has a rhythm — roughly every nine years it knocks. Know your years. When the knock comes, review the bond honestly before answering: some doors are meant to be closed, others only feel that way during the season of the knock.",
    },
    {
      track: "archetypal",
      title: "Name the Familiar Stranger",
      star: "South Node in the 7th attracts partners who feel instantly known — past-life familiarity that often recapitulates an exhausted pattern. The practice: when intense immediate familiarity arises, journal the pattern before committing. Ask what is being repeated.",
      spirit: "When someone feels like home in the first hour, pause. That instant recognition is sometimes a door forward and sometimes a corridor back into a room you've already lived in. Write down what feels familiar before you decide it's fate.",
    },
  ],
  ruler_debility: [
    {
      track: "vedic",
      title: "Strengthen the Significator",
      star: "A debilitated marriage ruler is strengthened directly: its gemstone worn after proper testing, its mantra recited on its weekday, donation of its corresponding articles. Strengthening the planet strengthens every union it governs.",
      spirit: "The force that governs this union is far from home — feed it. Each planetary current has its day, its color, its offerings. Living deliberately in rhythm with the weakened force restores what its placement cannot give.",
    },
    {
      track: "western",
      title: "Reception and Timing",
      star: "Work the receptions: if any planet receives the debilitated ruler by dignity, that planet becomes the repair channel — its placements show where help lives. Elect important relationship moments when the ruler is angular, direct, and aspected by a benefic by transit.",
      spirit: "Even a weakened current has allies. Somewhere in your pattern, another force extends a hand to this one — the people, places, and activities of that ally are where this union finds its support. Lean there deliberately.",
    },
    {
      track: "archetypal",
      title: "Embody the Highest Expression",
      star: "A planet in fall expresses its lowest octave by default — the remedy is conscious embodiment of its highest. Saturn in fall: practice earned commitment rather than fearful holding. Venus in fall: practice discerning love rather than indiscriminate pleasing. Identify the ruler's highest octave and rehearse it.",
      spirit: "What runs weak by default can be carried by intention. The quality this union needs most is exactly the one that doesn't come naturally — so practice it as a discipline. What you rehearse deliberately becomes what you are under pressure.",
    },
  ],
  malefic_siege: [
    {
      track: "vedic",
      title: "Pacify the Afflicting Force",
      star: "When malefics afflict the marriage ruler without relief, remediate the afflictor: Saturn afflicting → Saturday discipline, service to elders, sesame oil offerings. Mars afflicting → Tuesday practices, Hanuman devotion. The siege lifts when the besieger is honored.",
      spirit: "What presses on this union is not an enemy — it is an unpaid account. Identify which force presses hardest and serve what it represents: discipline if it demands structure, courage if it demands fire. Pressure honored becomes pressure released.",
    },
    {
      track: "archetypal",
      title: "Build the Missing Relief",
      star: "No benefic relief in the chart means relief must be constructed in life: deliberately cultivate the Jupiter function (shared meaning, growth, generosity) and the Venus function (beauty, pleasure, appreciation) inside the relationship as scheduled practices, not moods.",
      spirit: "The easing influences are quiet in your pattern — so build them by hand. Joy, beauty, gratitude, and shared meaning will not arrive on their own schedule; put them on yours. A union without natural sweetness survives by manufactured sweetness, faithfully made.",
    },
  ],
  mutable_sign: [
    {
      track: "western",
      title: "Rhythmic Renewal",
      star: "Mutable marriage signs hold through renewal, not assumption. The remedy is cyclical recommitment: annual vow renewal timed to the marriage sign's season, and explicit renegotiation of the union's terms as life changes — mutability honored becomes flexibility rather than drift.",
      spirit: "This bond lives under a changeable sky, and it holds by being renewed, not assumed. Once a year, choose each other again — out loud, deliberately. What is re-chosen cannot drift, because drift only happens to things left unattended.",
    },
  ],
};

export function getRemediesForIndicators(indicators: DivorceIndicator[]): { indicator: DivorceIndicator; remedies: Remedy[] }[] {
  return indicators
    .map(indicator => ({ indicator, remedies: REMEDY_LIBRARY[indicator.id] ?? [] }))
    .filter(x => x.remedies.length > 0);
}

export function significatorsToPromptBlock(sigs: MarriageSignificator[]): string {
  return sigs.map(s => {
    const lines: string[] = [
      `─── ${ORDINALS[s.marriage]} Marriage (${OFFSET_DESC[s.marriage]}) ───`,
      `Moon in: ${s.moonSign}`,
      `Marriage sign: ${s.marriageSign}`,
      `Primary significator (ruler of ${s.marriageSign}): ${s.ruler}`,
      `${s.ruler} is in: ${s.rulerSign}, House ${s.rulerHouse}${s.rulerRetrograde ? " (retrograde)" : ""}`,
      `Essential dignity: ${s.rulerDignity}`,
      `Accidental strength: ${s.rulerAccidental}`,
    ];

    if (s.aspectsToRuler.length) {
      lines.push("Aspects to " + s.ruler + ":");
      s.aspectsToRuler.forEach(a =>
        lines.push(`  ${a.fromPlanet} ${a.type} ${s.ruler} — orb ${a.orb.toFixed(1)}°, ${a.applying ? "applying" : "separating"}, ${a.nature}`)
      );
    } else {
      lines.push(`Aspects to ${s.ruler}: none`);
    }

    if (s.coSignificators.length) {
      lines.push("Co-significators (planets in " + s.rulerSign + " with " + s.ruler + "):");
      s.coSignificators.forEach(p =>
        lines.push(`  ${p.name} — House ${p.house}, ${p.dignity}${p.retrograde ? ", Rx" : ""}`)
      );
    }

    if (s.planetsInMarriageSign.length) {
      lines.push("Planets in marriage sign (" + s.marriageSign + "):");
      s.planetsInMarriageSign.forEach(p =>
        lines.push(`  ${p.name} — House ${p.house}, ${p.dignity}${p.retrograde ? ", Rx" : ""}`)
      );
    }

    if (s.mutualReceptions.length) {
      lines.push(`Mutual reception: ${s.ruler} ↔ ${s.mutualReceptions.join(", ")}`);
    }

    return lines.join("\n");
  }).join("\n\n");
}
