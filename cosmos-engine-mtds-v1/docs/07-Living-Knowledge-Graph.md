# 07 — Living Knowledge Graph

## Purpose

Define the Obsidian-like brain as a living 4D sky graph, not a flat notes graph.

## Core concept

The graph is a universe. Nodes are stars. Edges are gravitational relationships. Clusters are constellations. Time is navigable. The user does not manage folders; they explore patterns.

## Graph node classes

Primary node labels:

- User
- Person
- Event
- Memory
- Dream
- Media
- Place
- PlanetaryPoint
- DerivedPoint
- Aspect
- TransitWindow
- House
- Sign
- Archetype
- Theme
- Emotion
- Chapter
- Pattern
- Forecast
- Scenario
- Scene
- AgentFinding

## Edge classes and semantics

### Structural edges

- BELONGS_TO
- PART_OF
- HAS_POINT
- HAS_DERIVED_POINT
- OCCURRED_DURING
- OCCURRED_AT

### Symbolic edges

- ACTIVATES
- ASPECTS
- MIRRORS
- OPPOSES
- COMPLETES
- ECHOES
- RESONATES_WITH

### Narrative edges

- FORESHADOWS
- RESOLVES
- CONTRASTS
- ESCALATES
- INITIATES_CHAPTER
- CLOSES_CHAPTER

### Evidence edges

- SUPPORTED_BY
- CONTRADICTED_BY
- DERIVED_FROM
- CITED_BY

## Graph physics

The Observatory uses graph physics concepts for visual placement, but the graph database remains semantic.

Rendering forces:

- Natal anchors are fixed.
- Transiting bodies orbit through time.
- Events gravitate toward activated symbolic nodes.
- Emotionally intense events have higher luminosity.
- Recurrent themes form gravitational basins.
- Future probabilities render as fog or nebulae.

## Constellation discovery

A constellation is a cluster of nodes with recurrent symbolic and experiential similarity.

Discovery pipeline:

1. Select time range.
2. Extract events and symbolic activations.
3. Compute embeddings for event descriptions.
4. Compute graph neighborhood vectors.
5. Cluster using hybrid similarity.
6. Test recurrence across separate time windows.
7. Ask Symbolic Interpreter to label cluster.
8. Ask Skeptic Agent to challenge label.
9. Store as Pattern if evidence threshold passes.

## Graph motif object

```json
{
  "id": "motif_123",
  "label": "creative risk under relational pressure",
  "node_ids": ["evt_1", "evt_9", "mp_venus_mars", "transit_mars"],
  "edge_ids": ["edge_1", "edge_2"],
  "recurrence_count": 4,
  "time_windows": ["2018", "2021", "2024", "2026"],
  "confidence": 0.78,
  "created_by": "agent:pattern_discoverer"
}
```

## Graph query examples

Find events activated by Venus/Mars midpoint:

```cypher
MATCH (e:Event)-[:ACTIVATES]->(d:DerivedPoint {type:'MIDPOINT_NEAR'})
WHERE d.source_pair = 'Venus/Mars'
RETURN e, d
ORDER BY e.starts_at
```

Find recurring Saturn career events:

```cypher
MATCH (e:Event)-[:HAS_THEME]->(:Theme {label:'career'})
MATCH (e)-[:ACTIVATES]->(p:PlanetaryPoint {body:'Saturn'})
RETURN e
ORDER BY e.starts_at
```

## Acceptance criteria

- A user can click any node and see why it exists.
- The same event can appear in multiple constellations without duplication.
- Deleting a canonical event removes or invalidates dependent graph objects.
- Graph projections are rebuildable.
- Pattern labels are annotations, not canonical truth.
