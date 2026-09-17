# 02 — Canonical Ontology

## Purpose

This document defines what exists inside Cosmos. The ontology is the foundation for database design, graph relationships, AI prompts, rendering, and APIs.

## Root concept

Everything in Cosmos is an Object.

An Object can be physical, temporal, symbolic, narrative, computational, emotional, or probabilistic. Every Object has a stable ID, owner, type, provenance, timestamps, permissions, and optional embeddings.

## Object taxonomy

```text
CosmosObject
├── Actor
│   ├── User
│   ├── Person
│   ├── Organization
│   └── Agent
├── TimeObject
│   ├── Moment
│   ├── Period
│   ├── TransitWindow
│   └── LifeChapter
├── PlaceObject
│   ├── Location
│   ├── Home
│   ├── Workplace
│   └── AstrocartographyPoint
├── MemoryObject
│   ├── Event
│   ├── JournalEntry
│   ├── Dream
│   ├── Photo
│   ├── Video
│   ├── VoiceMemo
│   └── Document
├── SymbolObject
│   ├── Planet
│   ├── Sign
│   ├── House
│   ├── Aspect
│   ├── Antiscion
│   ├── ContraAntiscion
│   ├── Midpoint
│   ├── ArabicPart
│   ├── HarmonicPoint
│   └── FixedStar
├── MeaningObject
│   ├── Archetype
│   ├── Emotion
│   ├── Theme
│   ├── Lesson
│   └── Pattern
├── NarrativeObject
│   ├── Scene
│   ├── Act
│   ├── Script
│   ├── Trailer
│   ├── CharacterArc
│   └── Motif
└── ForecastObject
    ├── ProbabilityCloud
    ├── Scenario
    ├── Branch
    ├── Risk
    └── Opportunity
```

## Required object fields

Every object must have:

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "owner_user_id": "uuid",
  "object_type": "Event",
  "created_at": "2026-07-05T00:00:00Z",
  "updated_at": "2026-07-05T00:00:00Z",
  "visibility": "private|shared|aggregate_opt_in",
  "provenance": {
    "source": "manual|calendar|photo|agent|ephemeris|import",
    "source_id": "optional external id",
    "confidence": 1.0
  },
  "version": 1
}
```

## Event ontology

An Event is not just a timestamp. It is an observed state change in the user's life.

Event categories:

- Birth
- Death
- RelationshipStart
- RelationshipEnd
- Conflict
- Reconciliation
- CareerStart
- CareerEnd
- Promotion
- CreativeRelease
- Move
- Illness
- Recovery
- SpiritualExperience
- Dream
- LegalEvent
- FinancialEvent
- EducationEvent
- IdentityShift
- ParentingEvent
- Travel
- Unknown

## Meaning ontology

Meaning is stored as layered annotations, not as overwritten truth.

```json
{
  "meaning_layer": "emotional|astrological|narrative|psychological|statistical|user_defined",
  "label": "relationship crossroads",
  "confidence": 0.74,
  "evidence_object_ids": ["evt_123", "asp_456"],
  "created_by": "agent:symbolic_interpreter",
  "can_user_override": true
}
```

## Relationship ontology

Core relationship types:

- OCCURRED_AT
- OCCURRED_DURING
- INVOLVES
- LOCATED_AT
- ACTIVATES
- ASPECTS
- MIRRORS
- OPPOSES
- COMPLETES
- ECHOES
- CAUSED_BY
- FOLLOWS
- BELONGS_TO
- PART_OF
- DERIVED_FROM
- EVIDENCES
- PREDICTS_THEME
- CONTRADICTS
- SUPPORTS

## Provenance doctrine

No agent may create a permanent symbolic relationship without provenance. Every edge must know why it exists.

## Ontology acceptance criteria

- Any feature can express its objects using this taxonomy.
- Any agent output can cite object IDs and edge IDs.
- Any visualization node can trace back to canonical source.
- Any forecast can expose contributing objects and confidence.
