import { getSupabase } from "./supabase";
import { getSession } from "./auth";
import { computeSkyState } from "@/lib/chronicle/sky-state";
import { generateId } from "@/lib/storage";
import type { LifeEvent } from "@/lib/chronicle/types";
import type { ChartData } from "@/lib/astrology/types";
import type { StoredProfile } from "@/lib/storage";

export const CONSENT_TEXT_VERSION = "2026-07-13.1";
const CONTRIBUTOR_KEY = "cosmora_research_contributor";

/** Random contributor id — stored locally only, never linked to the auth user in the corpus table. */
export function getContributorId(): string {
  let id = localStorage.getItem(CONTRIBUTOR_KEY);
  if (!id) {
    id = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : generateId();
    localStorage.setItem(CONTRIBUTOR_KEY, id);
  }
  return id;
}

export function valenceBucket(v: number): "negative" | "mixed" | "positive" {
  if (v <= -0.2) return "negative";
  if (v >= 0.2) return "positive";
  return "mixed";
}

export function intensityBucket(i: number): "low" | "medium" | "high" {
  if (i < 1 / 3) return "low";
  if (i < 2 / 3) return "medium";
  return "high";
}

export interface ResearchSignal {
  contributor_id: string;
  event_type: string;
  signature: string[];
  encoder_version: number;
  valence_bucket: string;
  intensity_bucket: string;
  date_precision: string;
  outcome: string | null;
}

/**
 * The anonymizer. Emits ONLY: type, signature tokens, encoder version, buckets, precision, outcome.
 * Never: narrative, title, names, people, location, dates, or birth data.
 */
export function stripEvent(e: LifeEvent, chart: ChartData, profile: StoredProfile): ResearchSignal {
  const state = computeSkyState(chart, profile, e.startsAt, e.datePrecision);
  const latestOutcome = [...e.reflections].reverse().find(r => r.outcomeConfirmation)?.outcomeConfirmation ?? null;
  return {
    contributor_id: getContributorId(),
    event_type: e.eventType,
    signature: state.signature,
    encoder_version: state.encoderVersion,
    valence_bucket: valenceBucket(e.emotionalValence),
    intensity_bucket: intensityBucket(e.emotionalIntensity),
    date_precision: e.datePrecision,
    outcome: latestOutcome,
  };
}

export async function setResearchOptIn(optIn: boolean): Promise<{ error?: string }> {
  const sb = getSupabase();
  const session = await getSession();
  if (!sb || !session) return { error: "Not signed in" };
  const { error } = await sb.from("consents").upsert([{
    user_id: session.user.id,
    research_opt_in: optIn,
    consent_text_version: CONSENT_TEXT_VERSION,
    updated_at: new Date().toISOString(),
  }]);
  return error ? { error: error.message } : {};
}

export async function getResearchOptIn(): Promise<boolean> {
  const sb = getSupabase();
  const session = await getSession();
  if (!sb || !session) return false;
  const { data } = await sb.from("consents").select("research_opt_in").eq("user_id", session.user.id).maybeSingle();
  return Boolean(data?.research_opt_in);
}

/** Contribute stripped signals for the given events. Returns rows inserted (0 on any failure — contribution is best-effort). */
export async function contributeSignals(events: LifeEvent[], chart: ChartData, profile: StoredProfile): Promise<number> {
  const sb = getSupabase();
  if (!sb || events.length === 0) return 0;
  if (!(await getResearchOptIn())) return 0;
  const rows = events.map(e => stripEvent(e, chart, profile));
  const { error } = await sb.from("research_signals").insert(rows);
  return error ? 0 : rows.length;
}
