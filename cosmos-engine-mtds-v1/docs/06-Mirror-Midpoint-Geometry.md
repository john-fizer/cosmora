# 06 — Mirror and Midpoint Geometry

## Purpose

Define the nuanced symbolic geometry layer: antiscia, contra-antiscia, midpoints, harmonic points, Arabic Parts, and constellation triggers.

## Longitude convention

All points are stored in absolute zodiac longitude from 0° Aries to 360°.

```text
Aries      0° - 29.999°
Taurus    30° - 59.999°
Gemini    60° - 89.999°
Cancer    90° - 119.999°
Leo       120° - 149.999°
Virgo     150° - 179.999°
Libra     180° - 209.999°
Scorpio   210° - 239.999°
Sagittarius 240° - 269.999°
Capricorn 270° - 299.999°
Aquarius  300° - 329.999°
Pisces    330° - 359.999°
```

## Antiscia

Antiscia mirror points reflect across the Cancer/Capricorn solstice axis. In longitude math:

```text
antiscion_longitude = (180 - longitude) mod 360
```

Examples:

```text
15° Aries = 15° Virgo
10° Taurus = 20° Leo
25° Gemini = 5° Cancer
```

Antiscia sign pairs:

- Aries / Virgo
- Taurus / Leo
- Gemini / Cancer
- Libra / Pisces
- Scorpio / Aquarius
- Sagittarius / Capricorn

## Contra-antiscia

Contra-antiscia are opposite the antiscion.

```text
contra_antiscion_longitude = (antiscion_longitude + 180) mod 360
```

Equivalent direct formula:

```text
contra_antiscion_longitude = (360 - longitude) mod 360
```

Contra-antiscia sign pairs:

- Aries / Pisces
- Taurus / Aquarius
- Gemini / Capricorn
- Cancer / Sagittarius
- Leo / Scorpio
- Virgo / Libra

## Midpoints

For two longitudes A and B, compute angular separation:

```text
delta = (B - A + 360) mod 360
near_midpoint = (A + delta / 2) mod 360
far_midpoint = (near_midpoint + 180) mod 360
```

If delta > 180, swap A and B or normalize to shortest arc.

## Midpoint tree

A midpoint tree asks: what planets or points are in hard aspect to a midpoint?

Hard activation aspects:

- 0°
- 45°
- 90°
- 135°
- 180°

Schema:

```json
{
  "midpoint_id": "mp_venus_mars_near",
  "source_a": "Venus",
  "source_b": "Mars",
  "midpoint_longitude": 103.2,
  "far_midpoint_longitude": 283.2,
  "activators": [
    {
      "point_id": "transit_mercury_2026_07_05",
      "aspect": "square",
      "orb": 0.7,
      "activation_weight": 0.86
    }
  ]
}
```

## Arabic Parts

A Part is formulaic symbolic geometry.

Generic formula:

```text
part = ascendant + point_a - point_b mod 360
```

Day/night variants must be explicit.

Initial parts:

- Part of Fortune.
- Part of Spirit.
- Part of Eros.
- Part of Necessity.
- Part of Basis.
- Part of Exaltation.

## Harmonic points

Harmonic charts multiply zodiac longitude by N and normalize.

```text
harmonic_longitude = (n * natal_longitude) mod 360
```

Initial supported harmonics:

- 2: polarity.
- 3: flow.
- 4: manifestation tension.
- 5: creativity.
- 7: fate-like or liminal patterning.
- 9: spiritual refinement / Navamsa bridge.

## Constellation trigger

A constellation is discovered when multiple symbolic activations cluster across time, meaning, and graph topology.

Initial constellation score:

```text
constellation_score =
  symbol_overlap_score * 0.25 +
  event_similarity_score * 0.25 +
  temporal_recurrence_score * 0.20 +
  emotional_resonance_score * 0.15 +
  user_feedback_score * 0.15
```

## Trigger types

- Direct transit to natal point.
- Transit to antiscion.
- Transit to contra-antiscion.
- Transit to midpoint.
- Progressed point to natal point.
- Solar arc to natal point.
- House profection ruler activation.
- Eclipse near natal or derived point.
- Fixed star conjunction.
- Repeated graph motif.

## Acceptance criteria

- All formulas have tests around 0° wraparound.
- Every derived point stores formula version.
- UI can toggle derived geometry independently.
- Agents can cite exact derived point IDs.
- Forecasts can include derived point activations as evidence.
