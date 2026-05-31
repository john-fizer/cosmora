// ─── Report system types ───────────────────────────────────────────────────────

export type ReportType =
  | "natal_delineation"
  | "life_pivots"
  | "past_lives"
  | "love_life"
  | "vocation"
  | "solar_return"
  | "saturn_return";

export interface ReportTypeMeta {
  id: ReportType;
  title: string;
  subtitle: string;
  description: string;
  techniques: string[];
  expiryDays: number;         // how long predictions are valid
  estimatedMinutes: number;   // generation time estimate
  icon: string;               // unicode glyph
  color: string;              // accent hex
}

export const REPORT_TYPES: ReportTypeMeta[] = [
  {
    id: "natal_delineation",
    title: "Natal Delineation",
    subtitle: "The Complete Chart Reading",
    description: "A comprehensive analysis of your natal blueprint — every planet, house, and aspect decoded through classical and modern synthesis. The foundational document of your cosmic intelligence file.",
    techniques: ["Sun sign & house", "Moon & emotional patterns", "Rising & persona", "Stellia & concentrations", "Dominant element/mode", "Chart ruler analysis", "Aspect matrix"],
    expiryDays: 3650, // natal chart doesn't expire
    estimatedMinutes: 3,
    icon: "◉",
    color: "#C8A55B",
  },
  {
    id: "life_pivots",
    title: "Loosening of Bonds",
    subtitle: "Pivotal Moments & Turning Points",
    description: "Where your life is being renegotiated. Identifies the exact doors opening and closing — through progressions, eclipses, outer planet transits, and profection activations converging now.",
    techniques: ["Progressed Sun & Moon", "Outer planet transits", "Eclipse activation", "Annual profection", "Solar arc directions", "Saturn major aspects"],
    expiryDays: 365,
    estimatedMinutes: 4,
    icon: "⟳",
    color: "#FF7B54",
  },
  {
    id: "past_lives",
    title: "Past Lives & Karma",
    subtitle: "The Soul's Prior Contracts",
    description: "What your soul carried forward. South Node patterns, 12th house signatures, karmic Saturn, and intercepted signs reveal the debts being settled and the gifts already earned.",
    techniques: ["South Node lineage", "12th house excavation", "Saturn's karmic role", "Chiron wound & gift", "Intercepted signs", "Retrograde patterns"],
    expiryDays: 3650,
    estimatedMinutes: 3,
    icon: "✦",
    color: "#9B7FD4",
  },
  {
    id: "love_life",
    title: "Love Life",
    subtitle: "Relationships, Desire & Intimacy",
    description: "Your relational architecture — what you attract, what you need, what patterns repeat. Covers Venus, the 5th, 7th, and 8th houses, and current timing activations in your love sphere.",
    techniques: ["Venus natal analysis", "5th house pleasures", "7th house partnerships", "8th house intimacy", "Current love transits", "Juno & commitment"],
    expiryDays: 180,
    estimatedMinutes: 3,
    icon: "♡",
    color: "#FF71D1",
  },
  {
    id: "vocation",
    title: "Vocation & Calling",
    subtitle: "Purpose, Career & Wealth",
    description: "What you were built to do and how to monetize it. MC, North Node, Saturn, Jupiter, and the 2nd, 6th, and 10th houses analyzed together to reveal your highest professional expression.",
    techniques: ["MC & 10th house", "North Node calling", "Saturn's career role", "Jupiter expansion", "2nd house values", "6th house craft"],
    expiryDays: 730,
    estimatedMinutes: 3,
    icon: "◈",
    color: "#4488FF",
  },
  {
    id: "solar_return",
    title: "Solar Return",
    subtitle: "Your Year Ahead — Annual Forecast",
    description: "The chart cast for the moment the Sun returns to its exact natal degree — your astrological new year. Reveals the dominant themes, challenges, and opportunities of the next 12 months.",
    techniques: ["SR chart overview", "SR rising & persona", "SR planets overlay", "Monthly lunations", "SR house activations", "Timing windows"],
    expiryDays: 365,
    estimatedMinutes: 4,
    icon: "☀",
    color: "#FFD700",
  },
  {
    id: "saturn_return",
    title: "Saturn Return",
    subtitle: "The Great Restructuring",
    description: "The 29-year reckoning where Saturn returns to its natal position — dismantling what was built on borrowed foundation and consolidating what is truly yours. A defining life-phase report.",
    techniques: ["Natal Saturn placement", "SR house activation", "Life phase themes", "Opposition midpoint", "Karmic harvest", "Building the new structure"],
    expiryDays: 1095,
    estimatedMinutes: 4,
    icon: "♄",
    color: "#8899BB",
  },
];

// ─── Individual section of a generated report ──────────────────────────────────

export interface ReportSection {
  id: string;
  heading: string;
  subheading?: string;
  body: string;               // markdown prose
  confidence: number;         // 0.0 – 1.0
  technique: string;          // which agent produced this
  areaOfLife: string;
  timeWindow?: {
    label: string;            // e.g. "Next 6 months" | "Ongoing" | "Age 28–30"
    startDate?: string;       // ISO
    endDate?: string;         // ISO
  };
  convergenceCount: number;   // how many techniques agreed on this theme
}

// ─── A generated report ────────────────────────────────────────────────────────

export type ReportStatus = "generating" | "ready" | "expired" | "feedback_requested" | "feedback_given";

export interface Report {
  id: string;
  profileId: string;
  type: ReportType;
  title: string;
  subtitle: string;
  generatedAt: string;        // ISO
  expiresAt: string;          // ISO
  status: ReportStatus;
  sections: ReportSection[];
  overallConfidence: number;
  headline: string;           // 1–2 sentence synthesis lede
  techniquesSummary: string[]; // which techniques ran
  metadata: {
    birthDatetime: string;
    chartHash: string;        // to detect if chart changed
    modelId: string;
    generationMs: number;
  };
}

// ─── Feedback & training data ──────────────────────────────────────────────────

export type QualityFlag = "reliable" | "uncertain" | "possibly_sabotaged";

export interface SectionFeedback {
  sectionId: string;
  accuracy: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface ReportFeedback {
  id: string;
  reportId: string;
  profileId: string;
  submittedAt: string;
  sectionFeedback: SectionFeedback[];
  overallAccuracy: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  consentToTrain: boolean;
  qualityFlag: QualityFlag;
}

export interface TrainingEntry {
  id: string;
  feedbackId: string;
  reportType: ReportType;
  technique: string;
  sectionBody: string;
  accuracy: number;           // 1–5 as provided
  qualityFlag: QualityFlag;
  storedAt: string;
}
