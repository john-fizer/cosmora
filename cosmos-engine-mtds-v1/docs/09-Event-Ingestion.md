# 09 — Event Ingestion

## Purpose

Define how life data enters Cosmos.

## Ingestion sources

- Manual event entry.
- Guided biography interview.
- Journal import.
- Calendar import.
- Photo metadata and captions.
- Voice memos.
- Documents.
- Health data.
- Location history.
- Social media archives.
- Music releases.
- Work history.
- Relationship timeline.

## Guided biography flow

The first onboarding should not ask for everything. It should build a usable initial graph.

Questions:

1. Birth data.
2. Current life chapter.
3. Top five turning points.
4. Major relationships.
5. Career timeline.
6. Moves and homes.
7. Children and family milestones.
8. Spiritual or identity shifts.
9. Health or crisis points.
10. Creative milestones.

## Event extraction from free text

Pipeline:

1. User provides narrative.
2. Extraction agent identifies candidate events.
3. Normalizer converts relative dates into ranges.
4. User confirms or edits events.
5. Event Service writes canonical records.
6. Astrology Engine computes sky context for each event.
7. Graph Projection creates connections.
8. Memory Service embeds text.

## Event confidence

- 1.0 exact timestamp confirmed.
- 0.8 exact date but approximate time.
- 0.6 month/year known.
- 0.4 approximate life period.
- 0.2 symbolic or uncertain memory.

## Event schema example

```json
{
  "event_type": "RelationshipCrisis",
  "title": "Major relationship rupture",
  "starts_at": "2024-06-01T00:00:00-05:00",
  "ends_at": "2024-08-01T00:00:00-05:00",
  "timezone": "America/Chicago",
  "confidence": 0.6,
  "emotional_valence": -0.8,
  "emotional_intensity": 0.95,
  "participants": ["person_partner"],
  "source_type": "guided_interview",
  "description": "User-described relationship rupture and uncertainty period."
}
```

## Media ingestion

Media files are not automatically interpreted as truth. They produce candidate objects:

- Detected date.
- Detected location.
- People suggestions.
- Caption suggestions.
- Emotional tone suggestions.

User confirms before major memory objects are created.

## Acceptance criteria

- Ingestion supports uncertain dates.
- User can correct every extracted event.
- Event confidence affects forecast confidence.
- Source provenance is mandatory.
- Imports can be disconnected and purged.
