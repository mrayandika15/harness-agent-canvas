import fs from "node:fs";
import path from "node:path";

import type { Agent } from "@/features/agents/types/agent";
import type {
  AgentFlowResponse,
  SerializableFlowStep,
} from "@/features/flow/types/agent-flow";
import { slugify } from "@/lib/server/agent-flow-sync";

type GraphifyNode = {
  id?: unknown;
  label?: unknown;
  name?: unknown;
  title?: unknown;
  type?: unknown;
  path?: unknown;
  content?: unknown;
  summary?: unknown;
  metadata?: unknown;
};

type GraphifyEdge = {
  id?: unknown;
  source?: unknown;
  target?: unknown;
  from?: unknown;
  to?: unknown;
  relation?: unknown;
  type?: unknown;
  metadata?: unknown;
};

type GraphifyGraph = {
  metadata?: Record<string, unknown>;
  nodes?: GraphifyNode[];
  edges?: GraphifyEdge[];
  links?: GraphifyEdge[];
};

const HARNESS_CONTENT_ROOT = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "content",
  "harness",
);
const GRAPHIFY_DIR_NAME = "graphify-out";
const GRAPHIFY_GRAPH_FILE = "graph.json";
const GRAPHIFY_HTML_FILE = "graph.html";
const GRAPHIFY_REPORT_FILE = "GRAPH_REPORT.md";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function instructionStatusValue(value: unknown) {
  return value === "draft" || value === "ready" || value === "review"
    ? value
    : "draft";
}

function getAgentContentDir(agent: Agent) {
  return path.join(HARNESS_CONTENT_ROOT, slugify(agent.name || agent.id));
}

function getAgentGraphifyDir(agent: Agent) {
  return path.join(getAgentContentDir(agent), GRAPHIFY_DIR_NAME);
}

export function getAgentGraphifyGraphPath(agent: Agent) {
  return path.join(getAgentGraphifyDir(agent), GRAPHIFY_GRAPH_FILE);
}

export function getAgentGraphifyOutput(agent: Agent) {
  const graphifyDir = getAgentGraphifyDir(agent);

  return {
    dir: path.relative(process.cwd(), graphifyDir),
    graph: path.relative(process.cwd(), path.join(graphifyDir, GRAPHIFY_GRAPH_FILE)),
    html: path.relative(process.cwd(), path.join(graphifyDir, GRAPHIFY_HTML_FILE)),
    report: path.relative(process.cwd(), path.join(graphifyDir, GRAPHIFY_REPORT_FILE)),
  };
}

function getNodeMarkdownPath(agent: Agent, node: Pick<SerializableFlowStep, "id" | "title">) {
  return path.join(
    getAgentContentDir(agent),
    `${slugify(node.title || node.id)}.md`,
  );
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function getHarnessMetadata(node: GraphifyNode) {
  const metadata = isRecord(node.metadata) ? node.metadata : {};
  const harness = isRecord(metadata.harness) ? metadata.harness : {};

  return harness;
}

function getGraphifyNodeId(node: GraphifyNode, index: number) {
  return (
    stringValue(node.id) ??
    slugify(
      stringValue(node.label) ??
        stringValue(node.name) ??
        stringValue(node.title) ??
        `node-${index + 1}`,
    )
  );
}

function graphifyNodeToFlowStep(node: GraphifyNode, index: number): SerializableFlowStep {
  const harness = getHarnessMetadata(node);
  const id = getGraphifyNodeId(node, index);
  const step =
    stringValue(harness.step) ??
    (index === 0 || stringValue(node.type)?.toLowerCase() === "skill"
      ? "Skill"
      : "Agent");
  const title =
    stringValue(harness.title) ??
    stringValue(node.title) ??
    stringValue(node.label) ??
    stringValue(node.name) ??
    (step === "Skill" ? "Orchestrate Requests" : `Agent Step ${index}`);

  return {
    id,
    step,
    title,
    subtitle:
      stringValue(harness.subtitle) ??
      stringValue(node.summary) ??
      (step === "Skill"
        ? "Routes every agent step from one local SKILL.md"
        : "Agent step coordinated by the orchestrator skill"),
    iconKey: stringValue(harness.iconKey) ?? (step === "Skill" ? "brain" : "code"),
    connectedMcp: stringArray(harness.connectedMcp),
    sourceLinks: stringArray(harness.sourceLinks),
    instructionStatus: instructionStatusValue(harness.instructionStatus),
  };
}

function graphifyEdgeToFlowEdge(edge: GraphifyEdge, index: number) {
  const source = stringValue(edge.source) ?? stringValue(edge.from);
  const target = stringValue(edge.target) ?? stringValue(edge.to);

  if (!source || !target) {
    return null;
  }

  return {
    id: stringValue(edge.id) ?? `${source}-${target}-${index}`,
    source,
    target,
  };
}

function sortHarnessNodes(nodes: SerializableFlowStep[], graphNodes: GraphifyNode[]) {
  return nodes
    .map((node, index) => {
      const harness = getHarnessMetadata(graphNodes[index] ?? {});
      const order = typeof harness.sortOrder === "number" ? harness.sortOrder : index;

      return { node, order };
    })
    .sort((left, right) => left.order - right.order)
    .map(({ node }) => node);
}

function readGraphifyGraph(agent: Agent) {
  return readJsonFile<GraphifyGraph>(getAgentGraphifyGraphPath(agent));
}

export function readAgentGraphifyFlow(
  agent: Agent,
  fallbackFlow?: AgentFlowResponse,
): AgentFlowResponse {
  const graph = readGraphifyGraph(agent);

  if (!graph?.nodes?.length) {
    return fallbackFlow ?? { nodes: [], edges: [], selectedNodeId: null };
  }

  const nodes = sortHarnessNodes(
    graph.nodes.map(graphifyNodeToFlowStep),
    graph.nodes,
  );
  const edges = (graph.edges ?? graph.links ?? [])
    .map(graphifyEdgeToFlowEdge)
    .filter((edge): edge is AgentFlowResponse["edges"][number] => Boolean(edge));
  const orderedEdges =
    edges.length > 0
      ? edges
      : nodes.slice(0, -1).map((node, index) => ({
          id: `${node.id}-${nodes[index + 1].id}`,
          source: node.id,
          target: nodes[index + 1].id,
        }));

  return {
    nodes,
    edges: orderedEdges,
    selectedNodeId: nodes[0]?.id ?? null,
  };
}

export function readAgentGraphifyNodeMarkdown(agent: Agent, nodeId: string) {
  const graph = readGraphifyGraph(agent);
  const node = graph?.nodes?.find((item, index) => getGraphifyNodeId(item, index) === nodeId);

  if (!node) {
    return "";
  }

  if (typeof node.content === "string") {
    return node.content;
  }

  if (typeof node.path === "string") {
    const resolvedPath = path.isAbsolute(node.path)
      ? node.path
      : path.join(/*turbopackIgnore: true*/ process.cwd(), node.path);

    try {
      return fs.readFileSync(resolvedPath, "utf8");
    } catch {
      return "";
    }
  }

  return "";
}

export function writeAgentGraphifyGraph(
  agent: Agent,
  flow: AgentFlowResponse,
  markdownByNodeId: Record<string, string>,
) {
  const graphifyDir = getAgentGraphifyDir(agent);
  const agentContentDir = getAgentContentDir(agent);

  fs.mkdirSync(graphifyDir, { recursive: true });
  fs.mkdirSync(path.join(graphifyDir, "cache"), { recursive: true });

  const graph: GraphifyGraph = {
    metadata: {
      format: "graphify",
      source: "harness-agent-canvas",
      generatedAt: new Date().toISOString(),
      agent: {
        id: agent.id,
        name: agent.name,
        runtime: agent.runtime,
      },
    },
    nodes: flow.nodes.map((node, index) => {
      const markdown = markdownByNodeId[node.id] ?? "";
      const markdownPath = getNodeMarkdownPath(agent, node);
      const relativeMarkdownPath = path.relative(process.cwd(), markdownPath);

      if (markdown) {
        fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
        fs.writeFileSync(markdownPath, markdown.trimEnd() + "\n", "utf8");
      }

      return {
        id: node.id,
        label: node.title,
        type: node.step === "Skill" ? "skill" : "agent_step",
        path: relativeMarkdownPath,
        content: markdown,
        summary: node.subtitle,
        metadata: {
          harness: {
            sortOrder: index,
            step: node.step,
            title: node.title,
            subtitle: node.subtitle,
            iconKey: node.iconKey,
            connectedMcp: node.connectedMcp,
            sourceLinks: node.sourceLinks,
            instructionStatus: node.instructionStatus,
          },
        },
      };
    }),
    edges: flow.edges.map((edge, index) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relation: "next",
      type: "harness_sequence",
      metadata: {
        harness: {
          sortOrder: index,
        },
      },
    })),
  };

  fs.writeFileSync(
    path.join(graphifyDir, GRAPHIFY_GRAPH_FILE),
    `${JSON.stringify(graph, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(graphifyDir, GRAPHIFY_REPORT_FILE),
    buildGraphifyReport(agent, flow),
    "utf8",
  );
  fs.writeFileSync(
    path.join(graphifyDir, GRAPHIFY_HTML_FILE),
    buildGraphifyHtml(agent, flow),
    "utf8",
  );

  return graph;
}

export function ensureAgentGraphifyGraph(
  agent: Agent,
  flow: AgentFlowResponse,
  markdownByNodeId: Record<string, string>,
) {
  if (fs.existsSync(getAgentGraphifyGraphPath(agent))) {
    return;
  }

  writeAgentGraphifyGraph(agent, flow, markdownByNodeId);
}

function buildGraphifyReport(agent: Agent, flow: AgentFlowResponse) {
  const nodes = flow.nodes.length
    ? flow.nodes
        .map((node, index) => `${index + 1}. ${node.title} (${node.step})`)
        .join("\n")
    : "No harness nodes.";

  return `# ${agent.name} Harness Graph

Runtime: ${agent.runtime}
Nodes: ${flow.nodes.length}
Edges: ${flow.edges.length}

## Canvas Order

${nodes}

## Graphify MCP

Run this graph with:

\`\`\`bash
python -m graphify.serve content/harness/${slugify(agent.name || agent.id)}/graphify-out/graph.json
\`\`\`
`;
}

function buildGraphifyHtml(agent: Agent, flow: AgentFlowResponse) {
  const graphData = JSON.stringify(
    {
      agent: {
        id: agent.id,
        name: agent.name,
        runtime: agent.runtime,
      },
      nodes: flow.nodes,
      edges: flow.edges,
    },
    null,
    2,
  );

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(agent.name)} Harness Graph</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #070707;
        --panel: #111;
        --line: rgba(255,255,255,0.12);
        --text: rgba(255,255,255,0.86);
        --muted: rgba(255,255,255,0.46);
        --accent: #f5944e;
        --ready: #95e8d7;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 30% 20%, rgba(245,148,78,0.12), transparent 30%),
          linear-gradient(180deg, #101010, var(--bg));
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
        padding: 48px 0;
      }
      header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-end;
        border-bottom: 1px solid var(--line);
        padding-bottom: 24px;
      }
      h1 {
        margin: 0;
        font-size: clamp(32px, 5vw, 64px);
        letter-spacing: -0.06em;
      }
      .eyebrow {
        margin: 0 0 10px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }
      .meta {
        color: var(--muted);
        font-size: 14px;
      }
      .graph {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-top: 32px;
      }
      .node {
        min-height: 180px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
        padding: 18px;
      }
      .node:first-child {
        border-color: rgba(245,148,78,0.55);
        background: linear-gradient(180deg, rgba(245,148,78,0.18), rgba(255,255,255,0.025));
        box-shadow: 0 26px 70px rgba(245,148,78,0.12);
      }
      .node-type {
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h2 {
        margin: 12px 0 10px;
        font-size: 22px;
        letter-spacing: -0.04em;
      }
      p {
        color: var(--muted);
        line-height: 1.55;
      }
      .status {
        display: inline-flex;
        margin-top: 18px;
        border: 1px solid rgba(149,232,215,0.25);
        border-radius: 999px;
        padding: 5px 10px;
        color: var(--ready);
        font-size: 12px;
        font-weight: 700;
      }
      pre {
        margin-top: 32px;
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(0,0,0,0.35);
        padding: 18px;
        color: rgba(255,255,255,0.68);
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <p class="eyebrow">Graphify Harness</p>
          <h1>${escapeHtml(agent.name)}</h1>
        </div>
        <div class="meta">${escapeHtml(agent.runtime)} runtime · ${flow.nodes.length} node${flow.nodes.length === 1 ? "" : "s"}</div>
      </header>
      <section class="graph">
        ${flow.nodes
          .map(
            (node) => `<article class="node">
          <div class="node-type">${escapeHtml(node.step)}</div>
          <h2>${escapeHtml(node.title)}</h2>
          <p>${escapeHtml(node.subtitle)}</p>
          <span class="status">${escapeHtml(node.instructionStatus)}</span>
        </article>`,
          )
          .join("\n")}
      </section>
      <pre>${escapeHtml(graphData)}</pre>
    </main>
  </body>
</html>
`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
