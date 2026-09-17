# 18 — Security, Privacy, and Ethics

## Purpose

Define protection for sensitive personal, spiritual, emotional, relational, and media data.

## Data sensitivity

Cosmos handles extremely sensitive data:

- Birth data.
- Location history.
- Relationship details.
- Journals.
- Dreams.
- Photos and videos.
- Health-adjacent signals.
- Family data.
- Predictions and reflections.

## Security principles

- Least privilege.
- Tenant isolation.
- Encryption at rest and in transit.
- Explicit consent.
- Auditable access.
- Data minimization.
- Right to delete.
- Human-readable privacy controls.

## Permission model

Visibility levels:

- private
- shared_with_specific_person
- used_for_personal_ai
- aggregate_opt_in
- public_export

Agents must receive only the minimum memory required for task execution.

## Sensitive output policy

The system must avoid deterministic or fear-inducing language around:

- Death.
- Illness.
- Divorce.
- Pregnancy.
- Violence.
- Self-harm.
- Financial ruin.
- Legal outcomes.

## Forecast safety language

Required disclaimer style:

> This is a symbolic and probabilistic scenario, not a deterministic prediction. It is based on your confirmed history, current assumptions, and selected interpretive frameworks.

## Threat model

Risks:

- Unauthorized access to private memories.
- Agent retrieval of data outside scope.
- Prompt injection through imported documents.
- Hallucinated claims about relationships.
- Overreliance on predictions.
- Media likeness misuse.
- Aggregate research deanonymization.

Mitigations:

- Consent filters before retrieval.
- Prompt injection scanning.
- Evidence-required agent outputs.
- User-controlled memory deletion.
- Differential privacy for aggregate research.
- Audit logs for sensitive access.
- Human review for high-risk features.

## Acceptance criteria

- Users can delete all data.
- Users can export all data.
- Agents cannot retrieve hidden objects.
- Forecasts include limitations.
- Sensitive interpretations go through Skeptic Agent.
- Aggregate research is opt-in only.
