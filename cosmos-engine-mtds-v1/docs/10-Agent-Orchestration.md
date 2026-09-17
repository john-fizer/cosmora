# 10 — Agent Orchestration

## Purpose

Define the multi-agent architecture that powers interpretation, pattern discovery, narrative generation, forecasting, and user guidance.

## Core doctrine

Agents are not omniscient. They are specialized workers with scoped permissions and structured outputs. The orchestrator is responsible for routing, state, guardrails, retries, and provenance.

## Agent hierarchy

```text
Chief Orchestrator
├── Reality Department
│   ├── Event Extractor
│   ├── Memory Curator
│   └── Provenance Auditor
├── Symbolic Department
│   ├── Hellenistic Agent
│   ├── Modern Psychological Agent
│   ├── Vedic Agent
│   ├── Uranian/Midpoint Agent
│   ├── Numerology Agent
│   └── Mythology Agent
├── Science Department
│   ├── Graph Analyst
│   ├── Statistics Agent
│   ├── Forecast Calibration Agent
│   └── Skeptic Agent
├── Narrative Department
│   ├── Story Architect
│   ├── Script Builder
│   ├── Character Arc Agent
│   └── Motif Agent
└── Media Department
    ├── Storyboard Agent
    ├── Video Prompt Agent
    ├── Voiceover Agent
    └── Music Direction Agent
```

## Workflow types

### Sequential workflow

Used for deterministic pipelines.

Example:

```text
User biography -> Event Extractor -> User Confirmation -> Astrology Engine -> Graph Projection -> Memory Embedding
```

### Concurrent council workflow

Used for interpretation.

```text
Context Packet
    -> Hellenistic Agent
    -> Modern Agent
    -> Vedic Agent
    -> Uranian Agent
    -> Graph Analyst
    -> Skeptic Agent
    -> Moderator Agent
    -> Finding Object
```

### Recursive refinement workflow

Used for script and cinema.

```text
Story outline -> Script -> Critique -> Revision -> Storyboard -> Prompt Pack -> Render Job
```

### Counterfactual workflow

Used for Director Simulator.

```text
Scenario Question -> Assumption Extractor -> Branch Generator -> Forecast Engine -> Narrative Agent -> Comparison View
```

## Agent run schema

```json
{
  "agent_run_id": "uuid",
  "workflow_id": "uuid",
  "agent_id": "agent:hellenistic",
  "input_context_id": "ctx_123",
  "status": "completed|failed|requires_user",
  "started_at": "timestamp",
  "completed_at": "timestamp",
  "model": "model_name",
  "prompt_version": "v0.1.0",
  "tool_calls": [],
  "output_object_ids": [],
  "cost": {
    "input_tokens": 0,
    "output_tokens": 0
  }
}
```

## Finding schema

```json
{
  "finding_id": "uuid",
  "finding_type": "symbolic_pattern|forecast_support|narrative_theme|contradiction",
  "claim": "Mars activations repeatedly coincide with relational conflict events.",
  "confidence": 0.71,
  "evidence": ["evt_123", "evt_456", "transit_789"],
  "minority_opinions": [],
  "limitations": ["Date precision is low for evt_456."],
  "recommended_user_language": "reflective"
}
```

## Orchestrator rules

- Do not let agents mutate canonical objects directly.
- Require evidence IDs for factual or interpretive claims.
- Run Skeptic Agent on forecasts and sensitive interpretations.
- Require lower certainty language for low-confidence data.
- Log all prompt versions.
- Make workflows replayable.

## Acceptance criteria

- Council outputs include consensus, disagreement, evidence, confidence, and limitations.
- Agent failures do not break core app use.
- Sensitive outputs pass safety language checks.
- All agent outputs can be traced to prompt version and context packet.
