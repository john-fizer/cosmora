// ─── Holographic skyline definitions ──────────────────────────────────────────
// Abstract building primitives, rendered as glowing wireframes by GlobeCanvas.
// Coordinates are abstract units: x/z footprint roughly in [-1.3, 1.3];
// height `h` in [1..10]. The renderer scales these to the globe.

export type Prim =
  | { k: "box";     x: number; z?: number; w: number; d?: number; h: number }
  | { k: "taper";   x: number; z?: number; w: number; d?: number; h: number; top?: number }
  | { k: "spire";   x: number; z?: number; w: number; h: number }
  | { k: "setback"; x: number; z?: number; w: number; d?: number; h: number; steps?: number }
  | { k: "dome";    x: number; z?: number; r: number; h: number }
  | { k: "pyramid"; x: number; z?: number; w: number; h: number };

export type LandmarkId =
  | "paris" | "london" | "newyork" | "dubai" | "kualalumpur" | "singapore"
  | "tokyo" | "shanghai" | "hongkong" | "toronto" | "seattle" | "sanfrancisco"
  | "chicago" | "sydney" | "moscow" | "rome" | "cairo" | "berlin"
  | "barcelona" | "istanbul" | "lasvegas" | "losangeles" | "doha" | "riyadh"
  | "abudhabi" | "athens" | "beijing" | "frankfurt"
  | "dallas" | "monterrey" | "buenos_aires" | "wellington" | "bogota"
  | "lima" | "mumbai" | "johannesburg" | "lagos" | "nairobi";

// b() box, t() taper, s() spire, st() setback, dm() dome, py() pyramid
const b  = (x: number, w: number, h: number, d = w): Prim => ({ k: "box", x, w, h, d });
const t  = (x: number, w: number, h: number, top = 0.25): Prim => ({ k: "taper", x, w, h, top });
const s  = (x: number, w: number, h: number): Prim => ({ k: "spire", x, w, h });
const st = (x: number, w: number, h: number, steps = 3): Prim => ({ k: "setback", x, w, h, steps });
const dm = (x: number, r: number, h: number): Prim => ({ k: "dome", x, r, h });
const py = (x: number, w: number, h: number): Prim => ({ k: "pyramid", x, w, h });

export const LANDMARKS: Record<LandmarkId, Prim[]> = {
  // Eiffel lattice spire over low Haussmann blocks
  paris: [ s(0, 0.5, 9.5), b(-0.8, 0.45, 1.6), b(-0.45, 0.4, 1.3), b(0.5, 0.45, 1.7), b(0.85, 0.4, 1.4) ],
  // The Shard (tapered) + Big Ben spire + Gherkin taper + low blocks
  london: [ t(0.1, 0.55, 7.5, 0.05), s(-0.85, 0.3, 4.2), t(0.85, 0.45, 3.6, 0.0), b(-0.4, 0.4, 2.0), b(0.45, 0.38, 2.2) ],
  // Empire State setback + a twin pair + dense midrise
  newyork: [ st(0, 0.6, 8.5, 4), b(-0.75, 0.32, 4.8), b(-0.45, 0.32, 5.0), t(0.8, 0.4, 6.0, 0.3), b(0.45, 0.34, 3.4), b(-1.05, 0.3, 2.6), b(1.05, 0.3, 2.8) ],
  // Burj Khalifa — towering taper to needle + cluster
  dubai: [ t(0, 0.62, 9.8, 0.02), b(-0.8, 0.4, 3.2), t(0.8, 0.42, 4.6, 0.15), b(-1.1, 0.34, 2.2), b(1.1, 0.34, 2.4) ],
  // Petronas twin spires + skybridge feel + low blocks
  kualalumpur: [ s(-0.35, 0.5, 8.2), s(0.35, 0.5, 8.2), b(-1.0, 0.4, 2.4), b(1.0, 0.4, 2.6), t(0, 0.3, 4.0, 0.1) ],
  // Marina Bay three towers + boat-deck (low wide box) + dome
  singapore: [ t(-0.5, 0.42, 6.6, 0.6), t(0, 0.42, 6.9, 0.6), t(0.5, 0.42, 6.6, 0.6), b(0, 1.5, 0.5, 0.4), dm(-1.1, 0.4, 1.6) ],
  // Tokyo Tower / Skytree spire + dense midrise
  tokyo: [ s(0.2, 0.55, 9.0), b(-0.9, 0.4, 3.0), b(-0.5, 0.4, 3.6), b(-0.1, 0.38, 2.8), b(0.9, 0.4, 3.4), b(1.2, 0.36, 2.6) ],
  // Oriental Pearl-style spire with spheres + Shanghai Tower taper
  shanghai: [ s(-0.5, 0.45, 8.6), t(0.4, 0.6, 8.0, 0.1), b(0.95, 0.42, 4.2), b(-1.05, 0.4, 3.0), b(0, 0.36, 2.4) ],
  // Hong Kong — dense varied tall towers + one taper (IFC)
  hongkong: [ t(0.7, 0.5, 7.4, 0.2), b(-0.9, 0.34, 6.2), b(-0.5, 0.34, 5.4), b(-0.1, 0.34, 6.6), b(0.3, 0.32, 4.8), b(1.1, 0.34, 5.0), b(-1.2, 0.32, 4.0) ],
  // CN Tower spire + boxes
  toronto: [ s(-0.3, 0.4, 9.2), b(0.3, 0.45, 4.2), b(0.7, 0.42, 3.4), b(-0.85, 0.4, 2.8), b(1.05, 0.4, 3.0) ],
  // Space Needle (spire with disc) + low midrise
  seattle: [ s(0, 0.45, 7.6), b(-0.8, 0.42, 3.0), b(0.8, 0.42, 3.2), b(-0.4, 0.4, 2.2), b(0.4, 0.4, 2.4) ],
  // Transamerica Pyramid + boxes
  sanfrancisco: [ py(-0.3, 0.5, 6.4), b(0.35, 0.45, 4.0), b(0.8, 0.42, 3.4), b(-0.9, 0.4, 2.8), b(1.1, 0.4, 3.0) ],
  // Willis + Hancock tapered + dense
  chicago: [ st(-0.3, 0.55, 8.2, 3), t(0.4, 0.45, 7.0, 0.4), b(0.9, 0.4, 4.2), b(-0.95, 0.4, 3.4), b(1.2, 0.38, 3.0) ],
  // Opera House domes + tower + harbour bridge arch (low wide)
  sydney: [ dm(-0.5, 0.45, 2.6), dm(-0.15, 0.4, 2.2), dm(0.2, 0.35, 1.8), t(0.9, 0.4, 5.4, 0.3), b(0, 1.6, 0.4, 0.3) ],
  // Kremlin onion domes + Federation tower taper
  moscow: [ dm(-0.7, 0.32, 2.6), dm(-0.35, 0.3, 2.2), dm(0, 0.3, 2.4), t(0.7, 0.5, 7.2, 0.2), b(1.15, 0.4, 3.0) ],
  // St Peter's dome + low classical blocks
  rome: [ dm(0, 0.7, 4.0), b(-1.0, 0.45, 1.8), b(-0.55, 0.42, 1.5), b(0.55, 0.42, 1.5), b(1.0, 0.45, 1.8) ],
  // Giza pyramids + low city
  cairo: [ py(-0.45, 0.8, 4.6), py(0.25, 0.62, 3.6), py(0.75, 0.45, 2.6), b(-1.1, 0.4, 1.4), b(1.15, 0.4, 1.4) ],
  // Fernsehturm TV tower (spire + sphere) + blocks
  berlin: [ s(-0.2, 0.4, 9.0), b(0.4, 0.45, 3.0), b(0.8, 0.42, 2.4), b(-0.85, 0.4, 2.2), b(1.1, 0.4, 2.6) ],
  // Sagrada Familia spires cluster
  barcelona: [ s(-0.3, 0.3, 6.6), s(0, 0.32, 7.2), s(0.3, 0.3, 6.6), b(-0.95, 0.45, 1.8), b(0.95, 0.45, 2.0) ],
  // Hagia Sophia / Blue Mosque dome + minaret spires
  istanbul: [ dm(0, 0.6, 3.6), s(-0.7, 0.18, 5.4), s(0.7, 0.18, 5.4), s(-0.45, 0.16, 4.6), s(0.45, 0.16, 4.6), b(0, 1.1, 0.6) ],
  // Vegas — varied novelty towers
  lasvegas: [ t(-0.4, 0.5, 6.0, 0.3), py(0.3, 0.5, 4.4), s(0.85, 0.3, 5.6), b(-0.95, 0.42, 2.8), b(1.15, 0.4, 2.4) ],
  // US Bank tower + spread midrise
  losangeles: [ t(0, 0.5, 6.2, 0.5), b(-0.6, 0.42, 4.0), b(0.6, 0.42, 3.8), b(-1.05, 0.4, 2.8), b(1.05, 0.4, 3.0), b(-0.25, 0.38, 3.2) ],
  // Doha — sculpted modern towers
  doha: [ t(-0.4, 0.46, 6.6, 0.1), t(0.1, 0.42, 7.2, 0.4), t(0.55, 0.44, 5.8, 0.0), b(1.05, 0.4, 3.4), b(-0.95, 0.4, 3.0) ],
  // Kingdom Centre arch (box with notch) + towers
  riyadh: [ b(0, 0.6, 7.0), t(0.7, 0.44, 5.6, 0.2), b(-0.8, 0.42, 3.2), b(1.1, 0.4, 2.8), b(-1.15, 0.4, 2.6) ],
  // Etihad-style towers + capital gate lean (taper)
  abudhabi: [ t(-0.3, 0.5, 6.8, 0.15), t(0.25, 0.46, 6.2, 0.3), t(0.7, 0.42, 5.0, 0.5), b(-0.95, 0.4, 3.0), b(1.1, 0.4, 3.2) ],
  // Parthenon — columns (thin boxes) on a low plinth
  athens: [ b(-0.5, 0.12, 2.6), b(-0.25, 0.12, 2.6), b(0, 0.12, 2.8), b(0.25, 0.12, 2.6), b(0.5, 0.12, 2.6), b(0, 1.5, 0.5, 0.5) ],
  // CCTV-ish boxes + pagoda spire
  beijing: [ b(-0.3, 0.6, 6.0), b(0.3, 0.55, 5.2), s(0.85, 0.3, 6.4), b(-0.95, 0.42, 3.0), b(1.15, 0.4, 2.8) ],
  // Commerzbank/Messeturm towers + spire
  frankfurt: [ s(-0.2, 0.4, 8.4), t(0.4, 0.48, 6.6, 0.2), b(0.85, 0.42, 4.0), b(-0.85, 0.4, 3.2), b(1.15, 0.4, 3.0) ],
  // Reunion Tower globe + Bank of America taper + Fountain Place pyramid + office blocks
  dallas: [ dm(0, 0.22, 4.8), t(0.80, 0.35, 7.5, 0.08), py(-0.80, 0.28, 5.5), b(1.30, 0.28, 4.5), b(-1.30, 0.24, 3.8), b(0.40, 0.22, 3.2) ],
  // Obelisco (thin needle) + Puerto Madero twin tapers + dense midrise
  buenos_aires: [ t(0, 0.10, 9.2, 0.04), t(-0.70, 0.32, 5.0, 0.12), t(0.70, 0.30, 4.6, 0.12), b(-1.15, 0.28, 3.2), b(1.15, 0.26, 2.8), b(-0.35, 0.24, 2.6), b(0.35, 0.22, 2.4) ],
  // Torre KOI (slender giant) + Obispado taper + dense financial cluster
  monterrey: [ t(0, 0.30, 7.8, 0.10), t(-0.65, 0.32, 5.8, 0.18), t(0.65, 0.28, 5.2, 0.20), b(-1.10, 0.26, 3.6), b(1.10, 0.24, 3.2), b(-0.30, 0.22, 2.8) ],
  // Bowen Tower + Grand Arcade + mid-rise with Cook Strait as backdrop
  wellington: [ t(0, 0.42, 5.4, 0.25), b(-0.65, 0.38, 3.8), b(0.65, 0.36, 3.4), b(-1.0, 0.30, 2.6), b(1.0, 0.28, 2.8) ],
  // Torre Colpatria + BD Bacatá twin (tallest in Colombia)
  bogota: [ t(0, 0.40, 6.8, 0.20), t(0.55, 0.34, 7.2, 0.22), b(-0.65, 0.38, 4.0), b(-1.05, 0.30, 3.0), b(1.05, 0.30, 3.2) ],
  // Gran Torre Santiago (needle) + Costanera dense cluster
  lima: [ t(-0.20, 0.38, 5.6, 0.18), b(0.40, 0.36, 4.2), b(0.85, 0.32, 3.6), b(-0.80, 0.34, 3.8), b(1.15, 0.28, 2.6) ],
  // Bandra-Kurla towers + Imperial twin + Nariman cluster
  mumbai: [ t(0.25, 0.5, 7.0, 0.15), t(-0.30, 0.46, 6.4, 0.18), b(0.85, 0.40, 4.2), b(-0.90, 0.38, 3.8), b(1.20, 0.34, 3.2), b(-1.20, 0.32, 2.8) ],
  // Ponte City cylinder + Carlton Centre setback + residential slabs
  johannesburg: [ dm(-0.30, 0.36, 5.8), st(0.40, 0.50, 6.6, 3), b(0.95, 0.38, 3.4), b(-0.90, 0.36, 3.0), b(1.25, 0.32, 2.6) ],
  // Eko Atlantic towers (emerging skyline) + Trade Fair spire + dense low
  lagos: [ t(0.10, 0.44, 6.0, 0.20), b(-0.60, 0.40, 3.8), b(0.65, 0.38, 4.2), b(-1.05, 0.32, 2.8), b(1.10, 0.30, 2.6) ],
  // KICC cylinder + UAP Old Mutual Tower + CBD cluster
  nairobi: [ dm(0, 0.36, 4.8), t(0.60, 0.40, 5.8, 0.20), b(-0.60, 0.38, 4.0), b(-1.05, 0.30, 3.0), b(1.10, 0.28, 2.8) ],
};

// ─── Deterministic procedural skyline ─────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let tt = Math.imul(a ^ (a >>> 15), 1 | a);
    tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt;
    return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296;
  };
}

// height bucket 0..3 → tallest tower; density 0..2 → building count
export function proceduralSkyline(height: number, density: number, seed: number): Prim[] {
  const rand = mulberry32(seed * 2654435761);
  const maxH = [2.4, 3.8, 5.6, 7.8][Math.max(0, Math.min(3, height))];
  const count = [5, 8, 12][Math.max(0, Math.min(2, density))];
  const prims: Prim[] = [];
  const span = 1.25;
  for (let i = 0; i < count; i++) {
    const x = -span + (i / Math.max(1, count - 1)) * span * 2 + (rand() - 0.5) * 0.18;
    const z = (rand() - 0.5) * 0.5;
    const w = 0.28 + rand() * 0.2;
    // central towers taller (skyline silhouette peaks in the middle)
    const central = 1 - Math.min(1, Math.abs(x) / span);
    const h = 1.4 + Math.pow(rand(), 1.3) * (maxH - 1.4) * (0.45 + central * 0.65);
    const r = rand();
    if (r > 0.86 && h > maxH * 0.7) prims.push({ k: "spire", x, z, w: w * 0.7, h: h + 0.8 });
    else if (r > 0.72 && h > maxH * 0.6) prims.push({ k: "taper", x, z, w, h, top: 0.2 + rand() * 0.3 });
    else prims.push({ k: "box", x, z, w, d: w * (0.8 + rand() * 0.4), h });
  }
  return prims;
}
