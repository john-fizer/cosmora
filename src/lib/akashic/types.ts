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
