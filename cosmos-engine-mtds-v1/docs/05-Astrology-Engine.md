# 05 — Astrology Engine

## Purpose

Define deterministic astrological computation for Cosmos Engine.

## System boundary

The Astrology Engine computes positions and timing. It does not interpret meaning. It produces structured outputs used by the Symbolic Interpreter and graph projection.

## Required calculations

### Birth chart

Inputs:

- Birth date.
- Birth time.
- Birth timezone.
- Birth location latitude and longitude.
- House system.
- Zodiac mode: tropical or sidereal.
- Ayanamsha if sidereal.

Outputs:

- Planetary longitudes.
- Declinations.
- Right ascension.
- Speeds.
- Retrograde flags.
- Houses.
- Ascendant.
- Midheaven.
- Nodes.
- Lot/Arabic Parts.
- Fixed star contacts.

### Transits

Compute planetary positions for arbitrary timestamp or range. Store exact hits to natal placements, derived points, angles, and house cusps.

### Aspects

Default major aspects:

- Conjunction 0°
- Opposition 180°
- Trine 120°
- Square 90°
- Sextile 60°

Optional minor aspects:

- Semi-square 45°
- Sesquiquadrate 135°
- Quincunx 150°
- Semi-sextile 30°
- Quintile 72°
- Bi-quintile 144°

### Timing techniques

MVP:

- Natal chart.
- Transits.
- Secondary progressions.
- Annual profections.
- Solar return.
- Solar arcs.
- Antiscia / contra-antiscia.
- Midpoints.

Future:

- Zodiacal releasing.
- Firdaria.
- Dashas.
- Primary directions.
- Harmonic charts.
- Electional search.
- Horary module.

## Computation object

```json
{
  "calculation_id": "uuid",
  "tenant_id": "uuid",
  "profile_id": "uuid",
  "calculation_type": "natal|transit|progression|return|derived_point",
  "input_hash": "sha256",
  "engine_version": "astro-core-0.1.0",
  "computed_at": "2026-07-05T00:00:00Z",
  "objects": []
}
```

## Planetary point schema

```json
{
  "id": "pp_123",
  "body": "Moon",
  "chart_context": "natal",
  "timestamp": "1991-04-23T08:06:00Z",
  "zodiac_longitude": 145.25,
  "sign": "Leo",
  "degree_in_sign": 25.25,
  "house": 8,
  "speed": 13.2,
  "retrograde": false,
  "declination": 12.44,
  "right_ascension": 147.12
}
```

## Aspect schema

```json
{
  "id": "asp_123",
  "point_a_id": "pp_sun",
  "point_b_id": "pp_moon",
  "aspect_type": "square",
  "exact_angle": 90,
  "actual_angle": 92.3,
  "orb": 2.3,
  "applying": true,
  "exact_at": "2026-09-01T14:12:00Z",
  "weight": 0.72
}
```

## Weighting formula

Aspect weight should consider:

- Orb exactness.
- Planet speed.
- Planet priority.
- Natal relevance.
- House relevance.
- Repetition in personal history.
- Whether direct, station, retrograde, or return.

Initial formula:

```text
aspect_weight = exactness_score * planet_weight * context_weight * repetition_weight
exactness_score = max(0, 1 - orb / allowed_orb)
```

## Required tests

- Same birth profile always produces same chart.
- Timezone conversions are tested for DST.
- House cusps are stable across engine versions or version-tagged.
- Retrograde flag is correct at known dates.
- Aspect orb calculations handle zodiac wraparound.
- Derived points are versioned and reproducible.

## Acceptance criteria

- No interpretation text exists in Astrology Engine outputs.
- All calculations carry input hash and engine version.
- Every derived point references source points.
- Every exact transit window is queryable by user, planet, point, and date range.
