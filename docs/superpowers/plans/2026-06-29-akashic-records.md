# Akashic Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Akashic Records — a contextual astrology library at `/dashboard/akashic` where every article knows the user's chart, highlights relevant placements, and connects to the Oracle chat.

**Architecture:** Static entry stubs (slug, category, summary, chartKeys) live in `src/lib/akashic/entries.ts`. Article bodies are AI-generated on first view and cached to `localStorage` (key: `cosmora_akashic_<slug>`), so content is always fresh and personalized. An "In Your Chart" card on each article computes relevance from `ChartData` + `SiderealChart` + `VimshottariData` + `CharaKarakas`. An "Ask the Oracle" button seeds the main Oracle chat via `?q=` query param (already supported by the Oracle page).

**Tech Stack:** Next.js 16.2.6 App Router, React 19, TypeScript, Framer Motion, Fragment Mono + Cormorant Garamond fonts, localStorage caching, `/api/chat` SSE streaming.

## Global Constraints

- All pages: `"use client"`, `DashboardBg`, scroll container at `left: 64`, `scrollbarWidth: "none"`
- Dark OLED palette: bg `#010810`, gold `#C8A55B`, borders `rgba(40,60,100,0.3)`
- Fragment Mono for labels/codes, Cormorant Garamond for body text, DM Sans for inputs
- Category colors: foundations `#C8A55B`, hellenistic `#a78bfa`, timing `#f59e0b`, vedic `#06b6d4`, esoteric `#f472b6`
- Path alias: `@/*` → `./src/*`
- `calculateChart` is SYNCHRONOUS — never await it
- Commit convention: `feat(akashic): ...`
- Verification: `npx tsx scripts/verify-akashic.ts` then `npm run build`

---

## File Map

```
src/lib/akashic/
  types.ts             — AkashicEntry, ChartKey, EntryChartContext types
  entries.ts           — all ~70 entry stubs
  chart-context.ts     — getEntryChartContext(entry, chart, sidereal?, dasha?, karakas?)

src/app/dashboard/akashic/
  page.tsx             — library home: search + category filter + entry cards
  [slug]/
    page.tsx           — article detail: AI body, In Your Chart, Ask Oracle

src/components/dashboard/Sidebar.tsx   — add Akashic nav item
scripts/verify-akashic.ts              — assert entry integrity + chart-context logic
```

---

### Task 1: Types + entries data + chart-context engine

**Files:**
- Create: `src/lib/akashic/types.ts`
- Create: `src/lib/akashic/entries.ts`
- Create: `src/lib/akashic/chart-context.ts`
- Create: `scripts/verify-akashic.ts`

**Interfaces produced:**

```typescript
// types.ts

export type AkashicCategory = "foundations" | "hellenistic" | "timing" | "vedic" | "esoteric";

export type ChartKeyType = "planet" | "sign" | "house" | "nakshatra" | "technique";
export type TechniqueKey = "currentDasha" | "currentFirdaria" | "sect" | "ak" | "progressions" | "solarReturn";

export interface ChartKey {
  type: ChartKeyType;
  name?: string;    // planet name, sign name, or nakshatra name
  number?: number;  // house number
  key?: TechniqueKey;
}

export interface AkashicEntry {
  slug: string;
  title: string;
  subtitle: string;
  category: AkashicCategory;
  tags: string[];
  summary: string;       // 2–3 sentences for cards + article header
  chartKeys: ChartKey[];
  relatedSlugs: string[];
  promptHint: string;    // used to seed AI body generation; not shown to user
}

export interface PlacementContext {
  label: string;         // e.g. "Your Mars"
  detail: string;        // e.g. "Scorpio · House 8 · Jyeshtha P2"
  extra?: string;        // e.g. "Rx", "Atmakaraka"
}

export interface EntryChartContext {
  hasRelevance: boolean;
  placements: PlacementContext[];
  headline: string;      // e.g. "Your Mars is in Scorpio in the 8th House"
}
```

- [ ] **Step 1: Create `src/lib/akashic/types.ts`**

```typescript
export type AkashicCategory = "foundations" | "hellenistic" | "timing" | "vedic" | "esoteric";
export type ChartKeyType = "planet" | "sign" | "house" | "nakshatra" | "technique";
export type TechniqueKey = "currentDasha" | "currentFirdaria" | "sect" | "ak" | "progressions" | "solarReturn";

export interface ChartKey {
  type: ChartKeyType;
  name?: string;
  number?: number;
  key?: TechniqueKey;
}

export interface AkashicEntry {
  slug: string;
  title: string;
  subtitle: string;
  category: AkashicCategory;
  tags: string[];
  summary: string;
  chartKeys: ChartKey[];
  relatedSlugs: string[];
  promptHint: string;
}

export interface PlacementContext {
  label: string;
  detail: string;
  extra?: string;
}

export interface EntryChartContext {
  hasRelevance: boolean;
  placements: PlacementContext[];
  headline: string;
}
```

- [ ] **Step 2: Create `src/lib/akashic/entries.ts`**

Write ALL entries exactly as shown below. Do not abbreviate or mark anything as "TBD."

```typescript
import type { AkashicEntry } from "./types";

export const AKASHIC_ENTRIES: AkashicEntry[] = [

  // ─── FOUNDATIONS: PLANETS ────────────────────────────────────────────────────

  {
    slug: "planet-sun", title: "The Sun", subtitle: "☉ · Identity · Will · Vitality",
    category: "foundations", tags: ["planet", "luminary", "fire", "ego"],
    summary: "The Sun is the core of your conscious identity — the will-power, the ego, and the creative life force that animates your entire chart. It describes where you must shine, the role you are meant to play, and the central theme of this lifetime.",
    chartKeys: [{ type: "planet", name: "Sun" }],
    relatedSlugs: ["house-5th", "sign-leo", "technique-sect", "hellenistic-lot-spirit"],
    promptHint: "Sun in astrology: identity, vitality, the hero myth, Leo rulership, sect importance in Hellenistic, Surya in Jyotish, solar returns as the yearly chapter.",
  },
  {
    slug: "planet-moon", title: "The Moon", subtitle: "☽ · Soul · Emotion · The Body",
    category: "foundations", tags: ["planet", "luminary", "water", "emotion"],
    summary: "The Moon governs your inner world — the habitual emotional responses, the body's instincts, memory, and the quality of your daily felt experience. It is the planet most tied to childhood conditioning and your relationship with safety, nurturing, and belonging.",
    chartKeys: [{ type: "planet", name: "Moon" }],
    relatedSlugs: ["house-4th", "sign-cancer", "vedic-nakshatra", "vedic-vimshottari-dasha"],
    promptHint: "Moon in astrology: emotion, memory, instinct, the mother archetype, Hellenistic sect luminary for night charts, Chandra in Jyotish, nakshatra placement as soul fingerprint.",
  },
  {
    slug: "planet-mercury", title: "Mercury", subtitle: "☿ · Mind · Language · Perception",
    category: "foundations", tags: ["planet", "air", "earth", "communication"],
    summary: "Mercury rules the way you think, speak, and process information — the nervous system of the chart. It describes your mental style, the tone of your communication, and how you connect ideas, people, and places.",
    chartKeys: [{ type: "planet", name: "Mercury" }],
    relatedSlugs: ["house-3rd", "house-6th", "sign-gemini", "sign-virgo"],
    promptHint: "Mercury: cognition, language, trade, siblings, the messenger archetype, Gemini/Virgo rulership, Budha in Jyotish, retrograde cycles and their re-examination themes.",
  },
  {
    slug: "planet-venus", title: "Venus", subtitle: "♀ · Love · Beauty · Value",
    category: "foundations", tags: ["planet", "air", "earth", "relationship"],
    summary: "Venus describes what you love and how you love — your aesthetic sensibility, your values, your capacity for pleasure and connection. It governs both romance and money as expressions of what you find worth having.",
    chartKeys: [{ type: "planet", name: "Venus" }],
    relatedSlugs: ["house-2nd", "house-7th", "sign-taurus", "sign-libra", "hellenistic-lot-fortune"],
    promptHint: "Venus: love, beauty, resources, Aphrodite archetype, Taurus/Libra rulership, Shukra in Jyotish, evening/morning star sect distinction, relationship to the Lot of Fortune.",
  },
  {
    slug: "planet-mars", title: "Mars", subtitle: "♂ · Drive · Conflict · Courage",
    category: "foundations", tags: ["planet", "fire", "water", "will"],
    summary: "Mars is the engine of desire and the seat of courage — it describes how you assert yourself, what you fight for, and where you direct raw energy. Its placement reveals your relationship with anger, ambition, and physical vitality.",
    chartKeys: [{ type: "planet", name: "Mars" }],
    relatedSlugs: ["house-1st", "house-8th", "sign-aries", "sign-scorpio"],
    promptHint: "Mars: will, aggression, courage, Ares archetype, Aries/Scorpio traditional rulership, Mangala in Jyotish, malefic by nature but beneficial for action, retrograde cycles.",
  },
  {
    slug: "planet-jupiter", title: "Jupiter", subtitle: "♃ · Expansion · Wisdom · Grace",
    category: "foundations", tags: ["planet", "fire", "water", "benefic"],
    summary: "Jupiter is the great benefic — it expands, blesses, and brings opportunities wherever it touches. It describes your philosophy of life, your faith, your capacity for abundance, and where the universe seems to open doors for you.",
    chartKeys: [{ type: "planet", name: "Jupiter" }],
    relatedSlugs: ["house-9th", "house-12th", "sign-sagittarius", "sign-pisces"],
    promptHint: "Jupiter: expansion, wisdom, faith, Zeus/Guru archetype, Sagittarius/Pisces rulership, Brihaspati in Jyotish, great benefic in Hellenistic tradition, transit cycles of 12 years.",
  },
  {
    slug: "planet-saturn", title: "Saturn", subtitle: "♄ · Time · Structure · Karma",
    category: "foundations", tags: ["planet", "earth", "air", "malefic"],
    summary: "Saturn is the great teacher — demanding, patient, and ultimately rewarding. It describes where you face limitation, responsibility, and the slow building of mastery. What Saturn touches eventually becomes your greatest area of earned authority.",
    chartKeys: [{ type: "planet", name: "Saturn" }],
    relatedSlugs: ["house-10th", "house-11th", "sign-capricorn", "sign-aquarius", "timing-firdaria"],
    promptHint: "Saturn: time, restriction, karma, Cronus archetype, Capricorn/Aquarius rulership, Shani in Jyotish, malefic benefiting from sect, 29.5-year return, Saturn dasha as crucible.",
  },
  {
    slug: "planet-uranus", title: "Uranus", subtitle: "⛢ · Revolution · Genius · Liberation",
    category: "foundations", tags: ["planet", "air", "outer", "modern"],
    summary: "Uranus rules the sudden break, the flash of insight, and the irresistible urge to be free. Its house and sign describe where conventional rules feel like a cage, and where your genius — or your chaos — breaks through.",
    chartKeys: [{ type: "planet", name: "Uranus" }],
    relatedSlugs: ["sign-aquarius", "house-11th"],
    promptHint: "Uranus: revolution, electrical disruption, the trickster/inventor, modern rulership of Aquarius, generational influence, Uranus oppositions and mid-life crises.",
  },
  {
    slug: "planet-neptune", title: "Neptune", subtitle: "♆ · Dreams · Dissolution · Spirit",
    category: "foundations", tags: ["planet", "water", "outer", "modern"],
    summary: "Neptune dissolves boundaries — between self and other, real and imagined, sacred and ordinary. Its house and sign describe where you seek transcendence, where illusion is most potent, and where compassion or confusion can run deepest.",
    chartKeys: [{ type: "planet", name: "Neptune" }],
    relatedSlugs: ["sign-pisces", "house-12th"],
    promptHint: "Neptune: dissolution, mysticism, addiction, modern rulership of Pisces, the veil between worlds, Neptune conjunctions as generation-defining spiritual openings.",
  },
  {
    slug: "planet-pluto", title: "Pluto", subtitle: "♇ · Death · Power · Transformation",
    category: "foundations", tags: ["planet", "water", "outer", "modern"],
    summary: "Pluto rules radical transformation through death and rebirth. Its house and sign describe where power dynamics, compulsion, and irreversible change operate — the place in your chart where you go into the underworld and emerge changed.",
    chartKeys: [{ type: "planet", name: "Pluto" }],
    relatedSlugs: ["sign-scorpio", "house-8th"],
    promptHint: "Pluto: Hades archetype, generational power shifts, compulsion and obsession, modern co-rulership of Scorpio, Pluto conjunctions as era-defining upheavals.",
  },

  // ─── FOUNDATIONS: SIGNS ──────────────────────────────────────────────────────

  {
    slug: "sign-aries", title: "Aries", subtitle: "♈ · Cardinal Fire · The Ram",
    category: "foundations", tags: ["sign", "fire", "cardinal", "mars"],
    summary: "Aries is the first spark of existence — raw initiative, courage, and the primal need to act. Planets here are impulsive, direct, and driven to pioneer, often learning through trial and error.",
    chartKeys: [{ type: "sign", name: "Aries" }],
    relatedSlugs: ["planet-mars", "house-1st", "sign-libra"],
    promptHint: "Aries: cardinal fire, first sign, Mars-ruled, spring equinox, identity through action, the warrior archetype, Mesha in Jyotish.",
  },
  {
    slug: "sign-taurus", title: "Taurus", subtitle: "♉ · Fixed Earth · The Bull",
    category: "foundations", tags: ["sign", "earth", "fixed", "venus"],
    summary: "Taurus values stability, embodied pleasure, and the slow accumulation of what endures. Planets here build steadily, resist change, and seek to ground the intangible into something real, beautiful, and lasting.",
    chartKeys: [{ type: "sign", name: "Taurus" }],
    relatedSlugs: ["planet-venus", "house-2nd", "sign-scorpio"],
    promptHint: "Taurus: fixed earth, Venus-ruled, sensory pleasure, resource building, the artisan and farmer archetype, Vrishabha in Jyotish.",
  },
  {
    slug: "sign-gemini", title: "Gemini", subtitle: "♊ · Mutable Air · The Twins",
    category: "foundations", tags: ["sign", "air", "mutable", "mercury"],
    summary: "Gemini is the sign of the eternal student — curious, quick, and endlessly fascinated by the diversity of information and people. Planets here are versatile, talkative, and prone to seeing multiple sides of every question.",
    chartKeys: [{ type: "sign", name: "Gemini" }],
    relatedSlugs: ["planet-mercury", "house-3rd", "sign-sagittarius"],
    promptHint: "Gemini: mutable air, Mercury-ruled, duality and multiplicity, communication and commerce, the trickster and messenger, Mithuna in Jyotish.",
  },
  {
    slug: "sign-cancer", title: "Cancer", subtitle: "♋ · Cardinal Water · The Crab",
    category: "foundations", tags: ["sign", "water", "cardinal", "moon"],
    summary: "Cancer is the sign of roots, memory, and emotional safety. Planets here operate through feeling and instinct, building protective shells around what is most precious — home, family, and the continuity of the past.",
    chartKeys: [{ type: "sign", name: "Cancer" }],
    relatedSlugs: ["planet-moon", "house-4th", "sign-capricorn"],
    promptHint: "Cancer: cardinal water, Moon-ruled, home and family, protective instincts, the mother archetype and the ancestral memory, Karka in Jyotish.",
  },
  {
    slug: "sign-leo", title: "Leo", subtitle: "♌ · Fixed Fire · The Lion",
    category: "foundations", tags: ["sign", "fire", "fixed", "sun"],
    summary: "Leo is the sign of self-expression, creativity, and the will to be seen. Planets here burn brightly, crave recognition, and operate through dramatic flair — they must create, lead, or perform to feel fully alive.",
    chartKeys: [{ type: "sign", name: "Leo" }],
    relatedSlugs: ["planet-sun", "house-5th", "sign-aquarius"],
    promptHint: "Leo: fixed fire, Sun-ruled, the king/queen archetype, creative self-expression, pride and generosity, children and play, Simha in Jyotish.",
  },
  {
    slug: "sign-virgo", title: "Virgo", subtitle: "♍ · Mutable Earth · The Virgin",
    category: "foundations", tags: ["sign", "earth", "mutable", "mercury"],
    summary: "Virgo is the sign of discernment, craft, and devoted service. Planets here analyze, refine, and improve — they are drawn to the work that needs doing and the flaw that needs correcting, often learning to find the sacred in the ordinary.",
    chartKeys: [{ type: "sign", name: "Virgo" }],
    relatedSlugs: ["planet-mercury", "house-6th", "sign-pisces"],
    promptHint: "Virgo: mutable earth, Mercury-ruled, analysis and purification, service and health, the healer and craftsperson archetype, Kanya in Jyotish.",
  },
  {
    slug: "sign-libra", title: "Libra", subtitle: "♎ · Cardinal Air · The Scales",
    category: "foundations", tags: ["sign", "air", "cardinal", "venus"],
    summary: "Libra is the sign of relationship, fairness, and the art of finding equilibrium between opposing forces. Planets here operate through partnership and comparison, endlessly weighing what is just, beautiful, or socially harmonious.",
    chartKeys: [{ type: "sign", name: "Libra" }],
    relatedSlugs: ["planet-venus", "house-7th", "sign-aries"],
    promptHint: "Libra: cardinal air, Venus-ruled, justice and balance, the diplomat and aesthete, partnership as the mirror of self, Tula in Jyotish.",
  },
  {
    slug: "sign-scorpio", title: "Scorpio", subtitle: "♏ · Fixed Water · The Scorpion",
    category: "foundations", tags: ["sign", "water", "fixed", "mars", "pluto"],
    summary: "Scorpio is the sign of depth, power, and transformative intensity. Planets here are drawn to the hidden, the taboo, and the irreversible — they want to see what lies beneath the surface, and are willing to go through death to find it.",
    chartKeys: [{ type: "sign", name: "Scorpio" }],
    relatedSlugs: ["planet-mars", "planet-pluto", "house-8th", "sign-taurus"],
    promptHint: "Scorpio: fixed water, Mars (traditional) and Pluto (modern) ruled, depth and transformation, the detective and shaman, sexual and occult themes, Vrishchika in Jyotish.",
  },
  {
    slug: "sign-sagittarius", title: "Sagittarius", subtitle: "♐ · Mutable Fire · The Archer",
    category: "foundations", tags: ["sign", "fire", "mutable", "jupiter"],
    summary: "Sagittarius is the sign of the philosopher and the adventurer — always seeking the horizon, the meaning behind the event, and the bigger picture. Planets here are expansive, optimistic, and restless for truth.",
    chartKeys: [{ type: "sign", name: "Sagittarius" }],
    relatedSlugs: ["planet-jupiter", "house-9th", "sign-gemini"],
    promptHint: "Sagittarius: mutable fire, Jupiter-ruled, philosophy and long journeys, the archer aiming at truth, higher education and faith, Dhanus in Jyotish.",
  },
  {
    slug: "sign-capricorn", title: "Capricorn", subtitle: "♑ · Cardinal Earth · The Sea-Goat",
    category: "foundations", tags: ["sign", "earth", "cardinal", "saturn"],
    summary: "Capricorn is the sign of ambition, mastery, and the patient climb toward authority. Planets here work hard, take the long view, and derive their greatest satisfaction from earned achievement and lasting structures.",
    chartKeys: [{ type: "sign", name: "Capricorn" }],
    relatedSlugs: ["planet-saturn", "house-10th", "sign-cancer"],
    promptHint: "Capricorn: cardinal earth, Saturn-ruled, ambition and career, the elder/patriarch archetype, time and patience as virtues, Makara in Jyotish.",
  },
  {
    slug: "sign-aquarius", title: "Aquarius", subtitle: "♒ · Fixed Air · The Water Bearer",
    category: "foundations", tags: ["sign", "air", "fixed", "saturn", "uranus"],
    summary: "Aquarius is the sign of the collective, the future, and the radical idea. Planets here operate through community, innovation, and a stubborn commitment to what ought to be — often ahead of their time, sometimes alienated from the present.",
    chartKeys: [{ type: "sign", name: "Aquarius" }],
    relatedSlugs: ["planet-saturn", "planet-uranus", "house-11th", "sign-leo"],
    promptHint: "Aquarius: fixed air, Saturn (traditional) and Uranus (modern) ruled, the visionary and revolutionary, humanitarian ideals, groups and societies, Kumbha in Jyotish.",
  },
  {
    slug: "sign-pisces", title: "Pisces", subtitle: "♓ · Mutable Water · The Fish",
    category: "foundations", tags: ["sign", "water", "mutable", "jupiter", "neptune"],
    summary: "Pisces is the sign of dissolution, compassion, and mystical receptivity. Planets here move in and out of reality's edges — drawn to the invisible, the sacred, the suffering of others, and the longing to return to oneness.",
    chartKeys: [{ type: "sign", name: "Pisces" }],
    relatedSlugs: ["planet-jupiter", "planet-neptune", "house-12th", "sign-virgo"],
    promptHint: "Pisces: mutable water, Jupiter (traditional) and Neptune (modern) ruled, the mystic and martyr, dissolution of ego, compassion and escapism, Meena in Jyotish.",
  },

  // ─── FOUNDATIONS: HOUSES ─────────────────────────────────────────────────────

  {
    slug: "house-1st", title: "The First House", subtitle: "Lagna · Identity · The Body",
    category: "foundations", tags: ["house", "angular", "self"],
    summary: "The First House is who you are before you say a word — the body, the face you show the world, and the first impression you create. Planets here color your entire personality and are felt immediately by everyone you meet.",
    chartKeys: [{ type: "house", number: 1 }],
    relatedSlugs: ["sign-aries", "planet-mars", "hellenistic-sect"],
    promptHint: "1st house: ascendant, rising sign, the body, first impressions, physical vitality, life force, how the soul enters the world, angular power.",
  },
  {
    slug: "house-2nd", title: "The Second House", subtitle: "Resources · Values · Voice",
    category: "foundations", tags: ["house", "succedent", "money"],
    summary: "The Second House rules what you own, what you earn, and what you value — including your own self-worth. It also governs the voice and the throat, the body's resource of sound.",
    chartKeys: [{ type: "house", number: 2 }],
    relatedSlugs: ["sign-taurus", "planet-venus", "hellenistic-lot-fortune"],
    promptHint: "2nd house: personal finances, possessions, self-worth, the voice and throat, moveable resources, what you can call your own.",
  },
  {
    slug: "house-3rd", title: "The Third House", subtitle: "Communication · Siblings · Local World",
    category: "foundations", tags: ["house", "cadent", "communication"],
    summary: "The Third House governs the immediate environment — siblings, short journeys, everyday communication, and the mind as it processes the nearby world. It is the house of the neighborhood, the inbox, and the nervous chatter of daily life.",
    chartKeys: [{ type: "house", number: 3 }],
    relatedSlugs: ["sign-gemini", "planet-mercury"],
    promptHint: "3rd house: siblings, short journeys, writing, communication, local environment, the everyday rational mind, hands and arms.",
  },
  {
    slug: "house-4th", title: "The Fourth House", subtitle: "Home · Roots · The Private Self",
    category: "foundations", tags: ["house", "angular", "family"],
    summary: "The Fourth House is the foundation — the home you grew up in, the parents and ancestors who shaped you, and the private sanctuary you return to at the end of the day. It is the psychological bedrock of the entire chart.",
    chartKeys: [{ type: "house", number: 4 }],
    relatedSlugs: ["sign-cancer", "planet-moon"],
    promptHint: "4th house: home, family, the 4th angle (IC), roots and ancestry, the private life, property and land, the father (in some traditions).",
  },
  {
    slug: "house-5th", title: "The Fifth House", subtitle: "Joy · Creativity · Romance",
    category: "foundations", tags: ["house", "succedent", "pleasure"],
    summary: "The Fifth House is where you play — creativity, romance, children, gambling, and all the activities pursued purely for joy. Planets here describe how you express your heart, what makes you come alive, and the kind of love affairs that light you up.",
    chartKeys: [{ type: "house", number: 5 }],
    relatedSlugs: ["sign-leo", "planet-sun"],
    promptHint: "5th house: creativity, romance, children, pleasure, gambling and speculation, performance, the heart's delight, Leo's natural domain.",
  },
  {
    slug: "house-6th", title: "The Sixth House", subtitle: "Work · Health · Service",
    category: "foundations", tags: ["house", "cadent", "health"],
    summary: "The Sixth House governs the daily grind — work routines, health practices, and service to others. It is where body and schedule meet: how you maintain yourself physically, and the day-to-day labor through which you build skill.",
    chartKeys: [{ type: "house", number: 6 }],
    relatedSlugs: ["sign-virgo", "planet-mercury"],
    promptHint: "6th house: health and illness, daily work, employees and servants, small animals, routines, the body's maintenance, Virgo's natural domain.",
  },
  {
    slug: "house-7th", title: "The Seventh House", subtitle: "Partnership · The Other · Contracts",
    category: "foundations", tags: ["house", "angular", "relationship"],
    summary: "The Seventh House is the mirror — the committed partner, the open enemy, the contract, and the other person in any significant one-on-one dynamic. Planets here describe who you attract and what you seek in relationship.",
    chartKeys: [{ type: "house", number: 7 }],
    relatedSlugs: ["sign-libra", "planet-venus"],
    promptHint: "7th house: marriage and partnership, open enemies, contracts, the descendant angle, what we project onto others, who we attract.",
  },
  {
    slug: "house-8th", title: "The Eighth House", subtitle: "Transformation · Death · Shared Resources",
    category: "foundations", tags: ["house", "succedent", "taboo"],
    summary: "The Eighth House rules the threshold — death, sexuality, inheritance, and the resources you share with others. It is where the ego is most threatened, most tested, and ultimately transformed into something that cannot be taken away.",
    chartKeys: [{ type: "house", number: 8 }],
    relatedSlugs: ["sign-scorpio", "planet-pluto", "planet-mars"],
    promptHint: "8th house: death and rebirth, shared finances, sexuality, occult and hidden matters, legacies and inheritance, transformation through crisis.",
  },
  {
    slug: "house-9th", title: "The Ninth House", subtitle: "Philosophy · Higher Learning · The Divine",
    category: "foundations", tags: ["house", "cadent", "belief"],
    summary: "The Ninth House is where you reach for meaning — through religion, philosophy, long journeys, higher education, and the vast literature of human wisdom. It describes your worldview and what you believe in enough to build your life around.",
    chartKeys: [{ type: "house", number: 9 }],
    relatedSlugs: ["sign-sagittarius", "planet-jupiter"],
    promptHint: "9th house: philosophy and religion, higher education, long travel, publishing, foreigners, the law, the guru, the 9th as the most fortunate cadent house.",
  },
  {
    slug: "house-10th", title: "The Tenth House", subtitle: "Career · Public Life · Legacy",
    category: "foundations", tags: ["house", "angular", "career"],
    summary: "The Tenth House is the highest point of the chart — the public role, the career, the reputation, and the legacy you leave behind. Planets here are visible to the world and describe how you are known, what you build, and the mark you leave.",
    chartKeys: [{ type: "house", number: 10 }],
    relatedSlugs: ["sign-capricorn", "planet-saturn", "vedic-varga-d10"],
    promptHint: "10th house: career, social status, fame, the MC angle (Medium Coeli), authority and ambition, the most elevated planets, Dasamsha D10 in Jyotish.",
  },
  {
    slug: "house-11th", title: "The Eleventh House", subtitle: "Community · Hopes · Networks",
    category: "foundations", tags: ["house", "succedent", "social"],
    summary: "The Eleventh House governs the collective — friends, groups, networks, social movements, and the hopes you hold for the future. It is where individual creativity (5th house) meets the collective response, and where you find your tribe.",
    chartKeys: [{ type: "house", number: 11 }],
    relatedSlugs: ["sign-aquarius", "planet-saturn", "planet-uranus"],
    promptHint: "11th house: friends and allies, hopes and wishes, social groups and networks, gains from career, the joy of Jupiter's natural house, community and collective purpose.",
  },
  {
    slug: "house-12th", title: "The Twelfth House", subtitle: "Hidden · Isolation · Liberation",
    category: "foundations", tags: ["house", "cadent", "spiritual"],
    summary: "The Twelfth House is the place beyond — the unconscious, hidden enemies, isolation, institutions, and ultimately the dissolution of the self into something greater. Planets here operate behind the scenes, accumulating power in secrecy before breaking through.",
    chartKeys: [{ type: "house", number: 12 }],
    relatedSlugs: ["sign-pisces", "planet-neptune", "planet-jupiter"],
    promptHint: "12th house: hidden matters, isolation, retreat, large institutions, undoing and self-undoing, secret enemies, the unconscious, moksha in Jyotish, spiritual liberation.",
  },

  // ─── HELLENISTIC ─────────────────────────────────────────────────────────────

  {
    slug: "hellenistic-sect", title: "Sect", subtitle: "Day Chart · Night Chart · The Fundamental Divide",
    category: "hellenistic", tags: ["hellenistic", "sect", "fundamentals"],
    summary: "Sect is one of the most important distinctions in traditional astrology. Whether you were born during the day or night determines which planets are empowered and which are constrained — it is the first lens through which a classical astrologer reads a chart.",
    chartKeys: [{ type: "technique", key: "sect" }],
    relatedSlugs: ["planet-sun", "planet-moon", "planet-saturn", "planet-jupiter", "planet-mars"],
    promptHint: "Sect: diurnal (day) vs. nocturnal (night) chart, sect luminaries (Sun for day, Moon for night), sect benefics (Jupiter day, Venus night), sect malefics (Saturn day, Mars night), how sect modifies planetary strength.",
  },
  {
    slug: "hellenistic-lot-fortune", title: "Lot of Fortune", subtitle: "☽ · Body · Material Circumstances",
    category: "hellenistic", tags: ["hellenistic", "lots", "arabic-parts"],
    summary: "The Lot of Fortune (Part of Fortune) is the most important of the seven Hermetic Lots — it marks where the Moon's cycle meets the horizon, describing your material circumstances, physical vitality, and the area of life where fortune flows most naturally.",
    chartKeys: [{ type: "planet", name: "Moon" }],
    relatedSlugs: ["hellenistic-lot-spirit", "hellenistic-sect", "planet-moon"],
    promptHint: "Lot of Fortune: ASC + Moon - Sun (day) / ASC + Sun - Moon (night), body and material lot, the lunar principle externalized, house placement significance, ruler of Fortune as material significator.",
  },
  {
    slug: "hellenistic-lot-spirit", title: "Lot of Spirit", subtitle: "☉ · Soul · Deliberate Action",
    category: "hellenistic", tags: ["hellenistic", "lots", "arabic-parts"],
    summary: "The Lot of Spirit is the complement to Fortune — where Fortune describes what happens to you, Spirit describes what you intentionally do. It governs the soul's agency, reputation, and the deliberate choices that shape a life.",
    chartKeys: [{ type: "planet", name: "Sun" }],
    relatedSlugs: ["hellenistic-lot-fortune", "hellenistic-sect", "planet-sun"],
    promptHint: "Lot of Spirit: ASC + Sun - Moon (day) / ASC + Moon - Sun (night), the solar principle externalized, deliberate action and reputation, profession and soul's purpose, ruler of Spirit as spiritual significator.",
  },
  {
    slug: "hellenistic-profections", title: "Annual Profections", subtitle: "One House Per Year · Age-Based Timing",
    category: "hellenistic", tags: ["hellenistic", "timing", "annual"],
    summary: "Annual profections are one of the simplest and most reliable timing tools in traditional astrology. Each year of your life corresponds to one house of your natal chart, cycling from the 1st house at age 0, activating a new house and its ruling planet every birthday.",
    chartKeys: [{ type: "technique", key: "currentDasha" }],
    relatedSlugs: ["hellenistic-sect", "timing-solar-return", "hellenistic-releasing"],
    promptHint: "Annual profections: 12-year cycle, each birthday activates the next house, the Lord of the Year (planet ruling the profected sign) becomes the annual timer, how to find your current profection year by age mod 12.",
  },
  {
    slug: "hellenistic-releasing", title: "Zodiacal Releasing", subtitle: "Planetary Periods · Life Chapters",
    category: "hellenistic", tags: ["hellenistic", "timing", "periods"],
    summary: "Zodiacal Releasing is one of the most sophisticated timing systems in all of astrology — a nested cycle of planetary periods derived from the Lots, mapping the major chapters, peak periods, and quiet seasons of a life with remarkable precision.",
    chartKeys: [{ type: "technique", key: "currentDasha" }],
    relatedSlugs: ["hellenistic-lot-fortune", "hellenistic-lot-spirit", "hellenistic-profections"],
    promptHint: "Zodiacal releasing: from Lot of Fortune (material life) and Lot of Spirit (agency), Level 1 periods (major eras), Level 2 subperiods, loosings of the bond as peak activation periods, 129-year Taurus-Scorpio cycle.",
  },
  {
    slug: "hellenistic-dignities", title: "Essential Dignities", subtitle: "Domicile · Exaltation · Detriment · Fall",
    category: "hellenistic", tags: ["hellenistic", "strength", "fundamentals"],
    summary: "Essential dignities describe the relative power and comfort of a planet in any given sign. A planet in its domicile or exaltation is strong and effective; a planet in detriment or fall is weakened, operating outside its natural environment.",
    chartKeys: [],
    relatedSlugs: ["hellenistic-sect", "planet-sun", "planet-moon"],
    promptHint: "Essential dignities: domicile (home sign), exaltation (sign of honor), detriment (opposite domicile), fall (opposite exaltation), triplicity lords, bounds/terms, face/decan, how dignity modifies interpretation.",
  },

  // ─── TIMING SYSTEMS ─────────────────────────────────────────────────────────

  {
    slug: "timing-firdaria", title: "Firdaria", subtitle: "Medieval Persian · 75-Year Planetary Cycle",
    category: "timing", tags: ["timing", "periods", "medieval", "persian"],
    summary: "Firdaria is a medieval Arabic–Persian period system that assigns each planet a major reign of years over the course of your life. Like the Vimshottari dasha, it maps which planetary energy governs each chapter — but through the lens of Islamic-era tradition, with distinct sequences for day and night charts.",
    chartKeys: [{ type: "technique", key: "currentFirdaria" }],
    relatedSlugs: ["hellenistic-sect", "hellenistic-releasing", "vedic-vimshottari-dasha"],
    promptHint: "Firdaria: 75-year cycle, day chart order (Sun 10y, Venus 8, Mercury 13, Moon 9, Saturn 11, Jupiter 12, Mars 7, North Node 3, South Node 2), night chart reverses luminaries, sub-periods within each major period.",
  },
  {
    slug: "timing-progressions", title: "Secondary Progressions", subtitle: "One Day = One Year · Symbolic Maturation",
    category: "timing", tags: ["timing", "progressions", "symbolic"],
    summary: "Secondary progressions advance your natal chart one day for every year of your life — a poetic symbolic system where the first day after your birth represents your first year, the second day your second year, and so on. They reveal the slow inner development of the soul.",
    chartKeys: [{ type: "technique", key: "progressions" }],
    relatedSlugs: ["timing-solar-arc", "timing-solar-return", "planet-sun", "planet-moon"],
    promptHint: "Secondary progressions: 1 day = 1 year, progressed Sun changes sign roughly every 30 years, progressed Moon 2.5 years per sign, progressed New Moon as major life chapters, lunation cycle as development arc.",
  },
  {
    slug: "timing-solar-arc", title: "Solar Arc Directions", subtitle: "All Planets Move Together · Year by Degree",
    category: "timing", tags: ["timing", "directions", "solar-arc"],
    summary: "Solar arc directions move every planet in your chart forward by the same amount — the degree the Sun has progressed since your birth. This creates a chart where all planets advance in lockstep, revealing the simultaneous maturation of all life themes at once.",
    chartKeys: [{ type: "technique", key: "progressions" }],
    relatedSlugs: ["timing-progressions", "planet-sun"],
    promptHint: "Solar arc: all planets advance by the same arc (roughly 1° per year), solar arc hits to natal angles as major life events, the uniformity of solar arc vs. the individuality of secondary progressions.",
  },
  {
    slug: "timing-solar-return", title: "Solar Return", subtitle: "Annual Birthday Chart · The Year Ahead",
    category: "timing", tags: ["timing", "annual", "returns"],
    summary: "The Solar Return chart is cast for the exact moment the Sun returns to its natal position each year — your cosmic birthday. It maps the major themes, opportunities, and challenges of the coming year, overlaid on your natal chart.",
    chartKeys: [{ type: "technique", key: "solarReturn" }],
    relatedSlugs: ["planet-sun", "hellenistic-profections", "timing-progressions"],
    promptHint: "Solar return: annual chart cast for Sun's return to natal degree, SR ascendant as the year's dominant theme, SR planets overlaid on natal houses, location of return and its effect, how to read SR in conjunction with profections.",
  },
  {
    slug: "timing-transits", title: "Transits", subtitle: "Current Planetary Positions · Real-Time Triggers",
    category: "timing", tags: ["timing", "transits", "daily"],
    summary: "Transits are the ongoing movements of planets through the sky as they form angles to your natal positions. They are the most immediate timing tool — the daily weather of your cosmic life, ranging from brief Moon transits lasting hours to outer planet conjunctions lasting years.",
    chartKeys: [{ type: "technique", key: "currentDasha" }],
    relatedSlugs: ["planet-saturn", "planet-jupiter", "planet-pluto", "timing-solar-return"],
    promptHint: "Transits: current planets aspecting natal positions, orbs and duration, slow planets (Saturn, Pluto) as major life turners, fast planets as daily weather, how transits trigger natal potential.",
  },

  // ─── VEDIC / JYOTISH ─────────────────────────────────────────────────────────

  {
    slug: "vedic-nakshatra", title: "Nakshatras", subtitle: "27 Lunar Mansions · The Soul's Address",
    category: "vedic", tags: ["vedic", "nakshatra", "lunar-mansion"],
    summary: "The 27 nakshatras divide the zodiac into 13°20′ segments, each with its own deity, quality, and mythological story. Your Moon's nakshatra is considered your soul's deepest fingerprint in Vedic astrology — more revealing than the Sun sign.",
    chartKeys: [{ type: "planet", name: "Moon" }, { type: "planet", name: "Sun" }, { type: "planet", name: "NorthNode" }],
    relatedSlugs: ["vedic-vimshottari-dasha", "vedic-pada", "vedic-lagna"],
    promptHint: "Nakshatras: 27 divisions of 13°20′ each, lunar mansions correlating to Vimshottari dasha lords, each nakshatra has deity, symbol, nature, and motivation (Dharma/Artha/Kama/Moksha), janma nakshatra as birth star.",
  },
  {
    slug: "vedic-pada", title: "Nakshatra Padas", subtitle: "4 Quarters · 108 Cosmic Cells",
    category: "vedic", tags: ["vedic", "nakshatra", "pada"],
    summary: "Each of the 27 nakshatras is divided into 4 padas (quarters) of 3°20′ each, creating 108 cosmic cells that correlate to the Navamsha chart. The pada shows the specific flavor within a nakshatra and maps directly to a zodiac sign in the D9.",
    chartKeys: [{ type: "planet", name: "Moon" }, { type: "planet", name: "Sun" }],
    relatedSlugs: ["vedic-nakshatra", "vedic-varga-d9"],
    promptHint: "Nakshatra padas: 4 quarters of 3°20′ each, 27 × 4 = 108 padas corresponding to the 108 Navamsha positions, each pada ruled by a sign (fire→Aries, earth→Taurus, air→Gemini, water→Cancer cycling), Pushkara Navamshas as blessed padas.",
  },
  {
    slug: "vedic-lagna", title: "Lagna — The Ascendant", subtitle: "Sidereal Rising Sign · The Body in Space",
    category: "vedic", tags: ["vedic", "lagna", "ascendant"],
    summary: "The Lagna is the sidereal ascendant in Jyotish — the sign rising on the eastern horizon at birth, computed against the fixed stars using the Lahiri ayanamsa. It is the most important single point in a Vedic chart, defining the entire house system and the native's bodily constitution.",
    chartKeys: [{ type: "technique", key: "sect" }],
    relatedSlugs: ["vedic-nakshatra", "vedic-varga-d9", "hellenistic-dignities"],
    promptHint: "Lagna: sidereal rising sign, differs from tropical by ~24°, Lagna lord as chart ruler and life significator, Lagna nakshatra as body's fingerprint, angular houses (kendras) counted from Lagna.",
  },
  {
    slug: "vedic-vimshottari-dasha", title: "Vimshottari Dasha", subtitle: "120-Year Planetary Periods · The Life Map",
    category: "vedic", tags: ["vedic", "dasha", "timing"],
    summary: "Vimshottari Dasha is the most widely used timing system in Jyotish — a 120-year cycle of planetary periods determined by the Moon's nakshatra at birth. Each planet rules a major dasha period, and within it, a series of antardasha sub-periods that fine-tune the timing.",
    chartKeys: [{ type: "technique", key: "currentDasha" }],
    relatedSlugs: ["vedic-nakshatra", "vedic-antardasha", "timing-firdaria"],
    promptHint: "Vimshottari Dasha: 120-year cycle, order Ketu(7) Venus(20) Sun(6) Moon(10) Mars(7) Rahu(18) Jupiter(16) Saturn(19) Mercury(17), starting balance determined by Moon's position in nakshatra, dasha lord activates natal promise.",
  },
  {
    slug: "vedic-antardasha", title: "Antardasha", subtitle: "Sub-Periods · The Fine-Tuning of Destiny",
    category: "vedic", tags: ["vedic", "dasha", "timing"],
    summary: "Within each major dasha period, nine antardasha sub-periods cycle through all nine planetary lords in sequence. The antardasha lord modifies and colors the major dasha's themes — bringing its own nature to the fore within the larger chapter.",
    chartKeys: [{ type: "technique", key: "currentDasha" }],
    relatedSlugs: ["vedic-vimshottari-dasha", "vedic-nakshatra"],
    promptHint: "Antardasha: sub-period within a dasha, duration = (sub-ruler years / 120) × major period, antardasha lord aspects and placements modify the dasha promise, pratyantar dasha (sub-sub-periods) for even finer timing.",
  },
  {
    slug: "vedic-chara-karakas", title: "Jaimini Chara Karakas", subtitle: "Soul Significators · Ranked by Degree",
    category: "vedic", tags: ["vedic", "jaimini", "karakas"],
    summary: "The Jaimini Chara Karakas are seven (or eight) planetary significators ranked by their degree within their sign. The planet with the highest degree becomes the Atmakaraka — the soul significator — and holds the most revelatory position in the entire chart for questions of purpose and destiny.",
    chartKeys: [{ type: "technique", key: "ak" }],
    relatedSlugs: ["vedic-atmakaraka", "vedic-varga-d9"],
    promptHint: "Jaimini Chara Karakas: 7 planets ranked by degree within sign (highest to lowest) → AK Atmakaraka, AmK Amatyakaraka, BK Bhratrikaraka, MK Matrikaraka, PK Pitrikaraka, GK Gnatikaraka, DK Darakaraka. Rahu uses 30° - degree.",
  },
  {
    slug: "vedic-atmakaraka", title: "Atmakaraka (AK)", subtitle: "Soul's Planet · The Deepest Significator",
    category: "vedic", tags: ["vedic", "jaimini", "karakas", "soul"],
    summary: "The Atmakaraka is the planet with the highest degree in its sign across the chart — the soul's significator, showing the deepest desire the soul carries into this incarnation. Its placement, nakshatra, and navamsha position are the most revealing factors for the soul's path.",
    chartKeys: [{ type: "technique", key: "ak" }],
    relatedSlugs: ["vedic-chara-karakas", "vedic-varga-d9"],
    promptHint: "Atmakaraka: highest degree planet = soul ruler, its sign and house shows where the soul seeks fulfillment, AK in D9 Navamsha shows the soul's dharmic direction, AK's nakshatra as the soul's deepest nature.",
  },
  {
    slug: "vedic-varga-d9", title: "Navamsha (D9)", subtitle: "The Soul Chart · Marriage & Inner Nature",
    category: "vedic", tags: ["vedic", "varga", "divisional", "navamsha"],
    summary: "The Navamsha is the most important divisional chart in Jyotish after the D1 natal chart — the soul chart that reveals inner nature, dharma, and the quality of partnerships. A strong D1 placement confirmed in D9 is fully empowered; a weak D9 undermines apparent strength.",
    chartKeys: [{ type: "technique", key: "ak" }],
    relatedSlugs: ["vedic-pada", "vedic-chara-karakas", "vedic-varga-d10"],
    promptHint: "Navamsha D9: 9 divisions of each sign (3°20′), trikonastha calculation rule (fire→Aries, earth→Capricorn, air→Libra, water→Cancer), Pushkara Navamsha as specially fortunate, Vargottama when D1 and D9 sign match.",
  },
  {
    slug: "vedic-varga-d10", title: "Dasamsha (D10)", subtitle: "Career Chart · Public Achievement",
    category: "vedic", tags: ["vedic", "varga", "divisional", "career"],
    summary: "The Dasamsha is the chart of career and public achievement in Jyotish. The 10th house in D1 shows the native's calling; the D10 Lagna and its ruler reveal the specific arena of professional life and the quality of recognition the native receives.",
    chartKeys: [{ type: "house", number: 10 }],
    relatedSlugs: ["house-10th", "vedic-varga-d9", "planet-saturn"],
    promptHint: "Dasamsha D10: 10 divisions of 3° each, general Parashari formula, D10 Lagna lord as career significator, planets in D10 1st/10th houses as career activators, how D10 confirms or contradicts D1 10th house.",
  },
  {
    slug: "vedic-rahu-ketu", title: "Rahu & Ketu", subtitle: "☊ ☋ · The Lunar Nodes · Karma's Axis",
    category: "vedic", tags: ["vedic", "nodes", "karma"],
    summary: "Rahu (North Node) and Ketu (South Node) are the shadow planets of Vedic astrology — always exactly opposite each other, they mark the axis of karmic evolution. Rahu hungers for the new and unexperienced; Ketu has mastered and must release.",
    chartKeys: [{ type: "planet", name: "NorthNode" }],
    relatedSlugs: ["vedic-vimshottari-dasha", "vedic-chara-karakas"],
    promptHint: "Rahu: obsession, materialism, foreign influence, the dragon's head, amplifies the sign/house it occupies. Ketu: spirituality, liberation, past-life mastery, the dragon's tail. Rahu dasha (18 years) as major worldly ambition period.",
  },
  {
    slug: "vedic-ayanamsa", title: "Ayanamsa & Sidereal Zodiac", subtitle: "The Zodiac's Precession · Lahiri vs. Tropical",
    category: "vedic", tags: ["vedic", "sidereal", "ayanamsa", "fundamentals"],
    summary: "The ayanamsa is the degree of separation between the tropical and sidereal zodiacs — currently about 24°. Vedic astrology uses the sidereal zodiac (fixed against the stars), while Western astrology uses the tropical zodiac (fixed to the equinoxes). Your sidereal placements are typically 1–2 signs earlier than your tropical ones.",
    chartKeys: [{ type: "technique", key: "sect" }],
    relatedSlugs: ["vedic-lagna", "vedic-nakshatra"],
    promptHint: "Ayanamsa: precession of the equinoxes, currently ~24°, Lahiri (Chitrapaksha) as the official Indian government standard, different schools use different ayanamsas, tropical vs. sidereal practical difference in chart interpretation.",
  },

  // ─── ESOTERIC ────────────────────────────────────────────────────────────────

  {
    slug: "esoteric-arabic-parts", title: "Arabic Parts / Lots", subtitle: "Sensitive Points · Derived from Three Factors",
    category: "esoteric", tags: ["esoteric", "hellenistic", "arabic-parts"],
    summary: "The Arabic Parts (also called Hermetic Lots) are mathematical points derived from three chart factors — usually two planets plus the Ascendant. There are over 100 lots, each describing a specific life domain, with Fortune and Spirit being the most important.",
    chartKeys: [],
    relatedSlugs: ["hellenistic-lot-fortune", "hellenistic-lot-spirit"],
    promptHint: "Arabic parts: mathematical sensitive points, the seven Hermetic Lots (Fortune, Spirit, Necessity, Eros, Courage, Victory, Nemesis), Lot of Marriage, Lot of Children, how sect reversal works for night charts.",
  },
  {
    slug: "esoteric-fixed-stars", title: "Fixed Stars", subtitle: "Stellar Lore · Ancient Sky Markers",
    category: "esoteric", tags: ["esoteric", "fixed-stars"],
    summary: "Fixed stars are the background stars of the sky that conjunct sensitive points in the natal chart, adding specific archetypal flavors. Unlike planets, they barely move — a planet conjunct Algol, Regulus, or Aldebaran carries millennia of accumulated meaning.",
    chartKeys: [],
    relatedSlugs: ["planet-sun", "planet-moon", "house-10th"],
    promptHint: "Fixed stars: parans and conjunctions within 1°, the royal stars (Regulus, Aldebaran, Antares, Fomalhaut), malefic stars (Algol, Caput Algol), how fixed star conjunctions modify natal planetary meaning.",
  },
  {
    slug: "esoteric-out-of-bounds", title: "Out of Bounds Planets", subtitle: "Beyond the Sun's Declination · Wild Energy",
    category: "esoteric", tags: ["esoteric", "declination", "out-of-bounds"],
    summary: "A planet is Out of Bounds (OOB) when its declination exceeds the Sun's maximum of 23°27′. OOB planets operate beyond the Sun's reach — unconstrained, extreme, and often exceptional. They can indicate genius, transgression, or an energy that simply refuses to play by the rules.",
    chartKeys: [],
    relatedSlugs: ["planet-moon", "planet-mercury", "planet-venus"],
    promptHint: "Out of Bounds: declination beyond ±23°27′, Moon OOB as emotional extremes, Mercury OOB as unconventional thinking, Venus OOB as unusual relationships, historical peaks of OOB planets and their effects.",
  },
  {
    slug: "esoteric-antiscia", title: "Antiscia", subtitle: "Mirror Points · Solstice Axis Reflections",
    category: "esoteric", tags: ["esoteric", "antiscia", "mirror"],
    summary: "Antiscia are mirror-point positions reflected across the Cancer-Capricorn solstice axis. Two planets in antiscia — whose degrees add up to 30° in their respective signs — are in a secret conjunction, communicating across the chart in a hidden but powerful way.",
    chartKeys: [],
    relatedSlugs: ["hellenistic-sect"],
    promptHint: "Antiscia: reflection across 0° Cancer/0° Capricorn, antiscion formula (30 - sign degree in mirror sign), contra-antiscia (reflection across Aries/Libra equinox), how to find antiscia by sign pairs (Aries↔Pisces, Taurus↔Aquarius, Gemini↔Capricorn, Cancer↔Sagittarius, Leo↔Scorpio, Virgo↔Libra).",
  },
  {
    slug: "esoteric-sabian-symbols", title: "Sabian Symbols", subtitle: "360 Degrees · One Image Per Degree",
    category: "esoteric", tags: ["esoteric", "sabian", "degree-symbolism"],
    summary: "The Sabian Symbols are a set of 360 channeled images — one for each degree of the zodiac — created by clairvoyant Elsie Wheeler in 1925. Each natal planet's degree carries a specific symbolic image that adds poetic depth to its meaning in the chart.",
    chartKeys: [],
    relatedSlugs: ["planet-sun", "planet-moon", "house-1st"],
    promptHint: "Sabian symbols: 360 channeled images by Elsie Wheeler and Marc Edmund Jones (1925), how to find the symbol for any natal planet (round up to next degree), archetypal images and their interpretive keywords, using Sabians for depth not literalism.",
  },
];

export const ENTRIES_BY_SLUG = Object.fromEntries(
  AKASHIC_ENTRIES.map(e => [e.slug, e])
);

export const ENTRIES_BY_CATEGORY = AKASHIC_ENTRIES.reduce<Record<string, AkashicEntry[]>>(
  (acc, e) => { (acc[e.category] ??= []).push(e); return acc; },
  {}
);
```

- [ ] **Step 3: Create `src/lib/akashic/chart-context.ts`**

```typescript
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
          const asc = chart.ascendant;
          // Daytime if Sun longitude is within 180° above horizon (houses 7-12)
          const sunHouse = chart.houses.findIndex(h => sun.longitude >= h.cusp) + 1;
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
```

- [ ] **Step 4: Create `scripts/verify-akashic.ts`**

```typescript
import { AKASHIC_ENTRIES, ENTRIES_BY_SLUG } from "../src/lib/akashic/entries";
import { getEntryChartContext } from "../src/lib/akashic/chart-context";
import { calculateChart } from "../src/lib/astrology/calculator";
import { toSiderealChart, buildVimshottariDasha, buildCharaKarakas, lahiriAyanamsa } from "../src/lib/astrology/sidereal";

let failures = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else { failures++; console.log(`FAIL  ${name}  ${detail}`); }
}

// Entry integrity
assert("entry count >= 60", AKASHIC_ENTRIES.length >= 60, String(AKASHIC_ENTRIES.length));

const slugs = new Set(AKASHIC_ENTRIES.map(e => e.slug));
assert("all slugs unique", slugs.size === AKASHIC_ENTRIES.length);

for (const e of AKASHIC_ENTRIES) {
  assert(`entry ${e.slug}: has title`, e.title.length > 0);
  assert(`entry ${e.slug}: has summary`, e.summary.length > 40);
  assert(`entry ${e.slug}: has promptHint`, e.promptHint.length > 10);
  for (const rel of e.relatedSlugs) {
    assert(`entry ${e.slug}: relatedSlug '${rel}' exists`, slugs.has(rel), `missing: ${rel}`);
  }
}

assert("ENTRIES_BY_SLUG planet-sun", !!ENTRIES_BY_SLUG["planet-sun"]);
assert("ENTRIES_BY_SLUG house-10th", !!ENTRIES_BY_SLUG["house-10th"]);
assert("ENTRIES_BY_SLUG vedic-nakshatra", !!ENTRIES_BY_SLUG["vedic-nakshatra"]);

// Chart context
const chart = calculateChart({
  birthDate: "1990-06-15", birthTime: "08:30:00",
  latitude: 34.05, longitude: -118.24,
  timezone: "America/Los_Angeles", houseSystem: "whole_sign",
});
const birthDatetime = "1990-06-15T08:30:00Z";
const sidereal = toSiderealChart(chart, birthDatetime);
const ayanamsa = lahiriAyanamsa(new Date(birthDatetime));
const moonP = chart.planets.find(p => p.name === "Moon")!;
const moonSidereal = ((moonP.longitude - sidereal.ayanamsa) % 360 + 360) % 360;
const dasha = buildVimshottariDasha(moonSidereal, birthDatetime);
const karakas = buildCharaKarakas(chart, ayanamsa);

const sunEntry = ENTRIES_BY_SLUG["planet-sun"];
const sunCtx = getEntryChartContext(sunEntry, chart, sidereal, dasha, karakas);
assert("sun entry: hasRelevance", sunCtx.hasRelevance);
assert("sun entry: has 1 placement", sunCtx.placements.length === 1, String(sunCtx.placements.length));
assert("sun entry: placement has sign", sunCtx.placements[0].detail.includes("House"));

const ariesEntry = ENTRIES_BY_SLUG["sign-aries"];
const ariesCtx = getEntryChartContext(ariesEntry, chart, sidereal, dasha, karakas);
assert("aries sign entry: runs without crash", true);

const h10Entry = ENTRIES_BY_SLUG["house-10th"];
const h10Ctx = getEntryChartContext(h10Entry, chart, sidereal, dasha, karakas);
assert("10th house entry: has placements or house sign", h10Ctx.placements.length >= 1);

const dashaEntry = ENTRIES_BY_SLUG["vedic-vimshottari-dasha"];
const dashaCtx = getEntryChartContext(dashaEntry, chart, sidereal, dasha, karakas);
assert("dasha entry: currentDasha placement", dashaCtx.hasRelevance && dashaCtx.placements[0].label === "Current Dasha");

const akEntry = ENTRIES_BY_SLUG["vedic-atmakaraka"];
const akCtx = getEntryChartContext(akEntry, chart, sidereal, dasha, karakas);
assert("AK entry: hasRelevance", akCtx.hasRelevance);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 5: Run verification**

```
npx tsx scripts/verify-akashic.ts
```

Expected: `ALL PASS`

- [ ] **Step 6: Run build**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 7: Commit**

```bash
git add src/lib/akashic/ scripts/verify-akashic.ts
git commit -m "feat(akashic): add entries library + chart-context engine (60+ entries, verification passes)"
```

---

### Task 2: Akashic Records library home page

**Files:**
- Create: `src/app/dashboard/akashic/page.tsx`

**Interfaces consumed:**
```typescript
import { AKASHIC_ENTRIES } from "@/lib/akashic/entries";
import type { AkashicEntry, AkashicCategory } from "@/lib/akashic/types";
import { getEntryChartContext } from "@/lib/akashic/chart-context";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import { toSiderealChart, buildVimshottariDasha, buildCharaKarakas, lahiriAyanamsa } from "@/lib/astrology/sidereal";
```

**UI overview:**
- Header: "AKASHIC RECORDS" + subtitle
- Category filter pills: ALL · FOUNDATIONS · HELLENISTIC · TIMING · VEDIC · ESOTERIC
- Search bar (filters by title + tags + summary)
- Entry card grid (2 columns on desktop, 1 on mobile)
- Each card shows: title, subtitle, category badge, summary, "In Your Chart" badge if relevant

- [ ] **Step 1: Create `src/app/dashboard/akashic/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import { toSiderealChart, buildVimshottariDasha, buildCharaKarakas, lahiriAyanamsa } from "@/lib/astrology/sidereal";
import { AKASHIC_ENTRIES } from "@/lib/akashic/entries";
import { getEntryChartContext } from "@/lib/akashic/chart-context";
import type { AkashicEntry, AkashicCategory } from "@/lib/akashic/types";
import type { ChartData } from "@/lib/astrology/types";
import type { SiderealChart, VimshottariData, CharaKarakas } from "@/lib/astrology/sidereal";

const CAT_COLORS: Record<AkashicCategory, string> = {
  foundations: "#C8A55B",
  hellenistic:  "#a78bfa",
  timing:       "#f59e0b",
  vedic:        "#06b6d4",
  esoteric:     "#f472b6",
};
const CAT_LABELS: Record<AkashicCategory, string> = {
  foundations: "Foundations",
  hellenistic:  "Hellenistic",
  timing:       "Timing",
  vedic:        "Vedic",
  esoteric:     "Esoteric",
};
const ALL_CATS: AkashicCategory[] = ["foundations", "hellenistic", "timing", "vedic", "esoteric"];

function EntryCard({ entry, isRelevant, accentColor }: {
  entry: AkashicEntry; isRelevant: boolean; accentColor: string;
}) {
  return (
    <Link href={`/dashboard/akashic/${entry.slug}`} style={{ textDecoration: "none" }}>
      <motion.div
        whileHover={{ borderColor: accentColor + "55", y: -2 }}
        transition={{ duration: 0.15 }}
        style={{
          background: "rgba(10,15,35,0.6)",
          border: `1px solid ${isRelevant ? accentColor + "35" : "rgba(40,60,100,0.3)"}`,
          borderRadius: 12, padding: "14px 16px", cursor: "pointer",
          height: "100%", display: "flex", flexDirection: "column", gap: 8,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ color: "#C0D4FF", fontSize: 14, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.05em", fontWeight: 600 }}>
              {entry.title}
            </div>
            <div style={{ color: "#445577", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginTop: 2 }}>
              {entry.subtitle}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30`, borderRadius: 20, padding: "2px 8px", color: accentColor, fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              {CAT_LABELS[entry.category]}
            </span>
            {isRelevant && (
              <span style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 20, padding: "2px 8px", color: "#22c55e", fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                IN YOUR CHART
              </span>
            )}
          </div>
        </div>
        {/* Summary */}
        <p style={{ color: "#6677AA", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", lineHeight: 1.6, margin: 0, flex: 1 }}>
          {entry.summary.slice(0, 120)}…
        </p>
        {/* Tags */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {entry.tags.slice(0, 3).map(t => (
            <span key={t} style={{ color: "#334466", fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em" }}>
              #{t}
            </span>
          ))}
        </div>
      </motion.div>
    </Link>
  );
}

export default function AkashicPage() {
  const [chart, setChart]         = useState<ChartData | null>(null);
  const [sidereal, setSidereal]   = useState<SiderealChart | null>(null);
  const [dasha, setDasha]         = useState<VimshottariData | null>(null);
  const [karakas, setKarakas]     = useState<CharaKarakas | null>(null);
  const [query, setQuery]         = useState("");
  const [activecat, setActivecat] = useState<AkashicCategory | "all">("all");

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) return;
    const profile = getProfile(id);
    const c = getCachedChart(id);
    if (!profile || !c) return;
    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    const sc = toSiderealChart(c, birthDatetime);
    const ay = lahiriAyanamsa(new Date(birthDatetime));
    setChart(c);
    setSidereal(sc);
    const moonP = c.planets.find(p => p.name === "Moon");
    if (moonP) {
      const moonSidereal = ((moonP.longitude - sc.ayanamsa) % 360 + 360) % 360;
      setDasha(buildVimshottariDasha(moonSidereal, birthDatetime));
    }
    setKarakas(buildCharaKarakas(c, ay));
  }, []);

  const relevantSlugs = useMemo(() => {
    if (!chart) return new Set<string>();
    return new Set(
      AKASHIC_ENTRIES
        .filter(e => getEntryChartContext(e, chart, sidereal, dasha, karakas).hasRelevance)
        .map(e => e.slug)
    );
  }, [chart, sidereal, dasha, karakas]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return AKASHIC_ENTRIES.filter(e => {
      const catMatch = activecat === "all" || e.category === activecat;
      const textMatch = !q || e.title.toLowerCase().includes(q) || e.tags.some(t => t.includes(q)) || e.summary.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [query, activecat]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: "#C8A55B", borderRadius: 3, boxShadow: "0 0 10px #C8A55B" }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Akashic Records
              </h1>
              <span style={{ background: "rgba(200,165,91,0.12)", border: "1px solid rgba(200,165,91,0.35)", borderRadius: 20, padding: "3px 12px", color: "#C8A55B", fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em" }}>
                {AKASHIC_ENTRIES.length} ENTRIES
              </span>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              The cosmic library — every concept explained, every article personalized to your chart
            </p>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16, position: "relative" }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search concepts, techniques, planets…"
              style={{
                width: "100%", padding: "10px 14px 10px 38px",
                background: "rgba(10,15,35,0.7)", border: "1px solid rgba(40,60,100,0.4)",
                borderRadius: 10, color: "#C0D4FF", fontSize: 12,
                fontFamily: "'Fragment Mono', monospace", outline: "none", boxSizing: "border-box",
              }}
            />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#334466", fontSize: 14 }}>⊕</span>
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap" }}>
            <button onClick={() => setActivecat("all")} style={{
              padding: "5px 14px",
              background: activecat === "all" ? "rgba(200,165,91,0.15)" : "transparent",
              border: `1px solid ${activecat === "all" ? "rgba(200,165,91,0.4)" : "rgba(40,60,100,0.3)"}`,
              borderRadius: 20, color: activecat === "all" ? "#C8A55B" : "#445577",
              fontSize: 9, letterSpacing: "0.12em", fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
            }}>ALL</button>
            {ALL_CATS.map(cat => (
              <button key={cat} onClick={() => setActivecat(cat)} style={{
                padding: "5px 14px",
                background: activecat === cat ? `${CAT_COLORS[cat]}15` : "transparent",
                border: `1px solid ${activecat === cat ? CAT_COLORS[cat] + "40" : "rgba(40,60,100,0.3)"}`,
                borderRadius: 20, color: activecat === cat ? CAT_COLORS[cat] : "#445577",
                fontSize: 9, letterSpacing: "0.12em", fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}>
                {CAT_LABELS[cat].toUpperCase()} · {AKASHIC_ENTRIES.filter(e => e.category === cat).length}
              </button>
            ))}
          </div>

          {/* Entry count */}
          <p style={{ color: "#334466", fontSize: 9, fontFamily: "'Fragment Mono', monospace", marginBottom: 14, letterSpacing: "0.1em" }}>
            {filtered.length} ENTRIES{query ? ` FOR "${query.toUpperCase()}"` : ""}
            {chart ? ` · ${relevantSlugs.size} IN YOUR CHART` : ""}
          </p>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {filtered.map((e, i) => (
              <motion.div key={e.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}>
                <EntryCard entry={e} isRelevant={relevantSlugs.has(e.slug)} accentColor={CAT_COLORS[e.category]} />
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#334466", fontFamily: "'Fragment Mono', monospace", fontSize: 11 }}>
              No entries match &ldquo;{query}&rdquo;
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/akashic/page.tsx
git commit -m "feat(akashic): add library home page with search, category filter, and In Your Chart badges"
```

---

### Task 3: Article detail page with AI-generated body

**Files:**
- Create: `src/app/dashboard/akashic/[slug]/page.tsx`

**Interfaces consumed:** Same as Task 2 plus:
```typescript
import { ENTRIES_BY_SLUG } from "@/lib/akashic/entries";
import { useParams, useRouter } from "next/navigation";
// localStorage key for cached bodies: `cosmora_akashic_${slug}`
```

**AI body generation:** On mount, check localStorage. If not cached, POST to `/api/chat` with:
```
message: "Write a 300-word educational article about '[entry.title]' for the Akashic Records — a Cosmora astrology library. [entry.promptHint] Write in second person where helpful. No headers. Flowing prose. End with one memorable, poetic sentence."
history: []
persona: getOraclePersona()
```
Stream the response, cache to `localStorage` on completion.

**"Ask the Oracle" link:** Use Next.js `Link` to `/dashboard/oracle?q=Tell me about my ${entry.title} placement. ${context.headline}` — the Oracle page auto-fires queries from the `?q=` param.

- [ ] **Step 1: Create `src/app/dashboard/akashic/[slug]/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart, getOraclePersona } from "@/lib/storage";
import { toSiderealChart, buildVimshottariDasha, buildCharaKarakas, lahiriAyanamsa } from "@/lib/astrology/sidereal";
import { ENTRIES_BY_SLUG } from "@/lib/akashic/entries";
import { getEntryChartContext } from "@/lib/akashic/chart-context";
import type { AkashicEntry, AkashicCategory, EntryChartContext } from "@/lib/akashic/types";
import type { ChartData } from "@/lib/astrology/types";
import type { SiderealChart, VimshottariData, CharaKarakas } from "@/lib/astrology/sidereal";

const CAT_COLORS: Record<AkashicCategory, string> = {
  foundations: "#C8A55B",
  hellenistic:  "#a78bfa",
  timing:       "#f59e0b",
  vedic:        "#06b6d4",
  esoteric:     "#f472b6",
};
const CAT_LABELS: Record<AkashicCategory, string> = {
  foundations: "Foundations",
  hellenistic:  "Hellenistic",
  timing:       "Timing",
  vedic:        "Vedic",
  esoteric:     "Esoteric",
};

function cacheKey(slug: string) { return `cosmora_akashic_${slug}`; }

export default function AkashicArticlePage() {
  const params   = useParams<{ slug: string }>();
  const slug     = params?.slug ?? "";
  const entry    = ENTRIES_BY_SLUG[slug] as AkashicEntry | undefined;

  const [chart, setChart]         = useState<ChartData | null>(null);
  const [sidereal, setSidereal]   = useState<SiderealChart | null>(null);
  const [dasha, setDasha]         = useState<VimshottariData | null>(null);
  const [karakas, setKarakas]     = useState<CharaKarakas | null>(null);
  const [context, setContext]     = useState<EntryChartContext | null>(null);
  const [body, setBody]           = useState("");
  const [generating, setGenerating] = useState(false);

  // Load chart
  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) return;
    const profile = getProfile(id);
    const c = getCachedChart(id);
    if (!profile || !c) return;
    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    const sc = toSiderealChart(c, birthDatetime);
    const ay = lahiriAyanamsa(new Date(birthDatetime));
    setChart(c);
    setSidereal(sc);
    const moonP = c.planets.find(p => p.name === "Moon");
    if (moonP) {
      const moonSidereal = ((moonP.longitude - sc.ayanamsa) % 360 + 360) % 360;
      setDasha(buildVimshottariDasha(moonSidereal, birthDatetime));
    }
    setKarakas(buildCharaKarakas(c, ay));
  }, []);

  // Compute context once chart is loaded
  useEffect(() => {
    if (!entry || !chart) return;
    setContext(getEntryChartContext(entry, chart, sidereal, dasha, karakas));
  }, [entry, chart, sidereal, dasha, karakas]);

  // Generate or load cached body
  useEffect(() => {
    if (!entry) return;
    const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey(slug)) : null;
    if (cached) { setBody(cached); return; }

    const generate = async () => {
      setGenerating(true);
      const message = `Write a 300-word educational article about "${entry.title}" for the Akashic Records — a Cosmora astrology learning library. ${entry.promptHint} Write in second person where helpful ("when you have X..." or "if your Y is in Z..."). No headers or bullet points. Flowing prose only. End with one short, memorable, poetic sentence.`;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history: [], persona: getOraclePersona() }),
        });
        if (!res.ok || !res.body) { setGenerating(false); return; }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "", acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n"); buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") break;
            try { const p = JSON.parse(payload); if (p.text) { acc += p.text; setBody(acc); } } catch { /* skip */ }
          }
        }
        if (acc) localStorage.setItem(cacheKey(slug), acc);
      } catch { /* silent */ }
      setGenerating(false);
    };
    generate();
  }, [entry, slug]);

  if (!entry) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>ENTRY NOT FOUND</p>
          <Link href="/dashboard/akashic" style={{ color: "#445577", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>← Back to Library</Link>
        </div>
      </div>
    );
  }

  const accentColor = CAT_COLORS[entry.category];
  const oracleQ = context?.hasRelevance
    ? `Tell me more about ${entry.title} in my chart. ${context.headline}`
    : `Explain ${entry.title} and how it might show up in someone&apos;s chart.`;

  const related = entry.relatedSlugs.map(s => ENTRIES_BY_SLUG[s]).filter(Boolean);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Back */}
          <Link href="/dashboard/akashic" style={{ textDecoration: "none" }}>
            <button style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em", background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>
              ← AKASHIC RECORDS
            </button>
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30`, borderRadius: 20, padding: "3px 10px", color: accentColor, fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em" }}>
                {CAT_LABELS[entry.category].toUpperCase()}
              </span>
              {entry.tags.slice(0, 3).map(t => (
                <span key={t} style={{ color: "#334466", fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>#{t}</span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
              <div style={{ width: 4, height: 32, background: accentColor, borderRadius: 2, flexShrink: 0, marginTop: 4 }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 28, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, margin: 0 }}>{entry.title}</h1>
            </div>
            <p style={{ color: "#445577", fontSize: 11, fontFamily: "'Fragment Mono', monospace", paddingLeft: 16, marginBottom: 12 }}>{entry.subtitle}</p>
            <p style={{ color: "#8899BB", fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", lineHeight: 1.7, paddingLeft: 16 }}>{entry.summary}</p>
          </div>

          {/* In Your Chart */}
          {context?.hasRelevance && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: `${accentColor}0C`, border: `1px solid ${accentColor}30`, borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
              <p style={{ color: accentColor, fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>IN YOUR CHART</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {context.placements.map((pl, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: accentColor, flexShrink: 0 }} />
                    <span style={{ color: "#C0D4FF", fontSize: 12, fontFamily: "'Fragment Mono', monospace" }}>{pl.label}:</span>
                    <span style={{ color: "#8899BB", fontSize: 12, fontFamily: "'Fragment Mono', monospace" }}>{pl.detail}</span>
                    {pl.extra && <span style={{ color: "#445577", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>{pl.extra}</span>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(40,60,100,0.5), transparent)", marginBottom: 24 }} />

          {/* AI-generated body */}
          <div style={{ marginBottom: 28, minHeight: 120 }}>
            {body ? (
              <p style={{ color: "#A0B8D8", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                {body}
                {generating && (
                  <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                    style={{ display: "inline-block", width: 6, height: 13, background: accentColor, borderRadius: 1, marginLeft: 3, verticalAlign: "middle" }} />
                )}
              </p>
            ) : generating ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ width: 16, height: 16, border: `1.5px solid ${accentColor}`, borderTopColor: "transparent", borderRadius: "50%" }} />
                <span style={{ color: "#334466", fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em" }}>
                  READING THE AKASHIC FIELD…
                </span>
              </div>
            ) : null}
          </div>

          {/* Regenerate button */}
          {body && !generating && (
            <button
              onClick={() => {
                if (typeof window !== "undefined") localStorage.removeItem(cacheKey(slug));
                setBody("");
              }}
              style={{ color: "#334466", fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0 }}>
              ↻ REGENERATE
            </button>
          )}

          {/* Ask Oracle */}
          <Link href={`/dashboard/oracle?q=${encodeURIComponent(oracleQ)}`} style={{ textDecoration: "none" }}>
            <motion.div whileHover={{ borderColor: accentColor + "55" }} style={{
              background: `${accentColor}08`, border: `1px solid ${accentColor}25`,
              borderRadius: 12, padding: "14px 18px", marginBottom: 28,
              display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, #7B6FD4, #06b6d4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✦</div>
              <div>
                <p style={{ color: accentColor, fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", marginBottom: 3 }}>ASK THE ORACLE</p>
                <p style={{ color: "#6677AA", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                  {context?.hasRelevance ? context.headline : `Explore ${entry.title} in conversation`}
                </p>
              </div>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, color: "#334466", marginLeft: "auto", flexShrink: 0 }}>
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </Link>

          {/* Related entries */}
          {related.length > 0 && (
            <div>
              <p style={{ color: "#334466", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 12 }}>RELATED ENTRIES</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {related.map(rel => (
                  <Link key={rel.slug} href={`/dashboard/akashic/${rel.slug}`} style={{ textDecoration: "none" }}>
                    <motion.div whileHover={{ borderColor: "rgba(70,100,180,0.4)", x: 2 }} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      background: "rgba(10,15,35,0.5)", border: "1px solid rgba(40,60,100,0.25)", borderRadius: 9, cursor: "pointer",
                    }}>
                      <div>
                        <span style={{ color: "#C0D4FF", fontSize: 12, fontFamily: "'Fragment Mono', monospace" }}>{rel.title}</span>
                        <span style={{ color: "#334466", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginLeft: 8 }}>{rel.subtitle}</span>
                      </div>
                      <span style={{ color: "#334466", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginLeft: "auto", flexShrink: 0 }}>
                        {CAT_LABELS[rel.category]}
                      </span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/akashic/
git commit -m "feat(akashic): add article detail page with AI body generation, In Your Chart card, Ask Oracle link"
```

---

### Task 4: Sidebar nav item

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx`

Add the Akashic Records entry after the Oracle item (`href: "/dashboard/oracle"`). The sidebar uses an array of nav items with `label`, `hint`, `href`, and `icon` (inline SVG).

- [ ] **Step 1: Add the nav item to `src/components/dashboard/Sidebar.tsx`**

Find the Oracle nav item block:
```typescript
  {
    label: "Oracle",
    hint: "ai readings",
    href: "/dashboard/oracle",
    icon: (
      ...
    ),
  },
```

Insert immediately after it:
```typescript
  {
    label: "Akashic",
    hint: "cosmic library",
    href: "/dashboard/akashic",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h6M8 15h4" strokeOpacity="0.5" />
      </svg>
    ),
  },
```

- [ ] **Step 2: Run build**

```
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "feat(akashic): add Akashic Records to sidebar nav"
```

---

## Self-Review

**Spec coverage:**
- ✅ Searchable library with categories — Task 2 library home
- ✅ Every article knows the user's chart — Task 1 `getEntryChartContext` + Task 3 "In Your Chart" card
- ✅ AI-generated article bodies cached to localStorage — Task 3 SSE generation + localStorage
- ✅ "Ask the Oracle" from any article — Task 3 Link to `/dashboard/oracle?q=`
- ✅ Sidebar navigation — Task 4
- ✅ All astrological categories: planets, signs, houses, hellenistic, timing, vedic, esoteric — Task 1 entries.ts
- ✅ Regenerate button to clear cached body — Task 3

**Placeholder scan:** Clean — all code blocks complete, no TBD markers.

**Type consistency:**
- `AkashicEntry`, `ChartKey`, `EntryChartContext`, `PlacementContext` defined once in `types.ts`, used consistently across all tasks
- `ENTRIES_BY_SLUG` used by Task 3 article page — matches Task 1 export
- `getEntryChartContext` signature is identical in Task 1 (definition) and Tasks 2–3 (usage)
- `cacheKey(slug)` defined inline in Task 3 (not shared, single file — correct per YAGNI)
