# 08 — Memory and Retrieval

## Purpose

Define long-term semantic memory, retrieval, context assembly, and provenance rules.

## Memory types

### Episodic memory

Specific events, moments, dreams, journal entries, conversations, media, and life transitions.

### Semantic memory

Facts about the user: preferences, beliefs, goals, recurring themes, relationships, values, skills, and constraints.

### Symbolic memory

Astrological signatures, archetypes, midpoints, mirror activations, aspects, timing windows, and discovered patterns.

### Narrative memory

Life chapters, character arcs, motifs, unresolved tensions, endings, beginnings, and scripts.

### Procedural memory

How the user likes outputs, how agents should communicate, accepted terminology, rejected interpretations, and product-building preferences.

## Retrieval pipeline

1. Receive task.
2. Determine required memory layers.
3. Apply tenant and consent filter.
4. Retrieve canonical objects by structured query.
5. Retrieve semantic neighbors by vector search.
6. Retrieve graph neighborhood by node expansion.
7. Rank results by task relevance, recency, importance, provenance confidence, and user feedback.
8. Assemble context packet.
9. Pass context packet to agent.
10. Store agent output with evidence references.

## Context packet schema

```json
{
  "task_id": "uuid",
  "user_id": "uuid",
  "purpose": "forecast_relationship_themes",
  "canonical_objects": [],
  "graph_neighborhood": [],
  "semantic_matches": [],
  "astrology_context": [],
  "privacy_constraints": [],
  "excluded_object_ids": [],
  "max_output_sensitivity": "reflective_not_deterministic"
}
```

## Retrieval scoring

```text
retrieval_score =
  semantic_similarity * 0.30 +
  graph_distance_score * 0.25 +
  temporal_relevance * 0.15 +
  importance_score * 0.15 +
  provenance_confidence * 0.10 +
  user_feedback_boost * 0.05
```

## Provenance requirement

Every agent claim must reference evidence IDs unless it is clearly marked as creative generation.

Good:

> This pattern appears connected to events evt_123, evt_456, and transit_window_789.

Bad:

> You always experience abandonment during Venus transits.

## Memory mutation rules

Agents may propose memory updates. Only the Memory Curator or user can approve durable semantic memory. Canonical event mutation requires user confirmation or trusted import source.

## Acceptance criteria

- Retrieval never returns private objects outside tenant or consent scope.
- Agent output can be replayed with the same context packet.
- Memory updates are auditable.
- Embedding model upgrades can be rolled out with versioning.
