export interface FixedStar {
  name: string;
  longitude: number;  // tropical longitude (J2000 epoch, approximately current)
  nature: string;     // planetary nature (e.g. "Venus/Mercury")
  magnitude: number;  // visual magnitude (smaller = brighter)
  keywords: string;
  interpretation: string;
}

// Top 30 traditional fixed stars with approximate tropical positions (J2000 + precession to ~2025)
export const FIXED_STARS: FixedStar[] = [
  { name: "Algol",       longitude:  26.1, nature: "Saturn/Jupiter", magnitude: 2.1, keywords: "Intensity, transformation, danger", interpretation: "The Gorgon's head — extreme intensity and the power of the terrible. Warns of crisis that forges strength." },
  { name: "Pleiades",    longitude:  30.0, nature: "Moon/Mars",       magnitude: 1.6, keywords: "Sorrow, brilliance, seeking",        interpretation: "The Seven Sisters — beauty through sorrow, grief that deepens wisdom, far-reaching vision." },
  { name: "Aldebaran",   longitude:  10.0, nature: "Mars",            magnitude: 0.9, keywords: "Honor, integrity, success",          interpretation: "The Bull's Eye and royal star of the East — integrity brings lasting honor. Leadership with courage." },
  { name: "Rigel",       longitude:  17.1, nature: "Jupiter/Saturn",  magnitude: 0.1, keywords: "Achievement, education, refinement",  interpretation: "The great educator — bestows brilliance, technical mastery and the ability to bring great works to completion." },
  { name: "Bellatrix",   longitude:  21.5, nature: "Mars/Mercury",    magnitude: 1.6, keywords: "Strategy, wit, success through boldness", interpretation: "Amazon star — tactical brilliance and daring. Success through quick thinking and bold initiative." },
  { name: "Betelgeuse",  longitude:  29.5, nature: "Mars/Mercury",    magnitude: 0.6, keywords: "Fortune, honor, courage",            interpretation: "The warrior's shoulder — outstanding success and fame. Honors from daring deeds and protective instincts." },
  { name: "Sirius",      longitude: 104.2, nature: "Jupiter/Mars",    magnitude:-1.5, keywords: "Ambition, glory, spiritual insight",  interpretation: "The brightest star — blazing ambition and spiritual gifts. Can indicate great renown or powerful ideals that elevate." },
  { name: "Canopus",     longitude:  15.3, nature: "Saturn/Jupiter",  magnitude:-0.7, keywords: "Navigation, wisdom, endurance",       interpretation: "The helmsman's star — long journeys, deep wisdom, the ability to steer through the most difficult passages." },
  { name: "Procyon",     longitude: 126.1, nature: "Mercury/Mars",    magnitude: 0.4, keywords: "Fame, rashness, sudden events",      interpretation: "Before the Dog Star — swift rises and falls. Brilliance that can outrun itself; the need to temper speed with wisdom." },
  { name: "Pollux",      longitude: 123.7, nature: "Mars",            magnitude: 1.1, keywords: "Force, brutality, power",            interpretation: "The mortal twin — strength that contains risk. Great physical or executive power with a need for ethical guidance." },
  { name: "Castor",      longitude: 120.2, nature: "Mercury",         magnitude: 1.6, keywords: "Gifts, creativity, sudden changes",   interpretation: "The immortal twin — multiple talents and brilliance. Gifts that come in flashes; variable fortune." },
  { name: "Regulus",     longitude: 150.1, nature: "Mars/Jupiter",    magnitude: 1.4, keywords: "Royalty, honor, eminence",           interpretation: "The heart of the Lion and royal star of the North — bestows honors, leadership, and royal grace. Warns against revenge." },
  { name: "Algorab",     longitude: 194.3, nature: "Mars/Saturn",     magnitude: 2.9, keywords: "Criticism, strategy, ambition",       interpretation: "The Crow — piercing insight and analytical power. Can be used for healing insight or cutting criticism." },
  { name: "Spica",       longitude: 204.1, nature: "Venus/Mercury",   magnitude: 1.0, keywords: "Brilliance, gifts, inspiration",     interpretation: "The Wheat Sheaf — one of the most benefic stars. Pure gifts of intellect and artistry; natural brilliance." },
  { name: "Arcturus",    longitude: 204.4, nature: "Jupiter/Mars",    magnitude:-0.1, keywords: "Success, travel, pioneering",        interpretation: "The Bear Guardian — protection through change, success from breaking new ground, the pioneer's star." },
  { name: "Alphecca",    longitude: 212.7, nature: "Venus/Mercury",   magnitude: 2.2, keywords: "Grace, artistry, recognition",       interpretation: "The Northern Crown's gem — recognition for creative work and graceful execution. Quiet but lasting fame." },
  { name: "Antares",     longitude: 249.9, nature: "Mars/Jupiter",    magnitude: 1.0, keywords: "Passion, intensity, obsession",      interpretation: "Heart of the Scorpion and royal star of the West — passion that transforms. Deep purpose; warns against excess." },
  { name: "Vega",        longitude: 285.3, nature: "Venus/Mercury",   magnitude: 0.0, keywords: "Charisma, magic, leadership",        interpretation: "The Falling Eagle — supernatural charisma and the ability to inspire awe. Music, poetry, and otherworldly gifts." },
  { name: "Deneb Algedi",longitude: 303.8, nature: "Saturn/Jupiter",  magnitude: 2.8, keywords: "Wisdom, law, authority",            interpretation: "The Goat's Tail — authority through discipline and wisdom. The law-giver's star; power through restraint." },
  { name: "Fomalhaut",   longitude: 334.1, nature: "Venus/Mercury",   magnitude: 1.2, keywords: "Vision, mysticism, idealism",        interpretation: "The Solitary One and royal star of the South — transcendent vision and spiritual longing. High ideals that must meet reality." },
  { name: "Scheat",      longitude: 349.7, nature: "Mars/Mercury",    magnitude: 2.4, keywords: "Intellect, adventure, crisis",       interpretation: "The Winged Horse's leg — flights of imagination and daring thought. Can indicate crises from overreach." },
  { name: "Markab",      longitude: 323.5, nature: "Mars/Mercury",    magnitude: 2.5, keywords: "Eloquence, speed, enterprise",       interpretation: "The saddle of Pegasus — swiftness of mind and communication. Eloquence that carries far." },
  { name: "Achernar",    longitude:  15.3, nature: "Jupiter",         magnitude: 0.5, keywords: "Success, honor, prosperity",         interpretation: "River's End — the deep reservoirs of success from persistent spiritual commitment. Rewards for endurance." },
  { name: "Deneb Kaitos",longitude:  22.7, nature: "Saturn",          magnitude: 2.0, keywords: "Restriction, inhibition, restraint", interpretation: "The Whale's Tail — enforced restraint and lessons from limitation. Power that is temporarily bound but not lost." },
  { name: "Mirach",      longitude:  30.4, nature: "Venus",           magnitude: 2.1, keywords: "Harmony, receptivity, beauty",       interpretation: "The Andromeda queen's hip — magnetic receptivity and deep emotional beauty. Attracts help through grace." },
  { name: "Hamal",       longitude:  7.7,  nature: "Saturn/Mars",     magnitude: 2.0, keywords: "Determination, independence, force", interpretation: "The Ram's head — determined self-reliance and the drive to break new ground regardless of opposition." },
  { name: "Facies",      longitude: 278.5, nature: "Sun/Mars",        magnitude: 5.9, keywords: "Ruthlessness, focus, penetrating",   interpretation: "Nebula in the Archer's eye — penetrating vision that can see through illusion. Laser focus with a harsh edge." },
  { name: "Menkar",      longitude:  14.5, nature: "Saturn",          magnitude: 2.5, keywords: "Karma, trials, collective burden",   interpretation: "The Sea Monster's jaw — encounters with fate and collective shadows. Trials that build unusual strength." },
  { name: "Alcyone",     longitude:  0.0,  nature: "Moon/Jupiter",    magnitude: 2.9, keywords: "Vision, longing, spiritual sight",   interpretation: "Central Pleiad — profound inner sight and the longing for the infinite. Heightens sensitivity and visionary capacity." },
  { name: "Ras Alhague", longitude: 262.0, nature: "Saturn/Venus",    magnitude: 2.1, keywords: "Healing, wisdom, medicine",          interpretation: "Head of the Serpent Bearer — healing arts, spiritual medicine, and wisdom of integration." },
];

export const CONJUNCTION_ORB = 1.5; // degrees

export function getStarConjunctions(
  longitude: number,
  orb: number = CONJUNCTION_ORB
): FixedStar[] {
  const norm = ((longitude % 360) + 360) % 360;
  return FIXED_STARS.filter(star => {
    const diff = Math.abs(norm - star.longitude);
    return Math.min(diff, 360 - diff) <= orb;
  }).sort((a, b) => {
    const da = Math.abs(((norm - a.longitude) % 360 + 360) % 360);
    const db = Math.abs(((norm - b.longitude) % 360 + 360) % 360);
    const oa = Math.min(da, 360 - da);
    const ob = Math.min(db, 360 - db);
    return oa - ob;
  });
}
