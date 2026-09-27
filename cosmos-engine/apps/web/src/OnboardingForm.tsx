import { useState } from "react";
import { bootstrapTenant, bootstrapUser, createBirthProfile, createEvent } from "./api.js";

export interface OnboardingResult {
  tenantId: string;
  profileId: string;
  eventId: string;
}

export function OnboardingForm({ onComplete }: { onComplete: (result: OnboardingResult) => void }) {
  const [birthDate, setBirthDate] = useState("1991-04-23");
  const [timezone, setTimezone] = useState("America/Chicago");
  const [latitude, setLatitude] = useState("41.8781");
  const [longitude, setLongitude] = useState("-87.6298");
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("CareerStart");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const tenant = await bootstrapTenant(`web-demo-${Date.now()}`);
      const user = await bootstrapUser(tenant.id);
      const profile = await createBirthProfile(tenant.id, {
        userId: user.id,
        birthDate,
        timezone,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      const event = await createEvent(tenant.id, {
        ownerUserId: user.id,
        eventType,
        title: eventTitle,
        startsAt: new Date(eventStartsAt).toISOString(),
        timezone,
        sourceType: "manual",
      });
      onComplete({ tenantId: tenant.id, profileId: profile.id, eventId: event.id });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 420 }}>
      <h2>Birth profile</h2>
      <label>
        Birth date
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
      </label>
      <label>
        Timezone
        <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} required />
      </label>
      <label>
        Latitude
        <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
      </label>
      <label>
        Longitude
        <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
      </label>

      <h2>Life event</h2>
      <label>
        Title
        <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />
      </label>
      <label>
        Event type
        <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
          <option value="CareerStart">CareerStart</option>
          <option value="RelationshipStart">RelationshipStart</option>
          <option value="Move">Move</option>
          <option value="CreativeRelease">CreativeRelease</option>
        </select>
      </label>
      <label>
        Date and time
        <input type="datetime-local" value={eventStartsAt} onChange={(e) => setEventStartsAt(e.target.value)} required />
      </label>

      {error && <p style={{ color: "#e07a7a" }}>{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Entering the observatory..." : "Enter the observatory"}
      </button>
    </form>
  );
}
