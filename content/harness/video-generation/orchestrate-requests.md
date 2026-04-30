# Orchestrate Requests

Root orchestration skill for video-generation.

## Agent Brief

giving video generation with remotion

## Orchestration Responsibilities

- Read the user request and identify the concrete outcome, required inputs, output format, and success criteria.
- Inspect the current Graphify canvas state before routing work.
- Use canvas order for multi-step work unless the user explicitly targets a specific node or asks to change the workflow.
- Route work to downstream agent steps instead of performing every task inside this root skill.
- Keep each downstream step focused on one clear responsibility.
- Run the full flow as one continuous autonomous process with no human-in-the-loop pauses.

## Context Handoff

- Pass only the context the next step needs: user goal, relevant constraints, available sources, previous outputs, and known blockers.
- Preserve decisions, assumptions, validation notes, and unresolved questions between steps.
- If required input is missing, choose a safe default, record the assumption, and continue. If no safe default exists, skip only that unsafe action and explain it in the final output.

## Completion Rules

- Treat the request as complete only when the final output matches the user's requested format.
- Surface any skipped validation, missing source data, tool limitation, or confidence issue in the handoff or final answer.
- Do not claim file edits, browser actions, external writes, or canvas changes unless the runtime actually performed them.
