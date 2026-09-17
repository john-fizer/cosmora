# 12 — Probability Engine

## Purpose

Define how Cosmos estimates possible future themes without deterministic prediction.

## Core principle

The Probability Engine predicts themes and scenario likelihoods, not fixed events. It must always expose uncertainty, evidence, and limitations.

## Inputs

- User event graph.
- Event categories and timestamps.
- Emotional intensity.
- Natal chart.
- Upcoming transits.
- Derived point activations.
- Midpoint activations.
- Profections and timing rulers.
- Prior user feedback.
- Similar graph motifs.
- Scenario assumptions.

## Output object

```json
{
  "forecast_id": "uuid",
  "theme": "career pivot",
  "time_window": {
    "starts_at": "2027-01-01",
    "ends_at": "2027-06-30"
  },
  "probability": 0.64,
  "confidence_interval": [0.48, 0.77],
  "evidence": ["transit_123", "motif_456", "event_789"],
  "drivers": [
    {"name": "Saturn activation", "weight": 0.28},
    {"name": "historical recurrence", "weight": 0.34},
    {"name": "graph similarity", "weight": 0.21}
  ],
  "language_mode": "possibility",
  "limitations": ["Only three confirmed career events exist."],
  "created_by": "probability_engine_v0.1"
}
```

## Model ensemble

### 1. Symbolic rules model

Encodes explicit astrological heuristics with weights.

### 2. Personal recurrence model

Looks for prior events with similar symbolic signatures.

### 3. Graph motif similarity model

Compares the current upcoming graph neighborhood to historical neighborhoods.

### 4. Semantic trajectory model

Uses event embeddings and time series to estimate theme drift.

### 5. Aggregate opt-in model

Uses anonymized patterns from consenting users. This must never expose individual data.

### 6. Scenario adjustment model

Updates probabilities when the user changes assumptions.

## Forecast scoring

```text
raw_score =
  symbolic_activation_score * 0.25 +
  personal_recurrence_score * 0.25 +
  graph_similarity_score * 0.20 +
  semantic_trajectory_score * 0.15 +
  aggregate_pattern_score * 0.10 +
  scenario_adjustment_score * 0.05
```

Scores must be calibrated using feedback. Uncalibrated scores should be labeled “signal strength” instead of probability.

## Feedback loop

User responses:

- Accurate.
- Partially accurate.
- Wrong.
- Too vague.
- Useful but not literal.
- Harmful framing.
- Needs more context.

Feedback updates:

- Theme classifier.
- Weight calibration.
- User-specific interpretation profile.
- Agent language settings.

## Forecast language rules

Allowed:

- “This period may emphasize…”
- “The strongest recurring theme is…”
- “Your past data suggests…”
- “This is a possibility field, not a certainty.”

Forbidden:

- “This will happen.”
- “You are destined to…”
- “Your partner will…”
- “The chart guarantees…”

## Acceptance criteria

- Every forecast has evidence, drivers, limitations, and confidence.
- Forecasts degrade gracefully when data is insufficient.
- User feedback is captured.
- Sensitive domains require extra caution.
- Deterministic prediction language is blocked.
