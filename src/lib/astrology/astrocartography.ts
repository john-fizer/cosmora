import * as Astronomy from "astronomy-engine";

export type AstroLinePlanet = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune";
export type AstroLineAngle  = "MC" | "IC" | "ASC" | "DSC";

export interface LatLon   { lat: number; lon: number; }
export interface AstroLine {
  planet:   AstroLinePlanet;
  angle:    AstroLineAngle;
  segments: LatLon[][];
}

const BODY_MAP: Record<AstroLinePlanet, Astronomy.Body> = {
  Sun:     Astronomy.Body.Sun,
  Moon:    Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus:   Astronomy.Body.Venus,
  Mars:    Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn:  Astronomy.Body.Saturn,
  Uranus:  Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
};

export const ASTRO_PLANETS: AstroLinePlanet[] = [
  "Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune",
];

export const PLANET_COLORS: Record<AstroLinePlanet, string> = {
  Sun:     "#FFD700",
  Moon:    "#A8CAFF",
  Mercury: "#FF9500",
  Venus:   "#FF6EB4",
  Mars:    "#FF3B3B",
  Jupiter: "#B06AFF",
  Saturn:  "#D4A42A",
  Uranus:  "#00E5FF",
  Neptune: "#4488FF",
};

export const PLANET_SYMBOLS: Record<AstroLinePlanet, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆",
};

// ─── Math helpers ──────────────────────────────────────────────────────────────
function norm360(a: number) { return ((a % 360) + 360) % 360; }
function toRad(d: number)   { return (d * Math.PI) / 180; }
function toDeg(r: number)   { return (r * 180) / Math.PI; }
function normLon(lon: number) {
  const n = norm360(lon);
  return n > 180 ? n - 360 : n;
}

function toJulianDay(utcDate: Date): number {
  let Y = utcDate.getUTCFullYear();
  let M = utcDate.getUTCMonth() + 1;
  const D = utcDate.getUTCDate() + utcDate.getUTCHours() / 24 + utcDate.getUTCMinutes() / 1440 + utcDate.getUTCSeconds() / 86400;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
}

function gmst(jd: number): number {
  const t = (jd - 2451545.0) / 36525;
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t - t * t * t / 38710000);
}

function getPlanetEquatorial(planet: AstroLinePlanet, date: Date): { ra: number; dec: number } {
  const body = BODY_MAP[planet];
  const vec  = Astronomy.GeoVector(body, date, true);
  const mag  = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
  return {
    ra:  norm360(toDeg(Math.atan2(vec.y, vec.x))),
    dec: toDeg(Math.asin(vec.z / mag)),
  };
}

// Split an array of points wherever consecutive longitudes jump > 180°
function splitAtDateline(pts: LatLon[]): LatLon[][] {
  if (pts.length === 0) return [];
  const segs: LatLon[][] = [];
  let cur: LatLon[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i].lon - pts[i - 1].lon) > 180) {
      if (cur.length >= 2) segs.push(cur);
      cur = [pts[i]];
    } else {
      cur.push(pts[i]);
    }
  }
  if (cur.length >= 2) segs.push(cur);
  return segs;
}

// ─── Line calculators ──────────────────────────────────────────────────────────

function mcLine(ra: number, GMST: number): AstroLine["segments"] {
  const lon = normLon(ra - GMST);
  const pts: LatLon[] = [];
  for (let lat = -85; lat <= 85; lat += 5) pts.push({ lat, lon });
  return [pts];
}

function icLine(ra: number, GMST: number): AstroLine["segments"] {
  const lon = normLon(ra - GMST + 180);
  const pts: LatLon[] = [];
  for (let lat = -85; lat <= 85; lat += 5) pts.push({ lat, lon });
  return [pts];
}

function ascDscLine(ra: number, dec: number, GMST: number, angle: "ASC" | "DSC"): AstroLine["segments"] {
  const decR = toRad(dec);
  const pts: LatLon[] = [];
  for (let lat = -75; lat <= 75; lat += 1.5) {
    const latR  = toRad(lat);
    const cosH  = -Math.tan(latR) * Math.tan(decR);
    if (Math.abs(cosH) > 1) continue;
    const H    = toDeg(Math.acos(cosH));
    const hDeg = angle === "ASC" ? -H : H;
    pts.push({ lat, lon: normLon(ra + hDeg - GMST) });
  }
  pts.sort((a, b) => a.lat - b.lat);
  return splitAtDateline(pts);
}

// ─── Public calculation entry point ───────────────────────────────────────────

export function calculateAstroLines(birthDatetime: string): AstroLine[] {
  const date = new Date(birthDatetime);
  const jd   = toJulianDay(date);
  const G    = gmst(jd);
  const lines: AstroLine[] = [];
  for (const planet of ASTRO_PLANETS) {
    const { ra, dec } = getPlanetEquatorial(planet, date);
    lines.push({ planet, angle: "MC",  segments: mcLine(ra, G) });
    lines.push({ planet, angle: "IC",  segments: icLine(ra, G) });
    lines.push({ planet, angle: "ASC", segments: ascDscLine(ra, dec, G, "ASC") });
    lines.push({ planet, angle: "DSC", segments: ascDscLine(ra, dec, G, "DSC") });
  }
  return lines;
}

// ─── Themes ───────────────────────────────────────────────────────────────────

export const LINE_THEMES: Record<AstroLinePlanet, Record<AstroLineAngle, string>> = {
  Sun: {
    MC:  "Career recognition, public identity, becoming known for your authentic self — a zone of vitality and leadership on the world stage.",
    ASC: "Strong physical vitality, magnetic presence, natural leadership — you appear solar, confident, radiant here.",
    DSC: "Relationships illuminate your identity; charismatic, solar partners; visibility through others.",
    IC:  "Deep ancestral solar power; inner strength; home as a stage for your truest self.",
  },
  Moon: {
    MC:  "Public emotional resonance, nurturing vocation, fame through empathy and sensitivity.",
    ASC: "Intuitive environment, emotional depth on the surface, feeling instinctively at home.",
    DSC: "Deeply emotional partnerships, maternal or protective relationships, bonds of belonging.",
    IC:  "Powerful ancestral roots, home as sanctuary, emotional foundations run deep.",
  },
  Mercury: {
    MC:  "Career in communication, writing, journalism, technology, or teaching.",
    ASC: "Sharp, fast-paced intellectual environment; ideas flow freely; restless mental stimulation.",
    DSC: "Witty and communicative partners; contracts and negotiations; meeting of minds.",
    IC:  "Home filled with books and ideas; intellectual roots; education is your foundation.",
  },
  Venus: {
    MC:  "Public charm and artistry; career in beauty, diplomacy, fashion, or the arts.",
    ASC: "Enhanced attractiveness and grace; magnetic social environment; aesthetic pleasure abounds.",
    DSC: "Romantic relationships flourish; artistic and harmonious partnerships; beauty in others.",
    IC:  "Harmonious, beautiful home life; family bonds are loving; aesthetic sanctuary.",
  },
  Mars: {
    MC:  "Driven career ambition, competitive achievement, public action and initiative.",
    ASC: "High physical energy, assertive self-expression, fast-paced and active environment.",
    DSC: "Passionate but challenging partnerships; competitive or combative encounters possible.",
    IC:  "Active and energetic home life; ancestral drive; potential family friction.",
  },
  Jupiter: {
    MC:  "Exceptional career growth, luck, wisdom, and recognition — your most auspicious professional zone.",
    ASC: "Optimism and abundance radiate from you here; expansion in all areas of life.",
    DSC: "Generous, wealthy, or worldly partners; beneficial relationships; philosophical connections.",
    IC:  "Fortunate and expansive home life; philosophical roots; family and heritage bring wisdom.",
  },
  Saturn: {
    MC:  "Serious career mastery through discipline and sustained effort; building something lasting.",
    ASC: "Sober, structured environment; lessons in responsibility; aging gracefully with authority.",
    DSC: "Karmic long-term relationships; serious or older partners; commitments with weight.",
    IC:  "Foundational discipline; ancestral duties; structured and perhaps challenging home.",
  },
  Uranus: {
    MC:  "Innovative, disruptive career; technological breakthroughs; unconventional public life.",
    ASC: "Exciting, electric, and unpredictable environment; freedom and rebellion; sudden changes.",
    DSC: "Unconventional relationships; freedom-loving or eccentric partners; open structures.",
    IC:  "Unstable but exciting home; need for personal freedom; innovative living arrangements.",
  },
  Neptune: {
    MC:  "Spiritual or creative vocation; healing, film, music, or mystical career.",
    ASC: "Dreamy, mystical environment; heightened intuition and sensitivity; artistic atmosphere.",
    DSC: "Romantic idealization; spiritual connections; partners may be elusive or transcendent.",
    IC:  "Spiritual home foundation; creative sanctuary; ancestral mysticism and invisible roots.",
  },
};

// ─── Location Scoring ─────────────────────────────────────────────────────────

const PLANET_WEIGHTS: Record<AstroLinePlanet, number> = {
  Sun: 1.0, Moon: 0.9, Mercury: 0.6, Venus: 0.85, Mars: 0.7,
  Jupiter: 1.0, Saturn: 0.8, Uranus: 0.65, Neptune: 0.6,
};

const ANGLE_WEIGHTS: Record<AstroLineAngle, number> = {
  MC: 1.0, ASC: 0.95, DSC: 0.7, IC: 0.65,
};

export interface LocationScore {
  planet:      AstroLinePlanet;
  angle:       AstroLineAngle;
  distanceDeg: number;
  influence:   number; // 0–1, weighted
  theme:       string;
}

function minDistToLine(line: AstroLine, lat: number, lon: number): number {
  let best = 9999;
  for (const seg of line.segments) {
    for (const pt of seg) {
      let dLon = Math.abs(lon - pt.lon);
      if (dLon > 180) dLon = 360 - dLon;
      const dLat = Math.abs(lat - pt.lat);
      const d = Math.sqrt(dLon * dLon * Math.cos(toRad(lat)) ** 2 + dLat * dLat);
      if (d < best) best = d;
    }
  }
  return best;
}

export function scoreLocation(lines: AstroLine[], lat: number, lon: number): LocationScore[] {
  const CUTOFF = 14;
  const scores: LocationScore[] = [];
  for (const line of lines) {
    const dist = minDistToLine(line, lat, lon);
    if (dist > CUTOFF) continue;
    const raw      = Math.max(0, 1 - dist / CUTOFF);
    const influence = raw * PLANET_WEIGHTS[line.planet] * ANGLE_WEIGHTS[line.angle];
    scores.push({
      planet:      line.planet,
      angle:       line.angle,
      distanceDeg: Math.round(dist * 10) / 10,
      influence,
      theme:       LINE_THEMES[line.planet][line.angle],
    });
  }
  return scores.sort((a, b) => b.influence - a.influence).slice(0, 8);
}
