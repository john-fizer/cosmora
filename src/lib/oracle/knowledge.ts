/**
 * Cosmora Astrology Knowledge Base
 * Structured doctrine injected into Oracle prompts to ground responses in real astrological tradition.
 * Sources: Hellenistic (Ptolemy, Valens), Medieval (Bonatus), Modern synthesis.
 */

import type { ChartData, PlanetName, ZodiacSign } from "@/lib/astrology/types";

// ─── Planet archetypes ────────────────────────────────────────────────────────

export const PLANET_DOCTRINE: Record<string, {
  archetype: string;
  significations: string;
  sect: string;
  dignified: string;
  debilitated: string;
  shadow: string;
}> = {
  Sun: {
    archetype: "The Life Force — conscious will, authentic identity, creative power, vitality, father/authority figures",
    significations: "Ego, recognition, leadership, the heart, courage, the spine, gold, kings, the father",
    sect: "Diurnal (day chart benefic)",
    dignified: "Leo (domicile), Aries (exaltation) — the Sun here blazes with confidence and directional force",
    debilitated: "Aquarius (detriment), Libra (fall) — solar force is dispersed or compromised by others' needs",
    shadow: "Ego inflation, need for constant validation, father wound, inability to share the stage",
  },
  Moon: {
    archetype: "The Soul Container — emotional body, memory, instinctive responses, the past, mother/nurturing figures",
    significations: "Emotions, cycles, the body's rhythms, women, the public, water, silver, the mother, dreams",
    sect: "Nocturnal (night chart benefic)",
    dignified: "Cancer (domicile), Taurus (exaltation) — the Moon here is safe, nourished, and able to give",
    debilitated: "Capricorn (detriment), Scorpio (fall) — emotional needs are suppressed or overwhelmed",
    shadow: "Emotional reactivity, clinging to safety, unprocessed grief, enmeshment with the maternal",
  },
  Mercury: {
    archetype: "The Neural Network — perception, analysis, language, transmission, learning style, the nervous system",
    significations: "Communication, logic, writing, trade, siblings, neighbors, hands, lungs, education",
    sect: "Neutral (adapts to chart sect)",
    dignified: "Gemini/Virgo (domicile), Virgo (exaltation) — Mercury here is precise, quick, and multifaceted",
    debilitated: "Sagittarius/Pisces (detriment), Pisces (fall) — Mercury scatters or dissolves into vision",
    shadow: "Overthinking, nervous anxiety, manipulation through language, information overload",
  },
  Venus: {
    archetype: "The Magnetic Field — desire, beauty, relatability, what you attract and are attracted to, aesthetic intelligence",
    significations: "Love, pleasure, art, money (movable wealth), relationships, copper, the throat, kidneys",
    sect: "Nocturnal benefic",
    dignified: "Taurus/Libra (domicile), Pisces (exaltation) — Venus here creates beauty and attracts effortlessly",
    debilitated: "Scorpio/Aries (detriment), Virgo (fall) — Venusian magnetism is distorted or self-critical",
    shadow: "Codependency, vanity, avoidance of conflict at all costs, confusing attraction with love",
  },
  Mars: {
    archetype: "The Drive Mechanism — directed action, desire made motion, competitive force, sexual energy, the warrior",
    significations: "Action, conflict, surgery, fire, iron/steel, the military, sports, men, the adrenals, fevers",
    sect: "Diurnal malefic",
    dignified: "Aries/Scorpio (domicile), Capricorn (exaltation) — Mars here acts with precision and sustained force",
    debilitated: "Libra/Taurus (detriment), Cancer (fall) — Martian drive is frustrated, inward, or indirect",
    shadow: "Aggression, impulsivity, inability to rest, using force to avoid vulnerability",
  },
  Jupiter: {
    archetype: "The Expansion Principle — growth, philosophy, abundance, meaning-making, the teacher, fortune",
    significations: "Wisdom, law, religion, long journeys, the liver, blood, tin, universities, wealth, luck",
    sect: "Diurnal benefic",
    dignified: "Sagittarius/Pisces (domicile), Cancer (exaltation) — Jupiter here gives and grows without limit",
    debilitated: "Gemini/Virgo (detriment), Capricorn (fall) — Jupiterian expansion is scattered or contracted",
    shadow: "Excess, overconfidence, dogmatism, avoiding discipline, false optimism",
  },
  Saturn: {
    archetype: "The Necessity — time, limitation, responsibility, the structures that both confine and support, mastery through trial",
    significations: "Discipline, karma, old age, lead, bones, teeth, the spleen, real estate, the father in traditional charts",
    sect: "Nocturnal malefic",
    dignified: "Capricorn/Aquarius (domicile), Libra (exaltation) — Saturn here becomes the master builder",
    debilitated: "Cancer/Leo (detriment), Aries (fall) — Saturn's discipline is undermined or becomes tyrannical",
    shadow: "Fear masquerading as responsibility, rigidity, self-denial, punishing perfectionism",
  },
  Uranus: {
    archetype: "The Revolution — disruption of the status quo, genius, liberation, the collective future breaking into the present",
    significations: "Innovation, rebellion, electricity, technology, the unexpected, humanitarian movements, freedom",
    sect: "Generational — its house placement is more personal than its sign",
    dignified: "Aquarius (modern domicile) — collective reform at scale",
    debilitated: "Leo (detriment) — revolutionary energy conflicts with ego-centered expression",
    shadow: "Chaos for its own sake, alienation, refusal to commit, compulsive unpredictability",
  },
  Neptune: {
    archetype: "The Dissolution — the merging of boundaries, mystical experience, compassion, illusion, the transcendent",
    significations: "Spirituality, music, film, addiction, the sea, oil, deception, unconditional love, sacrifice",
    sect: "Generational — house placement reveals where transcendence or dissolution operates",
    dignified: "Pisces (modern domicile) — oceanic empathy without end",
    debilitated: "Virgo (detriment) — dissolves the analytical faculty, creates confusion in daily life",
    shadow: "Delusion, escapism, victim consciousness, inability to distinguish reality from fantasy",
  },
  Pluto: {
    archetype: "The Transformer — death/rebirth cycles, power dynamics, the underworld, what is hidden and then revealed",
    significations: "Transformation, obsession, power, nuclear energy, plutocracy, deep psychology, the collective shadow",
    sect: "Generational — house placement shows where life is utterly transformed",
    dignified: "Scorpio (modern domicile) — inexorable regeneration",
    debilitated: "Taurus (detriment) — transformation conflicts with the need for stability and accumulation",
    shadow: "Control, manipulation, using power as a surrogate for love, obsessive compulsion",
  },
};

// ─── Sign themes ──────────────────────────────────────────────────────────────

export const SIGN_DOCTRINE: Record<string, {
  element: string;
  modality: string;
  drive: string;
  quality: string;
  shadow: string;
  body: string;
}> = {
  Aries: {
    element: "Fire",
    modality: "Cardinal",
    drive: "To initiate, to be first, to act before thinking, to conquer",
    quality: "Makes planets direct, fast, courageous, and impulsive. Adds raw initiation force.",
    shadow: "Impatience, aggression, inability to sustain long-term effort, running from depth",
    body: "Head, adrenals",
  },
  Taurus: {
    element: "Earth",
    modality: "Fixed",
    drive: "To possess, to build, to savor, to create lasting value and stability",
    quality: "Makes planets slow, sensory, stubborn, and resource-oriented. Adds endurance and aesthetic depth.",
    shadow: "Possessiveness, resistance to change, materialism used as emotional armor",
    body: "Throat, neck, thyroid",
  },
  Gemini: {
    element: "Air",
    modality: "Mutable",
    drive: "To perceive, to connect, to learn, to transmit, to be in perpetual motion through ideas",
    quality: "Makes planets quick, curious, scattered, and communicative. Adds dexterity and multiple perspectives.",
    shadow: "Inconsistency, superficiality, nervous anxiety, commitment avoidance",
    body: "Lungs, hands, nervous system",
  },
  Cancer: {
    element: "Water",
    modality: "Cardinal",
    drive: "To nurture, to belong, to protect the tribe, to feel deeply and remember everything",
    quality: "Makes planets emotionally attuned, protective, cyclic, and memory-saturated. Adds depth of feeling.",
    shadow: "Clinginess, moodiness, inability to let go, enmeshment",
    body: "Chest, stomach, breasts",
  },
  Leo: {
    element: "Fire",
    modality: "Fixed",
    drive: "To shine, to create, to be seen and loved, to express the self as art",
    quality: "Makes planets bold, generous, theatrical, and radiant. Adds warmth and need for recognition.",
    shadow: "Pride, drama, approval-addiction, difficulty being a supporting character in others' stories",
    body: "Heart, spine, back",
  },
  Virgo: {
    element: "Earth",
    modality: "Mutable",
    drive: "To refine, to analyze, to be of service, to improve what is broken or impure",
    quality: "Makes planets precise, discerning, self-critical, and pragmatic. Adds analytical depth.",
    shadow: "Perfectionism as paralysis, excessive self-criticism, using analysis to avoid feeling",
    body: "Intestines, digestive system",
  },
  Libra: {
    element: "Air",
    modality: "Cardinal",
    drive: "To relate, to balance, to find beauty, to mediate between opposing forces",
    quality: "Makes planets diplomatic, aesthetically attuned, relational, and indecisive. Adds grace.",
    shadow: "People-pleasing, inability to be alone, chronic indecision, conflict avoidance",
    body: "Kidneys, lower back",
  },
  Scorpio: {
    element: "Water",
    modality: "Fixed",
    drive: "To penetrate, to transform, to uncover what is hidden, to survive through death and rebirth",
    quality: "Makes planets intense, secretive, researching, and transformative. Adds magnetic depth.",
    shadow: "Control, jealousy, power struggles, inability to forgive, holding on beyond usefulness",
    body: "Reproductive organs, colon, elimination",
  },
  Sagittarius: {
    element: "Fire",
    modality: "Mutable",
    drive: "To explore, to philosophize, to find meaning, to journey toward the horizon of understanding",
    quality: "Makes planets expansive, idealistic, philosophical, and freedom-seeking. Adds optimism.",
    shadow: "Dogmatism, commitment avoidance, preaching without practice, overextension",
    body: "Thighs, liver, hips",
  },
  Capricorn: {
    element: "Earth",
    modality: "Cardinal",
    drive: "To achieve, to master, to build lasting structures, to earn authority through sustained effort",
    quality: "Makes planets disciplined, ambitious, patient, and reserved. Adds strategic depth.",
    shadow: "Coldness, emotional suppression, success without satisfaction, identifying with achievement",
    body: "Bones, joints, knees, skin",
  },
  Aquarius: {
    element: "Air",
    modality: "Fixed",
    drive: "To innovate, to liberate, to serve the collective, to think beyond the given categories",
    quality: "Makes planets unconventional, detached, humanitarian, and future-oriented. Adds originality.",
    shadow: "Emotional detachment, contrariness, alienation, reform as a way to avoid intimacy",
    body: "Ankles, calves, circulation",
  },
  Pisces: {
    element: "Water",
    modality: "Mutable",
    drive: "To merge, to transcend, to empathize without limit, to dissolve boundaries between self and cosmos",
    quality: "Makes planets mystical, compassionate, diffuse, and imaginative. Adds spiritual depth.",
    shadow: "Escapism, boundary dissolution, victimhood, difficulty with concrete action",
    body: "Feet, lymphatic system",
  },
};

// ─── House themes ─────────────────────────────────────────────────────────────

export const HOUSE_DOCTRINE: Record<number, {
  name: string;
  themes: string;
  joy: string;
  shadow: string;
}> = {
  1: {
    name: "First House — The Helm",
    themes: "The body, the self presented to the world, first impressions, the beginning of things, physical vitality",
    joy: "Mercury rejoices here — the mind and body intersect at the Ascendant",
    shadow: "Excessive self-focus; the inability to see beyond one's own perspective",
  },
  2: {
    name: "Second House — The Treasury",
    themes: "Movable wealth, personal resources, self-worth, values, what you earn through your own labor",
    joy: "No traditional planetary joy",
    shadow: "Conflating net worth with self-worth; hoarding as a substitute for emotional security",
  },
  3: {
    name: "Third House — The Crossroads",
    themes: "Communication, siblings, local travel, early education, the immediate environment, contracts",
    joy: "Moon rejoices here — the moon's transitory nature matches short journeys and daily news",
    shadow: "Gossip, scattered attention, sibling rivalry, information without wisdom",
  },
  4: {
    name: "Fourth House — The Root",
    themes: "Home, family, ancestry, the private self, real estate, the end of life, what one inherits (emotionally, genetically)",
    joy: "No traditional planetary joy — the 4th is below the horizon, unseen",
    shadow: "Being ruled by the past or family conditioning; inability to leave the nest",
  },
  5: {
    name: "Fifth House — The Stage",
    themes: "Creativity, romance, children, pleasure, play, speculation, what you do for joy",
    joy: "Venus rejoices here — pleasure, art, and love align with the 5th's theater",
    shadow: "Living only for pleasure; gambling with love; refusing adult responsibility",
  },
  6: {
    name: "Sixth House — The Workshop",
    themes: "Daily routines, health, service, work (but not career), small animals, bodily maintenance, illness",
    joy: "Mars rejoices here — disciplined effort, the craft of the body",
    shadow: "Servitude without recognition; hypochondria; using busyness to avoid deeper issues",
  },
  7: {
    name: "Seventh House — The Mirror",
    themes: "Marriage, significant partnerships (business and romantic), open enemies, negotiations, what we attract in others",
    joy: "No traditional planetary joy — it faces the Ascendant across the horizon",
    shadow: "Projecting the shadow onto partners; losing oneself in relationship",
  },
  8: {
    name: "Eighth House — The Vault",
    themes: "Other people's resources, inheritance, death and transformation, shared finances, sexuality as merger, occult knowledge",
    joy: "Saturn rejoices here — the 8th requires the discipline to face what others avoid",
    shadow: "Power struggles over shared resources; fear of death preventing full living; obsession",
  },
  9: {
    name: "Ninth House — The Horizon",
    themes: "Higher education, philosophy, religion, long journeys, foreign cultures, publishing, the law, teachers",
    joy: "Sun rejoices here — the Sun at maximum altitude in the 9th illuminates the highest truths",
    shadow: "Dogmatism; travel as escape; mistaking belief for knowledge",
  },
  10: {
    name: "Tenth House — The Summit",
    themes: "Career, public reputation, the authority figure, what one is known for, the height of the arc",
    joy: "Jupiter and Mercury have associations here — achievement and public speaking",
    shadow: "Success without meaning; confusing public role with inner identity; achievement addiction",
  },
  11: {
    name: "Eleventh House — The Assembly",
    themes: "Friends, allies, community, hopes and wishes, benefactors, group projects, the future one envisions",
    joy: "Jupiter rejoices here — the 11th is the house of the Good Daimon",
    shadow: "Belonging to a group to avoid knowing oneself; idealism without groundedness",
  },
  12: {
    name: "Twelfth House — The Undercroft",
    themes: "Hidden matters, self-undoing, solitude, karma, confinement (literal and psychological), what is sacrificed",
    joy: "Saturn rejoices here (second choice) — discipline in the hidden realm",
    shadow: "Self-sabotage; fear of the unconscious; isolation as protection from living",
  },
};

// ─── Mercury voice adaptation ─────────────────────────────────────────────────

export const MERCURY_VOICE: Record<string, string> = {
  Aries: "SPEAK FAST AND DIRECT. Short sentences. Bold claims. No hedging. Start strong. The native's mind cuts through noise.",
  Taurus: "Be grounded. Use sensory, material metaphors. Speak with weight and patience. Avoid rushing to the point — let it settle.",
  Gemini: "Be quick, layered, and multi-angled. Offer more than one thread. Match their nervous energy. Be curious.",
  Cancer: "Be emotionally resonant and intuitive. Connect cosmic patterns to lived feeling and memory. Gentle but perceptive.",
  Leo: "Speak with warmth and dramatic flair. Frame insights as the native's own unfolding story. Emphasize their gifts.",
  Virgo: "Be precise. Include specifics: degrees, orbs, timing windows. No vagueness. The native will notice imprecision.",
  Libra: "Be balanced and elegant. Present two sides when relevant. Keep the aesthetic and relational dimension visible.",
  Scorpio: "Go deeper than asked. Name what's unspoken. Reveal the hidden layer beneath the surface question. Pierce.",
  Sagittarius: "Be philosophical and expansive. Connect to broader meaning and worldview. The native wants the big picture.",
  Capricorn: "Be structured and practical. Emphasize timelines, long-term return, and what discipline produces. Be useful.",
  Aquarius: "Be conceptual and unconventional. Think in systems. Break the familiar frame. The native sees patterns others miss.",
  Pisces: "Be poetic and mythic. Use imagery and fluid association. Meaning arrives sideways. Speak in currents, not bullets.",
};

// ─── Aspect doctrine ──────────────────────────────────────────────────────────

export const ASPECT_DOCTRINE: Record<string, {
  nature: string;
  meaning: string;
  exact: string;
}> = {
  conjunction: {
    nature: "Blending — two planets merge their energies, amplifying each other",
    meaning: "The most powerful aspect. The planets fuse — you cannot separate their functions. For better or worse, they operate as one.",
    exact: "When exact (<1°), this is a defining signature of the chart. The native carries this fusion as a core theme.",
  },
  opposition: {
    nature: "Tension across polarity — the two planets face each other across the wheel",
    meaning: "The native experiences these energies as external and internal in alternation — projecting one onto others or relationships. The growth path is integration.",
    exact: "When exact, this opposition becomes a central life theme, often played out in significant partnerships.",
  },
  trine: {
    nature: "Harmony — planets in the same element flow freely",
    meaning: "Natural talent and ease. Energy moves between these planets without friction. The danger is taking the gift for granted or expecting this flow everywhere.",
    exact: "When exact, the harmonious flow becomes a pronounced natural ability.",
  },
  square: {
    nature: "Friction — planets in the same modality but incompatible elements create productive conflict",
    meaning: "The square produces the desire to act. It is uncomfortable but generative — the pressure creates motion. The native must learn to work with both planets' demands.",
    exact: "When exact, this square becomes a persistent challenge and driver of achievement.",
  },
  sextile: {
    nature: "Opportunity — compatible but different energies that support each other",
    meaning: "A softer harmony than the trine. Talent that requires activation — it won't work without effort but yields well when engaged.",
    exact: "When exact, the native has a specific skill or resource available in this domain.",
  },
  quincunx: {
    nature: "Adjustment — planets with nothing in common must find awkward accommodation",
    meaning: "An aspect of irritation and recalibration. These planets share no element, modality, or polarity — they must constantly adjust to each other. Often points to health or service themes.",
    exact: "When exact, this adjustment becomes a recurring life theme requiring significant flexibility.",
  },
};

// ─── Essential dignity table ──────────────────────────────────────────────────

export const ESSENTIAL_DIGNITIES: Record<string, {
  domicile: ZodiacSign[];
  exaltation: ZodiacSign;
  detriment: ZodiacSign[];
  fall: ZodiacSign;
  meaning: string;
}> = {
  Sun:     { domicile: ["Leo"],                  exaltation: "Aries",       detriment: ["Aquarius"],          fall: "Libra",       meaning: "The Sun in dignity expresses with confidence; in detriment/fall, it struggles to shine clearly" },
  Moon:    { domicile: ["Cancer"],               exaltation: "Taurus",      detriment: ["Capricorn"],         fall: "Scorpio",     meaning: "The Moon in dignity nurtures freely; in detriment/fall, emotional needs are blocked or overwhelmed" },
  Mercury: { domicile: ["Gemini", "Virgo"],      exaltation: "Virgo",       detriment: ["Sagittarius","Pisces"], fall: "Pisces",   meaning: "Mercury in dignity thinks with precision; in detriment/fall, the mind scatters or over-idealizes" },
  Venus:   { domicile: ["Taurus", "Libra"],      exaltation: "Pisces",      detriment: ["Scorpio","Aries"],   fall: "Virgo",       meaning: "Venus in dignity attracts naturally; in detriment/fall, love is complicated or self-critical" },
  Mars:    { domicile: ["Aries", "Scorpio"],     exaltation: "Capricorn",   detriment: ["Libra","Taurus"],    fall: "Cancer",      meaning: "Mars in dignity acts with precision and force; in detriment/fall, drive is frustrated or misapplied" },
  Jupiter: { domicile: ["Sagittarius","Pisces"], exaltation: "Cancer",      detriment: ["Gemini","Virgo"],    fall: "Capricorn",   meaning: "Jupiter in dignity expands freely; in detriment/fall, growth is blocked or scattered" },
  Saturn:  { domicile: ["Capricorn","Aquarius"], exaltation: "Libra",       detriment: ["Cancer","Leo"],      fall: "Aries",       meaning: "Saturn in dignity builds with mastery; in detriment/fall, discipline becomes oppressive or unstable" },
};

// ─── Knowledge context builder ────────────────────────────────────────────────

function detectRelevantPlanets(message: string): PlanetName[] {
  const lc = message.toLowerCase();
  const found: PlanetName[] = [];
  const map: [string[], PlanetName][] = [
    [["sun", "solar", "vitality", "identity", "ego", "father"], "Sun"],
    [["moon", "lunar", "emotion", "feeling", "mother", "instinct", "habit"], "Moon"],
    [["mercury", "mind", "communication", "thinking", "speech", "writing", "learning"], "Mercury"],
    [["venus", "love", "beauty", "attraction", "relationship", "pleasure", "money"], "Venus"],
    [["mars", "drive", "action", "anger", "conflict", "desire", "energy", "ambition"], "Mars"],
    [["jupiter", "luck", "expansion", "abundance", "growth", "wisdom", "teacher", "travel"], "Jupiter"],
    [["saturn", "karma", "discipline", "limitation", "challenge", "fear", "authority", "structure"], "Saturn"],
    [["uranus", "change", "disruption", "rebellion", "innovation", "freedom", "unexpected"], "Uranus"],
    [["neptune", "dream", "spiritual", "illusion", "compassion", "dissolution", "mystical"], "Neptune"],
    [["pluto", "transformation", "power", "death", "rebirth", "control", "obsession"], "Pluto"],
  ];
  for (const [keywords, planet] of map) {
    if (keywords.some(k => lc.includes(k))) found.push(planet);
  }
  return found;
}

function detectRelevantHouses(message: string): number[] {
  const lc = message.toLowerCase();
  const found: number[] = [];
  const houseWords = ["first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth","eleventh","twelfth"];
  houseWords.forEach((word, i) => {
    if (lc.includes(word) || lc.includes(`house ${i+1}`) || lc.includes(`h${i+1}`) || lc.includes(`${i+1}st`) || lc.includes(`${i+1}nd`) || lc.includes(`${i+1}rd`) || lc.includes(`${i+1}th`)) {
      found.push(i + 1);
    }
  });
  if (lc.includes("career") || lc.includes("public")) found.push(10);
  if (lc.includes("partnership") || lc.includes("marriage") || lc.includes("relationship")) found.push(7);
  if (lc.includes("home") || lc.includes("family") || lc.includes("ancestry")) found.push(4);
  if (lc.includes("finance") || lc.includes("money") || lc.includes("resource")) found.push(2);
  return [...new Set(found)];
}

export function buildKnowledgeContext(chart: ChartData, message: string): string {
  const lines: string[] = [];

  // 1. Mercury voice instruction
  const mercury = chart.planets.find(p => p.name === "Mercury");
  if (mercury && MERCURY_VOICE[mercury.sign]) {
    lines.push(`COMMUNICATION STYLE FOR THIS NATIVE (Mercury in ${mercury.sign}):\n${MERCURY_VOICE[mercury.sign]}`);
  }

  // 2. Profection year context
  const prof = chart.annualProfection;
  const lordDoc = PLANET_DOCTRINE[prof.lordOfYear];
  if (lordDoc) {
    lines.push(`\nACTIVE TIMING (Profection Year ${prof.activatedHouse}/${prof.activatedSign}, Lord: ${prof.lordOfYear}):\nThe Lord of the Year activates the themes of: ${lordDoc.archetype}`);
  }

  // 3. Planets by dignity — inject the 2-3 most relevant
  const topPlanets = chart.planets
    .filter(p => p.dignity && p.dignity !== "peregrine")
    .slice(0, 3);

  if (topPlanets.length > 0) {
    lines.push("\nESSENTIAL DIGNITIES IN EFFECT:");
    for (const p of topPlanets) {
      const doc = PLANET_DOCTRINE[p.name];
      if (!doc) continue;
      const digText = p.dignity === "domicile" ? doc.dignified
        : p.dignity === "exaltation" ? doc.dignified
        : p.dignity === "detriment" ? doc.debilitated
        : p.dignity === "fall" ? doc.debilitated
        : "";
      lines.push(`- ${p.name} in ${p.sign} [${p.dignity}]: ${digText}`);
    }
  }

  // 4. Query-triggered planet doctrine
  const relevantPlanets = detectRelevantPlanets(message);
  if (relevantPlanets.length > 0) {
    lines.push("\nRELEVANT PLANET DOCTRINE:");
    for (const pName of relevantPlanets.slice(0, 3)) {
      const doc = PLANET_DOCTRINE[pName];
      const natalP = chart.planets.find(p => p.name === pName);
      const signDoc = natalP ? SIGN_DOCTRINE[natalP.sign] : null;
      if (!doc || !natalP) continue;
      lines.push(`${pName} in ${natalP.sign} (H${natalP.house}${natalP.retrograde ? " Rx" : ""}):
  Archetype: ${doc.archetype}
  In ${natalP.sign}: ${signDoc ? signDoc.quality : ""} ${signDoc ? "Drive: " + signDoc.drive : ""}
  ${natalP.dignity ? doc[natalP.dignity === "domicile" || natalP.dignity === "exaltation" ? "dignified" : "debilitated"] : ""}`);
    }
  }

  // 5. Query-triggered house doctrine
  const relevantHouses = detectRelevantHouses(message);
  if (relevantHouses.length > 0) {
    lines.push("\nRELEVANT HOUSE DOCTRINE:");
    for (const h of relevantHouses.slice(0, 2)) {
      const doc = HOUSE_DOCTRINE[h];
      if (!doc) continue;
      const houseSign = chart.houses[h - 1]?.sign;
      lines.push(`${doc.name}${houseSign ? ` (${houseSign})` : ""}:
  ${doc.themes}`);
    }
  }

  // 6. Sect doctrine
  lines.push(`\nCHART SECT: ${chart.sect} chart.${
    chart.sect === "day"
      ? " Day chart: Sun, Jupiter, and Saturn are more beneficent. Moon and Venus are moderate."
      : " Night chart: Moon, Venus, and Mars are more beneficent. Saturn is more difficult."
  }`);

  return lines.join("\n");
}
