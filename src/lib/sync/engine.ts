import { getSupabase } from "./supabase";
import { getSession } from "./auth";
import { getChronicle, saveChronicle } from "@/lib/chronicle/storage";
import { getProfile } from "@/lib/storage";
import type { LifeEvent, ChronicleData } from "@/lib/chronicle/types";

export interface SyncItem {
  localId: string;
  updatedAt: string;   // ISO
  deleted?: boolean;
  payload: unknown;
}

/**
 * Last-write-wins merge. Winners = the union view both sides should converge to.
 * toPush = items where local is newer (or remote missing). toDeleteLocally = remote tombstones newer than local.
 */
export function mergeLWW(local: SyncItem[], remote: SyncItem[]): {
  winners: SyncItem[]; toPush: SyncItem[]; toDeleteLocally: string[];
} {
  const byId = new Map<string, { l?: SyncItem; r?: SyncItem }>();
  for (const l of local) byId.set(l.localId, { l });
  for (const r of remote) byId.set(r.localId, { ...(byId.get(r.localId) ?? {}), r });

  const winners: SyncItem[] = [];
  const toPush: SyncItem[] = [];
  const toDeleteLocally: string[] = [];

  for (const [id, { l, r }] of byId) {
    if (l && !r) { winners.push(l); toPush.push(l); continue; }
    if (r && !l) {
      // remote-only: tombstone means it was deleted elsewhere; live row should be pulled
      if (!r.deleted) winners.push(r);
      continue;
    }
    if (!l || !r) continue;
    const localNewer = l.updatedAt > r.updatedAt;
    if (localNewer) { winners.push(l); toPush.push(l); }
    else if (r.deleted) { toDeleteLocally.push(id); }
    else { winners.push(r); }
  }
  return { winners, toPush, toDeleteLocally };
}

const eventToItem = (e: LifeEvent): SyncItem => ({ localId: e.id, updatedAt: e.updatedAt, payload: e });

async function userId(): Promise<string | null> {
  const s = await getSession();
  return s?.user?.id ?? null;
}

export async function syncNow(profileId: string): Promise<{ pushed: number; pulled: number } | null> {
  const sb = getSupabase();
  const uid = await userId();
  if (!sb || !uid) return null;

  const localData = getChronicle(profileId);

  // ── events ──
  const { data: remoteEventsRaw } = await sb.from("chronicle_events")
    .select("local_event_id, payload, updated_at, deleted_at")
    .eq("local_profile_id", profileId);
  const remoteEvents: SyncItem[] = (remoteEventsRaw ?? []).map(r => ({
    localId: r.local_event_id as string,
    updatedAt: new Date(r.updated_at as string).toISOString(),
    deleted: r.deleted_at != null,
    payload: r.payload,
  }));
  const ev = mergeLWW(localData.events.map(eventToItem), remoteEvents);

  // ── people (no per-item updatedAt in schema; treat local as authoritative, push all, pull missing) ──
  const { data: remotePeopleRaw } = await sb.from("chronicle_people")
    .select("local_person_id, payload")
    .eq("local_profile_id", profileId)
    .is("deleted_at", null);
  const remotePeople = (remotePeopleRaw ?? []).map(r => r.payload as ChronicleData["people"][number]);
  const localPeopleIds = new Set(localData.people.map(p => p.id));
  const pulledPeople = remotePeople.filter(p => !localPeopleIds.has(p.id));

  // apply pulls locally
  const localEventIds = new Set(localData.events.map(e => e.id));
  const pulledEvents = ev.winners
    .filter(w => !localEventIds.has(w.localId) || localData.events.some(e => e.id === w.localId && e.updatedAt < w.updatedAt))
    .filter(w => !ev.toPush.includes(w))
    .map(w => w.payload as LifeEvent);
  const merged: ChronicleData = {
    schemaVersion: 1,
    events: [
      ...localData.events.filter(e => !ev.toDeleteLocally.includes(e.id) && !pulledEvents.some(p => p.id === e.id)),
      ...pulledEvents,
    ],
    people: [...localData.people, ...pulledPeople],
  };
  saveChronicle(profileId, merged);

  // push local winners
  if (ev.toPush.length > 0) {
    await sb.from("chronicle_events").upsert(
      ev.toPush.map(i => ({
        user_id: uid, local_event_id: i.localId, local_profile_id: profileId,
        payload: i.payload, updated_at: i.updatedAt, deleted_at: null,
      })),
      { onConflict: "user_id,local_event_id" },
    );
  }
  if (localData.people.length > 0) {
    await sb.from("chronicle_people").upsert(
      localData.people.map(p => ({
        user_id: uid, local_person_id: p.id, local_profile_id: profileId,
        payload: p, updated_at: new Date().toISOString(), deleted_at: null,
      })),
      { onConflict: "user_id,local_person_id" },
    );
  }

  // profile snapshot
  const profile = getProfile(profileId);
  if (profile) {
    await sb.from("birth_profiles").upsert(
      [{ user_id: uid, local_profile_id: profileId, payload: profile, updated_at: new Date().toISOString() }],
      { onConflict: "user_id,local_profile_id" },
    );
  }

  return { pushed: ev.toPush.length, pulled: pulledEvents.length + pulledPeople.length };
}

let timer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSync(profileId: string): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { void syncNow(profileId); }, 3000);
}

export async function pullAll(profileId: string): Promise<boolean> {
  const result = await syncNow(profileId);
  return (result?.pulled ?? 0) > 0;
}

export async function deleteCloudData(): Promise<{ error?: string }> {
  const sb = getSupabase();
  const uid = await userId();
  if (!sb || !uid) return { error: "Not signed in" };
  const tables = ["chronicle_events", "chronicle_people", "birth_profiles", "consents"];
  for (const t of tables) {
    const { error } = await sb.from(t).delete().eq("user_id", uid);
    if (error) return { error: `${t}: ${error.message}` };
  }
  return {};
}
