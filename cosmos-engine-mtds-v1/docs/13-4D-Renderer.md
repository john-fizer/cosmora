# 13 — 4D Renderer

## Purpose

Define the visual engine that renders the user's life as a navigable astrological universe.

## Renderer concept

The Renderer shows the same graph through spatial and temporal metaphors:

- Natal chart as origin constellation.
- Transits as moving bodies.
- Events as stars.
- Edges as light trails.
- Patterns as constellations.
- Forecasts as probability nebulae.
- Chapters as regions of space-time.

## Coordinate model

### Zodiac longitude to angle

```text
angle = longitude_degrees * PI / 180
```

### Basic radial placement

```text
x = radius * cos(angle)
y = radius * sin(angle)
z = layer_depth
```

### Layers

- Layer 0: Zodiac ring.
- Layer 1: Houses.
- Layer 2: Natal anchors.
- Layer 3: Derived points.
- Layer 4: Transits.
- Layer 5: Events.
- Layer 6: Patterns.
- Layer 7: Forecast clouds.
- Layer 8: Narrative overlays.

## Time dimension

The UI has a `cosmic_time` state. Scrubbing time updates:

- Planet positions.
- Transit trails.
- Active aspects.
- Visible events.
- Highlighted chapters.
- Forecast clouds.

## Scene payload

```json
{
  "scene_id": "uuid",
  "time_window": {"start":"2026-01-01", "end":"2026-12-31"},
  "nodes": [
    {"id":"pp_sun", "type":"natal_planet", "x":0, "y":0, "z":0, "label":"Sun"}
  ],
  "edges": [
    {"id":"edge_1", "from":"evt_1", "to":"pp_mars", "type":"ACTIVATES", "weight":0.8}
  ],
  "animations": [],
  "filters": {
    "show_midpoints": true,
    "show_antiscia": true,
    "show_forecasts": false
  }
}
```

## Performance requirements

- Use instancing for thousands of event nodes.
- Stream graph chunks by time range.
- Level-of-detail for labels.
- Frustum culling for offscreen objects.
- Progressive loading of media thumbnails.
- 60 FPS target on desktop.
- 30 FPS acceptable on mobile.

## Interaction modes

### Explore

User flies freely through the universe.

### Timeline scrub

User drags time forward/backward.

### Focus mode

User clicks a node and graph dims unrelated regions.

### Constellation mode

User selects a pattern and related nodes illuminate.

### Transit mode

User selects a transit and sees historical and future activations.

### Cinema mode

The renderer becomes a storyboard navigation system.

## Accessibility

Every 3D view must have 2D alternatives:

- Timeline list.
- Graph table.
- Written explanation.
- Keyboard navigation.
- Reduced motion mode.
- High contrast mode.

## Acceptance criteria

- Natal chart renders as fixed anchors.
- Transits animate correctly by time.
- Events attach to symbolic nodes.
- Midpoint and mirror layers can be toggled.
- Forecast clouds are visually distinct from factual events.
- Scene state can be serialized and shared.
