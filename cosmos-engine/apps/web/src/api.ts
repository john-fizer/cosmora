const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function postJson(path: string, tenantId: string | null, body: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tenantId) {
    headers["x-tenant-id"] = tenantId;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${path} failed with ${response.status}: ${errorBody}`);
  }
  return response.json();
}

export async function bootstrapTenant(name: string): Promise<{ id: string }> {
  return postJson("/v1/tenants", null, { name });
}

export async function bootstrapUser(tenantId: string): Promise<{ id: string }> {
  return postJson("/v1/users", null, { tenantId });
}

export interface BirthProfileFormInput {
  userId: string;
  birthDate: string;
  birthTime?: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export async function createBirthProfile(
  tenantId: string,
  input: BirthProfileFormInput,
): Promise<{ id: string }> {
  return postJson("/v1/birth-profiles", tenantId, input);
}

export interface EventFormInput {
  ownerUserId: string;
  eventType: string;
  title: string;
  startsAt: string;
  timezone: string;
  sourceType: string;
}

export async function createEvent(tenantId: string, input: EventFormInput): Promise<{ id: string }> {
  return postJson("/v1/events", tenantId, input);
}

export interface ScenePayload {
  sceneId: string;
  timeWindow: { start: string; end: string };
  nodes: { id: string; type: "natal_planet" | "event"; x: number; y: number; z: number; label: string }[];
  edges: { id: string; from: string; to: string; type: string; weight: number }[];
  animations: unknown[];
  filters: { showMidpoints: boolean; showAntiscia: boolean; showForecasts: boolean };
}

export async function fetchScene(
  tenantId: string,
  profileId: string,
  eventId: string,
): Promise<ScenePayload> {
  const response = await fetch(
    `${API_BASE}/v1/observatory/scene?profile_id=${profileId}&event_id=${eventId}`,
    { headers: { "x-tenant-id": tenantId } },
  );
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`fetchScene failed with ${response.status}: ${errorBody}`);
  }
  return response.json();
}
