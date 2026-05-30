import type { ChartData } from "@/lib/astrology/types";

export interface StoredProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone: string;
  birthTimeConfidence: string;
  houseSystem: string;
  astrologyMode: string;
  createdAt: string;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

const PROFILES_KEY = "cosmora_profiles";
const ACTIVE_KEY   = "cosmora_active_profile";
const chartKey     = (id: string) => `cosmora_chart_${id}`;
const chatKey      = (id: string) => `cosmora_chat_${id}`;

// ── Profiles ─────────────────────────────────────────────────────────────────

export function listProfiles(): StoredProfile[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "[]"); } catch { return []; }
}

export function getProfile(id: string): StoredProfile | null {
  return listProfiles().find(p => p.id === id) ?? null;
}

export function saveProfile(profile: StoredProfile): void {
  const rest = listProfiles().filter(p => p.id !== profile.id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify([profile, ...rest]));
}

export function deleteProfile(id: string): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(listProfiles().filter(p => p.id !== id)));
  localStorage.removeItem(chartKey(id));
  localStorage.removeItem(chatKey(id));
  if (getActiveProfileId() === id) localStorage.removeItem(ACTIVE_KEY);
}

// ── Active profile ────────────────────────────────────────────────────────────

export function getActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

// ── Charts ────────────────────────────────────────────────────────────────────

export function getCachedChart(profileId: string): ChartData | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(chartKey(profileId)) ?? "null"); } catch { return null; }
}

export function setCachedChart(profileId: string, chart: ChartData): void {
  localStorage.setItem(chartKey(profileId), JSON.stringify(chart));
}

// ── Chat history ──────────────────────────────────────────────────────────────

export function getChatHistory(profileId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(chatKey(profileId)) ?? "[]"); } catch { return []; }
}

export function pushChatMessage(profileId: string, msg: ChatMessage): void {
  const history = getChatHistory(profileId);
  history.push(msg);
  if (history.length > 100) history.splice(0, history.length - 100);
  localStorage.setItem(chatKey(profileId), JSON.stringify(history));
}

export function clearChatHistory(profileId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(chatKey(profileId));
}

// ── Oracle model preference ───────────────────────────────────────────────────

const MODEL_KEY = "cosmora_oracle_model";

export function getOracleModel(): string {
  if (typeof window === "undefined") return "claude-opus-4-7";
  return localStorage.getItem(MODEL_KEY) ?? "claude-opus-4-7";
}

export function setOracleModel(modelId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_KEY, modelId);
}

// ── Oracle Memories ───────────────────────────────────────────────────────────

export type MemoryCategory = "insight" | "timing" | "relocation" | "relationship" | "warning" | "general";

export interface OracleMemory {
  id: string;
  profileId: string;
  title: string;
  content: string;
  category: MemoryCategory;
  createdAt: string;
  context?: string; // brief astrological context when saved
}

const memoriesKey = (id: string) => `cosmora_memories_${id}`;

export function getOracleMemories(profileId: string): OracleMemory[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(memoriesKey(profileId)) ?? "[]"); } catch { return []; }
}

export function saveOracleMemory(profileId: string, memory: Omit<OracleMemory, "id" | "profileId" | "createdAt">): OracleMemory {
  const full: OracleMemory = {
    ...memory,
    id: generateId(),
    profileId,
    createdAt: new Date().toISOString(),
  };
  const list = getOracleMemories(profileId);
  list.unshift(full);
  if (list.length > 200) list.splice(200);
  localStorage.setItem(memoriesKey(profileId), JSON.stringify(list));
  return full;
}

export function deleteOracleMemory(profileId: string, memoryId: string): void {
  const list = getOracleMemories(profileId).filter(m => m.id !== memoryId);
  localStorage.setItem(memoriesKey(profileId), JSON.stringify(list));
}

export function updateOracleMemory(profileId: string, memoryId: string, patch: Partial<Pick<OracleMemory, "title" | "category" | "context">>): void {
  const list = getOracleMemories(profileId).map(m => m.id === memoryId ? { ...m, ...patch } : m);
  localStorage.setItem(memoriesKey(profileId), JSON.stringify(list));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
