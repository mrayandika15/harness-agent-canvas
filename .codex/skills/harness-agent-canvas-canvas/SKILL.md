---
name: harness-agent-canvas-canvas
description: Project-local canvas editing and Graphify workflow creation instructions for Harness Agent Canvas.
---

# Harness Agent Canvas Canvas Runtime

Use this skill for local Claude or Codex calls that create, edit, restructure, or delete nodes on the Harness Canvas.

## Single Source Of Truth

`content/harness/<agent-slug>/` is the single source of truth for every Harness Canvas agent. Read it before proposing edits, deletes, or new workflows.

Layout per agent (slug = kebab-case of the agent name):

- `content/harness/<slug>/PERSONALITY.md` — agent personality and boundaries.
- `content/harness/<slug>/<node-id>.md` — one Markdown file per canvas node (root orchestration skill at index 0, downstream agent steps after).
- `content/harness/<slug>/graphify-out/graph.json` — Graphify canvas state: node order, ids, metadata, edges. This is the file the runtime serializes from and writes to.
- `content/harness/<slug>/graphify-out/graph.html` and `GRAPH_REPORT.md` — derived views of the same graph.
- `content/harness/<slug>/graphify-out/cache/` — Graphify-managed cache; do not hand-edit.

Rules:

- If the runtime payload disagrees with `content/harness/<slug>/`, trust `content/`.
- Do not invent node ids, titles, or Markdown that are not represented in `content/harness/<slug>/graphify-out/graph.json` and the matching node Markdown files.
- Never write directly into `graphify-out/`; emit Graphify-schema JSON and let the harness route persist the change.
- Per-node Markdown lives at `content/harness/<slug>/<node-id>.md` — when you change a node, the new `markdown` field in your JSON must be the full intended replacement for that file.

## Graphify MCP First

- Treat Graphify MCP / Graphify canvas state as the source of truth for harness structure.
- Preserve Graphify-compatible node order, node ids, node metadata, and node Markdown.
- If conversation text conflicts with the Graphify payload, follow the Graphify payload.
- Do not invent hidden steps outside the Graphify flow; return proposed canvas nodes or updates.

## User Mentions And Edit Intent

The user can tag any existing canvas node by typing `@<node-id>` in the prompt (e.g. `@scrape`, `@qualify`, `@compose`). The harness route uses these mentions plus the verbs in the prompt to choose one of three edit modes. Read the prompt carefully and respond in the shape the matching mode expects.

- **append** (default): no change verbs OR additive verbs like `add`, `append`, `extend`, `insert`, `include`, `new`. Produce one or more brand new nodes appended to the existing flow.
- **targeted**: change verbs like `simplify`, `reduce`, `shorten`, `clean`, `cleanup`, `compact`, `dedupe`, `prune`, `rebuild`, `replace`, `refactor`, `condense`, `merge`, `trim` AND a `@<node-id>` mention (or a node already selected by the user). Edit only that one node — do not touch the rest of the flow.
- **reset**: any of the change verbs above combined either with whole-flow language (`entire flow`, `whole canvas`, `all nodes`, `full pipeline`, `from scratch`, `rebuild all`, `replace all`) OR with a flow subject (`canvas`, `flow`, `pipeline`, `workflow`, `nodes`, `steps`) when no specific node is tagged or selected. Produce a fresh end-to-end workflow that replaces the existing agent steps. The route has already cleared previous agent steps before calling you.
- **delete**: the verbs `delete`, `remove`, or `drop` together with a `@<node-id>` mention. The route deletes the tagged node directly and does not need new node Markdown — acknowledge the delete intent in your plan and return the smallest valid Graphify payload (an empty `nodes` array is acceptable) so you do not fight the deletion.

When the user tags a node with `@<node-id>`, treat that node as the only edit target unless the prompt clearly asks for a whole-flow rebuild. Never silently expand a targeted edit into multi-node changes.

## Canvas Editing And Workflow Creation

- Generate or edit node Markdown freely; do not force a fixed Purpose/Inputs/Workflow/Outputs/Success Criteria template.
- Make each node's Markdown detailed and self-contained enough for the runtime agent to execute the step without guessing.
- Prefer clear Markdown structure for node instructions, including headings, ordered steps, checklists, tables, code fences, examples, acceptance criteria, and handoff notes when they help the agent perform the step.
- Expand terse workflow ideas into concrete agent instructions that cover the step goal, available inputs, required output, constraints, validation expectations, edge cases, and autonomous defaults for missing details.
- Keep workflow nodes concrete and useful for the requested agent.
- The root node may coordinate downstream steps, but should not replace every downstream agent.
- Node Markdown should describe behavior, constraints, examples, and handoff notes that matter for that step.
- Design flows as one continuous agent process with no human-in-the-loop approval, manual review, or extra-input pauses unless the user explicitly requests them.
- If details are missing, instruct the agent to choose safe defaults, continue, and report assumptions or limitations in the final output.
- Create only workflow structure unless the user explicitly asks to execute work.
- Editing workflow must follow the Graphify MCP structure schema supplied by the caller.
- For **targeted** edits, return exactly one node in `nodes` whose `id` matches the tagged `@<node-id>`. The harness uses that single node to overwrite the target's title, subtitle, icon, status, MCPs, source links, and Markdown — preserve any field you do not intend to change by re-emitting its current value.
- For **reset**, return the full replacement set of nodes in execution order. The route has already cleared previous agent steps before calling you.
- For **append**, return only the new nodes to add; do not re-emit nodes that already exist.
- For **delete**, the route deletes the tagged node before returning, so your output is not used to mutate Markdown — keep the response minimal and consistent with the schema.
- When asked for a Graphify workflow structure, return exactly one JSON object using this shape:

```json
{
  "nodes": [
    {
      "id": "optional-kebab-id",
      "title": "Agent Step Title",
      "subtitle": "Short purpose",
      "iconKey": "code|diamond|search|shield|zap",
      "instructionStatus": "draft|ready|review",
      "connectedMcp": ["selected-mcp-key"],
      "sourceLinks": [],
      "markdown": "# Agent Step Title\n\nFreeform agent instructions."
    }
  ],
  "selectedNodeId": "optional-node-id"
}
```

- Do not return arbitrary JSON keys outside the Graphify MCP schema unless the caller explicitly asks for JSON Lines edit operations.
- Return only the expected machine-readable payload when the caller requests JSON operations or JSON structure.
