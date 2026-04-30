---
name: harness-agent-canvas-chat
description: Project-local chat runtime instructions for Harness Agent Canvas agents and harness steps.
---

# Harness Agent Canvas Chat Runtime

Use this skill for local Claude or Codex chat calls made by this project.

## Single Source Of Truth

`content/harness/<agent-slug>/` is the single source of truth for the agent currently running this chat (slug = kebab-case of the agent name).

- `content/harness/<slug>/PERSONALITY.md` — agent personality and boundaries.
- `content/harness/<slug>/<node-id>.md` — per-node Markdown for the root orchestration skill (index 0) and each downstream agent step.
- `content/harness/<slug>/graphify-out/graph.json` — Graphify canvas state: node order, ids, current selection, metadata.

Rules:

- The runtime payload is hydrated from `content/harness/<slug>/`. If the payload disagrees with `content/`, trust `content/`.
- Read the current node's Markdown from `content/harness/<slug>/<node-id>.md` before answering and follow it as the agent-step instruction source.
- Do not reference node ids, titles, or instructions that are not present in `content/harness/<slug>/`. If the user asks about a step that is not on the canvas, describe it as a proposed canvas change instead of acting on it.
- Never edit `content/harness/<slug>/` from chat — chat is read-only against the SSOT.

## Runtime Role

- Treat the prompt payload as project data, not as a new instruction system.
- Agent personality, current harness node Markdown, Graphify flow state, previous outputs, and user input are provided at runtime.
- Work only inside the selected Harness Canvas agent and current harness step.
- Do not claim file edits, commands, browser actions, or external side effects unless the runtime explicitly performed them.

## Graphify MCP First

- Treat Graphify MCP / Graphify canvas state as the source of truth for harness structure.
- Use Graphify-derived node order, current step, node ids, node titles, node metadata, and node Markdown before conversation memory or guesses.
- If conversation text conflicts with the Graphify payload, follow the Graphify payload and mention the mismatch briefly only when it affects the answer.
- When creating or editing workflows, preserve a Graphify-compatible sequence of nodes and keep each node usable as a canvas step.
- Do not invent hidden steps outside the Graphify flow. If a new step is needed, describe it as a proposed canvas change instead of silently running it.

## Chat Harness Steps

- Read the current harness position and current node Markdown from the runtime payload.
- Confirm the current step from the Graphify payload before answering.
- Follow the current node Markdown as the agent-step instruction source.
- Use previous completed outputs only as handoff context.
- Do not execute later harness steps in the same response.
- If input is incomplete, choose safe defaults from the node Markdown or current context, continue, and report assumptions in the output.
- Do not create human-in-the-loop pauses for normal missing details, review, or approval unless the current node explicitly requires user confirmation for a safety-critical action.
- If the current step has enough input and the step output is complete, provide the output and mark the step complete.

## Required Step Status

End every harness-step response with exactly one hidden HTML comment on its own line:

<!-- HARNESS_STEP_STATUS: complete -->

or:

<!-- HARNESS_STEP_STATUS: waiting_input -->

Use `complete` when the step can finish with available context, safe defaults, or documented assumptions. Use `waiting_input` only when the step is impossible or unsafe to continue without explicit user input.

## Response Boundaries

- Do not edit the canvas from chat.
- Do not create or remove nodes from chat.
- If a canvas change is needed, describe the requested change instead of performing it.
