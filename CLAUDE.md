# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Poetry bot -- a persistent poetry agent that passively accumulates environmental and contextual information until a poem emerges. The agent writes poems autonomously and on-demand, accepts user feedback on finished poems, and allows submission of reference texts to guide future writing.

See `PROJECT_BRIEF.md` for full design philosophy and specifications.

## Key Design Intent

Connor is a published novelist and poetry teacher. The core metaphor: floating particles of input that align into poems. This isn't just decoration -- it drives the architecture. The agent should feel like it's accumulating and connecting ideas, not just responding to prompts.

## Technical Decisions

- **LLM engine:** Ollama at `http://localhost:11434` (local-first, budget-conscious). Open to cost-effective API fallback.
- **Config-driven:** YAML configs with sensible defaults for model selection, schedules, thresholds.
- **Persistent state:** The agent accumulates observations between poem generations (weather, season, user inputs, reference texts, feedback).

## Core Components (Planned)

1. **Data accumulation** -- weather API, seasonal data, user-submitted reference texts
2. **Poem generation** -- LLM-driven with chain-of-thought; must expose the creative process
3. **Feedback loop** -- user reviews poems, notes get internalized for future work
4. **Particle visualizer** (optional) -- floating concept nodes that align when a poem forms
5. **Scheduler** -- autonomous poem generation on its own timeline

## Design Specifications

- Produces poems autonomously and on request
- Shows thought process in creating poems
- Derives sentiment from environment inputs (weather, season)
- Can generate interests and research them to construct poems
- Accepts user feedback that applies to future poems
- Accepts reference text submissions (poems, articles) to guide writing
