import type { ChronicleData, LifeEvent, Person } from "./types";
import { validateEvent } from "./types";
import type { StoredProfile } from "@/lib/storage";

const KEY = (profileId: string) => `cosmora_chronicle_${profileId}`;

const EMPTY: ChronicleData = { schemaVersion: 1, events: [], people: [] };

export function getChronicle(profileId: string): ChronicleData {
  if (typeof window === "undefined" && typeof globalThis.localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(KEY(profileId));
    if (!raw) return { schemaVersion: 1, events: [], people: [] };
    return JSON.parse(raw) as ChronicleData;
  } catch { return { schemaVersion: 1, events: [], people: [] }; }
}

export function saveChronicle(profileId: string, data: ChronicleData): void {
  localStorage.setItem(KEY(profileId), JSON.stringify(data));
}

export function upsertEvent(profileId: string, event: LifeEvent): void {
  const data = getChronicle(profileId);
  const i = data.events.findIndex(e => e.id === event.id);
  if (i >= 0) data.events[i] = { ...event, updatedAt: new Date().toISOString() };
  else data.events.push(event);
  saveChronicle(profileId, data);
}

export function deleteEvent(profileId: string, eventId: string): void {
  const data = getChronicle(profileId);
  data.events = data.events.filter(e => e.id !== eventId);
  // remove dangling links to the deleted event
  for (const e of data.events) e.links = e.links.filter(l => l.eventId !== eventId);
  saveChronicle(profileId, data);
}

export function upsertPerson(profileId: string, person: Person): void {
  const data = getChronicle(profileId);
  const i = data.people.findIndex(p => p.id === person.id);
  if (i >= 0) data.people[i] = person;
  else data.people.push(person);
  saveChronicle(profileId, data);
}

export interface ChronicleExport {
  schemaVersion: 1;
  exportedAt: string;
  profile: { birthDate: string; birthTime: string; birthPlace: string; latitude: number; longitude: number; timezone: string };
  events: LifeEvent[];
  people: Person[];
}

export function exportChronicle(profileId: string, profile: StoredProfile): ChronicleExport {
  const data = getChronicle(profileId);
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: {
      birthDate: profile.birthDate, birthTime: profile.birthTime, birthPlace: profile.birthPlace,
      latitude: profile.latitude, longitude: profile.longitude, timezone: profile.timezone,
    },
    events: data.events,
    people: data.people,
  };
}

export function importChronicle(
  profileId: string,
  imported: ChronicleExport,
  strategy: "keep_local" | "take_imported",
): { added: number; conflicts: number; rejected: number } {
  if (imported.schemaVersion !== 1 || !Array.isArray(imported.events) || !Array.isArray(imported.people)) throw new Error("not a Chronicle export");
  const data = getChronicle(profileId);
  let added = 0, conflicts = 0;
  const mergeById = <T extends { id: string }>(local: T[], incoming: T[]): T[] => {
    const out = [...local];
    for (const item of incoming) {
      const i = out.findIndex(x => x.id === item.id);
      if (i < 0) { out.push(item); added++; }
      else { conflicts++; if (strategy === "take_imported") out[i] = item; }
    }
    return out;
  };
  const allIds = new Set([...data.events, ...imported.events].map(e => e.id));
  const validIncoming = imported.events.filter(e => validateEvent(e, allIds).length === 0);
  const rejected = imported.events.length - validIncoming.length;
  data.events = mergeById(data.events, validIncoming);
  data.people = mergeById(data.people, imported.people);
  saveChronicle(profileId, data);
  return { added, conflicts, rejected };
}
