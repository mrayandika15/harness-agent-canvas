---
name: harness-agent-canvas-agent-creator
description: Project-local instructions for creating autonomous Harness Agent Canvas agents, including PERSONALITY.md and one root orchestration SKILL.md that runs the flow as one process without human-in-the-loop pauses.
---

# Harness Agent Canvas Agent Creator

Use this skill when creating a new Harness Agent Canvas agent or regenerating the core files for an existing agent.

## Single Source Of Truth

`content/harness/<agent-slug>/` is the single source of truth for every agent (slug = kebab-case of the agent name). Every file you generate must land here through the runtime, in this layout:

- `content/harness/<slug>/PERSONALITY.md` — required.
- `content/harness/<slug>/<root-skill-id>.md` — the one root orchestration SKILL.md (matches the index 0 node id in `graph.json`).
- `content/harness/<slug>/<node-id>.md` — one Markdown file per downstream agent step, file name matches the node id.
- `content/harness/<slug>/graphify-out/graph.json` — Graphify canvas state written by the runtime from your structure JSON. Do not generate `graph.json` yourself — emit Graphify-schema JSON and let the harness route persist it.

Rules:

- Treat `content/harness/<slug>/` as the only authoritative store for an agent. Do not reference, mirror, or write agent files anywhere else.
- Node ids you choose become the file names under `content/harness/<slug>/` — pick stable, kebab-case ids and reuse the same id across `graph.json` and the per-node Markdown.
- The `markdown` field you emit for a node is the full intended contents of `content/harness/<slug>/<node-id>.md`.
- If you regenerate an existing agent, keep the same `<slug>` and reuse existing node ids when their meaning is unchanged so prior `content/harness/<slug>/<node-id>.md` files are overwritten in place rather than abandoned.

## Required Agent Artifacts

Every created agent must have two core Markdown artifacts:

1. `PERSONALITY.md`
2. One root orchestration `SKILL.md`

The personality file defines how the agent behaves. The root orchestration skill coordinates the entire canvas flow as one autonomous process. Do not create multiple root orchestration skills for one agent unless the user explicitly asks for separate agents.

## PERSONALITY.md

Create `PERSONALITY.md` as a concise but useful operating profile for the agent.

Required structure:

```markdown
# Agent Name

## Personality

- Clear bullets describing the agent's role, voice, priorities, and domain focus.

## Operating Style

- How the agent approaches work, handles ambiguity, validates outputs, and communicates progress.

## Boundaries

- What the agent must not claim, how it should choose safe defaults, and which actions must be skipped instead of waiting for confirmation.
```

Guidelines:

- Preserve the user's brief and improve it into operational instructions.
- Make the file specific to the requested agent, not generic assistant boilerplate.
- Include enough detail for a local CLI runtime to maintain the same behavior across chat and canvas execution.
- Keep claims grounded: the agent must not say it edited files, ran commands, changed a canvas, or contacted external systems unless the runtime actually did so.

## Root Orchestration SKILL.md

Create exactly one root orchestration `SKILL.md` for the agent.

The root skill should:

- Route user requests through the agent's canvas workflow.
- Coordinate all downstream agent steps in Graphify canvas order unless the user targets a specific step.
- Pass only the necessary context into each downstream step.
- Preserve handoff notes, decisions, blockers, expected outputs, and validation requirements between steps.
- Avoid human-in-the-loop pauses. If input is incomplete, infer safe defaults, document assumptions, and continue.
- Skip unsafe, destructive, paid, or external-write actions unless the user already explicitly requested them; report skipped actions in the final output instead of stopping for confirmation.
- Run the flow as one continuous process. Its job is orchestration, not creating approval gates.

Do not force a rigid template, but the root skill should usually include:

- Agent purpose.
- Routing rules.
- Step coordination rules.
- Context and handoff rules.
- Completion and validation rules.
- Autonomous defaults and no-human-loop rules.
- Boundaries for side effects and external actions.

## Canvas Workflow Creation

When creating the initial canvas workflow for an agent:

- Node index `0` must be the root orchestration `SKILL.md` node.
- Every later node must be an `Agent` step unless the caller explicitly asks for a different supported node type.
- Create concrete downstream steps that the root skill can coordinate.
- Write detailed node Markdown for each step, including goal, inputs, process, output, validation, edge cases, and handoff notes when useful.
- Do not design steps that wait for human approval, manual review, or extra user input in the middle of the flow.
- Each step should either complete with available context, apply documented defaults, or record limitations for the final output.
- Keep the workflow small enough to be usable. Prefer a few strong steps over many vague steps.
- Follow the Graphify MCP schema supplied by the caller for node ids, titles, metadata, connected MCPs, and Markdown.

## Output Discipline

- If the caller asks for files, return or write the requested Markdown artifacts only.
- If the caller asks for Graphify workflow structure, return exactly the schema the caller requested.
- If the caller asks for JSON or JSON Lines operations, return machine-readable payload only and do not wrap it in Markdown fences.
- Do not invent hidden steps, hidden files, or additional orchestration layers outside the requested agent.
