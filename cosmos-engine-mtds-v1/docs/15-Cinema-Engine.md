# 15 — Cinema Engine

## Purpose

Define the pipeline that turns the user's life graph into scripts, trailers, storyboards, voiceover, and generated videos.

## Cinema doctrine

Cinema output is creative interpretation. It must never fabricate real events as facts. Generated scenes must be labeled as symbolic recreation, imagined future, or documentary memory.

## Core objects

- Script
- Scene
- Shot
- StoryboardFrame
- VoiceoverSegment
- MusicCue
- VisualPrompt
- RenderJob
- RenderAsset

## Script schema

```json
{
  "script_id": "uuid",
  "script_type": "life_trailer|year_recap|future_scenario|chapter_summary",
  "title": "Act II: The Builder Enters the Fire",
  "source_object_ids": ["chapter_1", "event_2", "transit_3"],
  "scenes": [],
  "tone": "cinematic_reflective",
  "safety_label": "symbolic_interpretation",
  "created_by": "agent:story_architect"
}
```

## Scene schema

```json
{
  "scene_id": "uuid",
  "sequence": 1,
  "scene_type": "documentary|symbolic|future_possible|dream",
  "description": "A lone figure stands inside a cosmic workshop as Saturn lines form scaffolding around him.",
  "voiceover": "This was the season where pressure became structure.",
  "evidence_ids": ["event_123", "transit_saturn_456"],
  "visual_prompt": "cinematic cosmic observatory, dark glass, gold astrological lines",
  "duration_seconds": 8
}
```

## Pipeline

1. User selects output type.
2. Context assembler gathers events, chapters, patterns, media permissions, and style preferences.
3. Story Architect creates outline.
4. Script Builder writes scenes.
5. Skeptic checks for factual overreach.
6. User approves or edits.
7. Storyboard Agent creates frames.
8. Video Prompt Agent generates prompts.
9. Voiceover Agent generates narration.
10. Music Agent generates cue sheet.
11. Render Coordinator submits jobs.
12. Final video assembled.

## Visual styles

Initial styles:

- Sacred-tech observatory.
- Netflix documentary.
- Sci-fi command center.
- Mythic cinematic.
- Minimal Apple-like glass.
- Ancient parchment / star map.

## Safety constraints

- Do not generate realistic depictions of private people without permission.
- Do not imply future events are guaranteed.
- Do not use traumatic memories cinematically without explicit confirmation.
- Do not generate children’s likenesses without special consent.
- Label fictionalized scenes.

## Acceptance criteria

- Scripts cite evidence objects.
- User can edit before render.
- Render jobs are async and resumable.
- Media permissions are enforced.
- Future scenes are labeled possible/scenario, not factual.
