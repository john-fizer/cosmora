import type { PlanetName } from "./types";

export interface PlanetMeta {
  glyph: string;
  color: string;
  bgColor: string;
  glowColor: string;
  archetype: string;
  keywords: string[];
  body: string;
  myth: string;
  rules: string;
  exaltedIn: string;
}

export const PLANET_META: Partial<Record<PlanetName, PlanetMeta>> = {
  Sun: {
    glyph: "☉",
    color: "#ffd700",
    bgColor: "#0e0600",
    glowColor: "rgba(255,215,0,0.18)",
    archetype: "The Self",
    keywords: ["Identity", "Vitality", "Purpose", "Will", "Consciousness"],
    body: "Heart & Spine",
    myth: "Apollo, the god of light and truth — the solar principle that gives all things form and definition.",
    rules: "Leo",
    exaltedIn: "Aries",
  },
  Moon: {
    glyph: "☽",
    color: "#c4b5fd",
    bgColor: "#06030f",
    glowColor: "rgba(196,181,253,0.18)",
    archetype: "The Soul",
    keywords: ["Emotions", "Instinct", "Memory", "Nurture", "Cycles"],
    body: "Stomach & Breasts",
    myth: "Selene, Artemis, Hecate — the triple moon goddess that governs tides, cycles, and the unconscious.",
    rules: "Cancer",
    exaltedIn: "Taurus",
  },
  Mercury: {
    glyph: "☿",
    color: "#a78bfa",
    bgColor: "#05040e",
    glowColor: "rgba(167,139,250,0.18)",
    archetype: "The Mind",
    keywords: ["Communication", "Intellect", "Perception", "Language", "Trade"],
    body: "Nervous System",
    myth: "Hermes, the winged messenger — trickster, guide of souls, lord of crossroads and transitions.",
    rules: "Gemini & Virgo",
    exaltedIn: "Virgo",
  },
  Venus: {
    glyph: "♀",
    color: "#f472b6",
    bgColor: "#0d0309",
    glowColor: "rgba(244,114,182,0.18)",
    archetype: "The Heart",
    keywords: ["Love", "Beauty", "Values", "Pleasure", "Harmony"],
    body: "Kidneys & Throat",
    myth: "Aphrodite, born of sea-foam — goddess of beauty, desire, and the magnetic force that draws things together.",
    rules: "Taurus & Libra",
    exaltedIn: "Pisces",
  },
  Mars: {
    glyph: "♂",
    color: "#ef4444",
    bgColor: "#0e0202",
    glowColor: "rgba(239,68,68,0.20)",
    archetype: "The Warrior",
    keywords: ["Drive", "Courage", "Assertion", "Desire", "Action"],
    body: "Muscles & Blood",
    myth: "Ares, god of war and the primal life force — the red planet of ambition, conflict, and raw desire.",
    rules: "Aries & Scorpio",
    exaltedIn: "Capricorn",
  },
  Jupiter: {
    glyph: "♃",
    color: "#f59e0b",
    bgColor: "#0a0700",
    glowColor: "rgba(245,158,11,0.18)",
    archetype: "The Sage",
    keywords: ["Expansion", "Wisdom", "Opportunity", "Abundance", "Faith"],
    body: "Liver & Hips",
    myth: "Zeus, king of Olympus — the great benefic that expands whatever it touches, god of law and divine order.",
    rules: "Sagittarius & Pisces",
    exaltedIn: "Cancer",
  },
  Saturn: {
    glyph: "♄",
    color: "#94a3b8",
    bgColor: "#04060c",
    glowColor: "rgba(148,163,184,0.15)",
    archetype: "The Elder",
    keywords: ["Structure", "Discipline", "Mastery", "Time", "Karma"],
    body: "Bones & Teeth",
    myth: "Kronos, lord of time — the great teacher whose rings mark the boundaries of what is earned through effort.",
    rules: "Capricorn & Aquarius",
    exaltedIn: "Libra",
  },
  Uranus: {
    glyph: "♅",
    color: "#06b6d4",
    bgColor: "#00060c",
    glowColor: "rgba(6,182,212,0.18)",
    archetype: "The Revolutionary",
    keywords: ["Liberation", "Innovation", "Awakening", "Rebellion", "Genius"],
    body: "Nervous System",
    myth: "Ouranos, the primordial sky — the planet of sudden illumination and the radical break from tradition.",
    rules: "Aquarius",
    exaltedIn: "Scorpio",
  },
  Neptune: {
    glyph: "♆",
    color: "#3b82f6",
    bgColor: "#020410",
    glowColor: "rgba(59,130,246,0.18)",
    archetype: "The Mystic",
    keywords: ["Dreams", "Spirituality", "Dissolution", "Compassion", "Illusion"],
    body: "Lymphatic System",
    myth: "Poseidon, lord of the deep — the planet of the veil between worlds, mysticism, and transcendence.",
    rules: "Pisces",
    exaltedIn: "Cancer",
  },
  Pluto: {
    glyph: "♇",
    color: "#8b5cf6",
    bgColor: "#05010c",
    glowColor: "rgba(139,92,246,0.20)",
    archetype: "The Transformer",
    keywords: ["Power", "Death & Rebirth", "Depth", "Obsession", "Metamorphosis"],
    body: "Reproductive System",
    myth: "Hades, lord of the underworld — the planet of irreversible transformation and the phoenix cycle.",
    rules: "Scorpio",
    exaltedIn: "Aries",
  },
};

export const PLANET_ORDER: PlanetName[] = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];

export function getPlanetMeta(name: PlanetName): PlanetMeta {
  return PLANET_META[name] ?? {
    glyph: "✦",
    color: "#94a3b8",
    bgColor: "#060608",
    glowColor: "rgba(148,163,184,0.15)",
    archetype: "The Body",
    keywords: ["Influence", "Cycle"],
    body: "Unknown",
    myth: "",
    rules: "Unknown",
    exaltedIn: "Unknown",
  };
}
