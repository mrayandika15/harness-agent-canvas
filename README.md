# Harness Agent Canvas

A visual orchestration platform for designing and running multi-step AI agent workflows. Harness Agent Canvas pairs a node-based **flow canvas** with a **premium chat interface** so you can sketch an agent's persona, wire up its tools, and immediately talk to it — all from a single polished surface.

> *Design the agent visually. Trigger it from chat. Run it locally.*

---

## What it is

Modern agent frameworks either hide the flow behind code or surface it as an intimidating graph editor. **Harness Agent Canvas** is the middle ground: a fast, dark-themed workspace where each agent is a readable harness of steps (scrape → qualify → compose → remember → deploy), and each node is a drawer of markdown + tool configuration you can edit inline.

The chat panel is the primary trigger. Type a prompt, watch the flow light up, and see tool output stream back as rich artifacts.

## Core concepts

- **Harness flow** — an ordered graph of steps that defines *what* the agent does. Built on [React Flow](https://reactflow.dev/).
- **Persona kernel** — the first node in every harness. It seeds system role, constraints, and tone before any tool node runs.
- **Node inspector** — click any step to open a markdown-backed drawer describing its purpose, connected MCP tools, and notes. Content lives in `content/flow-nodes/*.md`.
- **Chat workspace** — the main trigger surface. Sending a message is what executes the harness end-to-end.
- **Agent list** — left rail of saved agents, each with its own harness and chat history.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Canvas | `@xyflow/react` (React Flow) |
| Styling | Tailwind CSS v4 + shadcn/ui + `tw-animate-css` |
| State | Zustand |
| Motion | Framer Motion |
| Markdown | `react-markdown` |
| Runtime | Bun |

The vision (tracked in [`docs/ssot.md`](./docs/ssot.md)) layers a local Express/MCP daemon, `claude-mem` for persistent memory, and Supabase for saved layouts on top of this UI shell.

## Project layout

```
src/
├─ app/
│  ├─ _components/        # Dashboard shell and screen composition
│  ├─ flow/[nodeId]/      # Per-node detail route
│  └─ page.tsx            # Entry point
├─ features/
│  ├─ agents/             # Agent list panel + selected header
│  ├─ chat/               # Chat workspace
│  ├─ flow/               # Canvas, nodes, inspector, markdown sidebar
│  ├─ navigation/         # App sidebar nav
│  └─ workspace/          # Zustand store, autoplay hooks, shared types
├─ components/ui/         # shadcn primitives
└─ lib/                   # Shared utils
content/flow-nodes/       # Markdown source for each harness step
docs/ssot.md              # Product + technical north star
```

## Getting started

```bash
bun install
bun dev
```

Then open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
bun run build      # Production build
bun run start      # Serve production build
bun run typecheck  # tsc --noEmit
```

## Editing a harness node

Each step on the canvas is backed by a markdown file under `content/flow-nodes/`. Edit the file, reload the inspector, and the new copy shows up instantly. Node metadata (title, subtitle, connected MCP tools, icon) is defined in `src/features/flow/lib/flow-data.ts`.

To add a new step, click the **+** affordance on the last node — the UI scaffolds both the graph node and a matching markdown file for you.

## Status

This repo is the **UI shell** for the larger Harness Agent Canvas vision. The visual flow, inspector, chat workspace, and agent list are in place. Local CLI execution, MCP routing, and persistent memory wiring are the next milestones (see `docs/ssot.md`).

## License

Private / unpublished.
