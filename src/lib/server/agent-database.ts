import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { Agent, AgentRuntime } from "@/features/agents/types/agent";
import type {
  ChatMessage,
  ChatMessageRole,
  ChatTimelineItem,
} from "@/features/chat/types/message";
import { createDummyMarkdownContent, flowSteps } from "@/features/flow/lib/flow-data";
import { getFlowIcon } from "@/features/flow/lib/flow-icons";
import type { FlowStep } from "@/features/flow/types/flow-step";
import { serializeAgentFlow } from "@/lib/server/agent-flow-serialization";
import {
  getAgentContentDir,
  pruneHarnessContent,
  removeAgentSkillFiles,
  removeNodeContentFile,
  removeNodeSkillFiles,
  slugify,
  syncNodeContentFile,
  syncProjectRuntimeSkills,
} from "@/lib/server/agent-flow-sync";
import { writeAgentGraphifyGraph } from "@/lib/server/graphify-flow-adapter";

type CreateAgentInput = {
  name: string;
  icon: string;
  personality: string;
  orchestratorMarkdown: string;
  runtime: AgentRuntime;
  color: string;
};

type StoredFlowNode = Omit<FlowStep, "icon"> & {
  markdown: string;
  sortOrder: number;
};

type StoredFlowEdge = {
  id: string;
  source: string;
  target: string;
  sortOrder: number;
};

export type AgentHarnessState = {
  nextNodeIndex: number;
  outputs: string[];
  updatedAt: string;
};

type StoredAgent = {
  id: string;
  name: string;
  icon?: string;
  personality?: string;
  runtime: AgentRuntime;
  status: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  flowNodes: StoredFlowNode[];
  flowEdges: StoredFlowEdge[];
  harnessState?: AgentHarnessState;
};

type Store = {
  agents: StoredAgent[];
  messages: ChatMessage[];
};

const STORE_DIR = "data";
const STORE_PATH = path.join(STORE_DIR, "harness-agent-canvas.json");
const HARNESS_CONTENT_ROOT = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "content",
  "harness",
);

let store: Store | null = null;

function now() {
  return new Date().toISOString();
}

function readJsonFile<T>(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readTextFile(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function titleFromMarkdown(markdown: string, fallback: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();

  return heading || titleFromSlug(fallback);
}

function subtitleFromMarkdown(markdown: string) {
  const line = markdown
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item && !item.startsWith("#") && !item.startsWith("---"));

  return line || "Harness Canvas step driven by Markdown.";
}

function isChatTimelineItem(item: unknown): item is ChatTimelineItem {
  if (!item || typeof item !== "object") {
    return false;
  }

  const candidate = item as ChatTimelineItem;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    ["complete", "running", "pending"].includes(candidate.status)
  );
}

function normalizeMessage(message: ChatMessage): ChatMessage {
  return {
    id: message.id,
    agentId: message.agentId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    timeline: Array.isArray(message.timeline)
      ? message.timeline.filter(isChatTimelineItem)
      : undefined,
  };
}

function toAgent(agent: StoredAgent): Agent {
  return {
    id: agent.id,
    name: agent.name,
    icon: agent.icon,
    personality: agent.personality,
    runtime: agent.runtime,
    memory: "",
    status: agent.status,
    color: agent.color,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

function toFlowStep(node: StoredFlowNode): FlowStep {
  return {
    id: node.id,
    step: node.step,
    title: node.title,
    subtitle: node.subtitle,
    iconKey: node.iconKey,
    icon: getFlowIcon(node.iconKey),
    connectedMcp: node.connectedMcp,
    sourceLinks: node.sourceLinks,
    instructionStatus: node.instructionStatus,
  };
}

function buildMarkdownDrivenAgent(agentDir: string): StoredAgent | null {
  const slug = path.basename(agentDir);
  const personality = readTextFile(path.join(agentDir, "PERSONALITY.md"));
  const markdownFiles = fs
    .readdirSync(agentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .filter((name) => name !== "PERSONALITY.md")
    .sort();

  if (!personality && markdownFiles.length === 0) {
    return null;
  }

  const timestamp = now();
  const nodes = markdownFiles.map((fileName, index): StoredFlowNode => {
    const id = fileName.replace(/\.md$/, "");
    const markdown = readTextFile(path.join(agentDir, fileName));
    const fallback = index === 0 ? "orchestrate" : id;

    return {
      id,
      step: index === 0 ? "Skill" : "Agent",
      title: titleFromMarkdown(markdown, fallback),
      subtitle: subtitleFromMarkdown(markdown),
      iconKey: index === 0 ? "brain" : "code",
      connectedMcp: ["local-cli", "claude-memory", "runtime-router"],
      sourceLinks: [],
      instructionStatus: index === 0 ? "ready" : "draft",
      markdown,
      sortOrder: index,
    };
  });

  return {
    id: slug,
    name: titleFromSlug(slug),
    icon: titleFromSlug(slug)
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    personality: personality || undefined,
    runtime: "codex",
    status: "Idle",
    color: "#F5944E",
    createdAt: timestamp,
    updatedAt: timestamp,
    flowNodes: nodes,
    flowEdges: buildEdges(nodes),
  };
}

function buildEdges(nodes: StoredFlowNode[]) {
  return nodes.slice(1).map((node, index) => {
    const previousNode = nodes[index];

    return {
      id: `${previousNode.id}-${node.id}`,
      source: previousNode.id,
      target: node.id,
      sortOrder: index,
    };
  });
}

function importMarkdownAgents(currentAgents: StoredAgent[]) {
  if (!fs.existsSync(HARNESS_CONTENT_ROOT)) {
    return currentAgents;
  }

  const agentsById = new Map(currentAgents.map((agent) => [agent.id, agent]));

  for (const entry of fs.readdirSync(HARNESS_CONTENT_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const importedAgent = buildMarkdownDrivenAgent(
      path.join(HARNESS_CONTENT_ROOT, entry.name),
    );

    if (!importedAgent || agentsById.has(importedAgent.id)) {
      continue;
    }

    agentsById.set(importedAgent.id, importedAgent);
  }

  return [...agentsById.values()];
}

function syncStoredAgentContentFiles(agent: StoredAgent) {
  const publicAgent = toAgent(agent);

  for (const node of agent.flowNodes) {
    syncNodeContentFile(publicAgent, toFlowStep(node), node.markdown);
  }
}

function syncStoredAgentContentFilesIfNeeded(agents: StoredAgent[]) {
  for (const agent of agents) {
    syncStoredAgentContentFiles(agent);
  }
}

function getStore() {
  if (store) {
    return store;
  }

  const persistedStore = readJsonFile<Partial<Store>>(STORE_PATH);
  store = {
    agents: importMarkdownAgents(persistedStore?.agents ?? []),
    messages: (persistedStore?.messages ?? []).map(normalizeMessage),
  };
  syncProjectRuntimeSkills();
  syncStoredAgentContentFilesIfNeeded(store.agents);
  saveStore();

  return store;
}

function saveStore() {
  if (!store) {
    return;
  }

  writeJsonFile(STORE_PATH, store);
}

function getStoredAgent(agentId: string) {
  return getStore().agents.find((agent) => agent.id === agentId) ?? null;
}

function getDefaultFlowNode() {
  return flowSteps[0];
}

function createDefaultFlow(agent: Agent, orchestratorMarkdown?: string): StoredFlowNode[] {
  const node = getDefaultFlowNode();

  if (!node) {
    return [];
  }

  const markdown = orchestratorMarkdown?.trim() || createDummyMarkdownContent(node);
  const storedNode: StoredFlowNode = {
    id: node.id,
    step: node.step,
    title: titleFromMarkdown(markdown, node.title),
    subtitle: subtitleFromMarkdown(markdown),
    iconKey: node.iconKey ?? "brain",
    connectedMcp: ["local-cli", "claude-memory", "runtime-router"],
    sourceLinks: node.sourceLinks,
    instructionStatus: node.instructionStatus,
    markdown,
    sortOrder: 0,
  };

  syncNodeContentFile(agent, toFlowStep(storedNode), markdown);

  return [storedNode];
}

function ensureOrchestratorSkillNode(agent: StoredAgent) {
  const rootIndex = agent.flowNodes.findIndex((node) => node.step === "Skill");
  const publicAgent = toAgent(agent);

  if (rootIndex === 0) {
    const rootNode = agent.flowNodes[0];
    const previousNode = toFlowStep(rootNode);
    const nextTitle = titleFromMarkdown(rootNode.markdown, rootNode.title);
    const nextSubtitle = subtitleFromMarkdown(rootNode.markdown);
    const changed =
      rootNode.id !== "orchestrate" ||
      rootNode.title !== nextTitle ||
      rootNode.subtitle !== nextSubtitle ||
      rootNode.iconKey !== "brain" ||
      rootNode.instructionStatus !== "ready" ||
      rootNode.sortOrder !== 0;

    if (!changed) {
      return false;
    }

    rootNode.id = "orchestrate";
    rootNode.title = nextTitle;
    rootNode.subtitle = nextSubtitle;
    rootNode.iconKey = "brain";
    rootNode.instructionStatus = "ready";
    rootNode.sortOrder = 0;
    syncNodeContentFile(publicAgent, toFlowStep(rootNode), rootNode.markdown, previousNode);
    agent.flowEdges = buildEdges(agent.flowNodes);

    return true;
  }

  const [rootNode] = createDefaultFlow(publicAgent);

  if (!rootNode) {
    return false;
  }

  const remainingNodes = agent.flowNodes.filter((_, index) => index !== rootIndex);

  agent.flowNodes = [rootNode, ...remainingNodes].map((node, index) => ({
    ...node,
    sortOrder: index,
  }));
  agent.flowEdges = buildEdges(agent.flowNodes);

  return true;
}

function syncAgentGraphifyOutput(agent: Agent) {
  const flow = serializeAgentFlow(getAgentFlow(agent.id));
  const markdownByNodeId = Object.fromEntries(
    flow.nodes.map((node) => [node.id, getAgentFlowMarkdown(agent.id, node.id)]),
  );

  writeAgentGraphifyGraph(agent, flow, markdownByNodeId);
}

export function listAgents() {
  const agentItems = getStore().agents.map(toAgent);

  if (agentItems.length > 0) {
    pruneHarnessContent(agentItems);
  }

  return agentItems;
}

export function getAgent(agentId: string) {
  const agent = getStoredAgent(agentId);

  return agent ? toAgent(agent) : null;
}

export function updateAgentStatus(agentId: string, status: string) {
  const agent = getStoredAgent(agentId);

  if (!agent) {
    return null;
  }

  agent.status = status;
  agent.updatedAt = now();
  saveStore();

  return toAgent(agent);
}

export function getAgentHarnessState(agentId: string) {
  const agent = getStoredAgent(agentId);

  if (!agent?.harnessState) {
    return null;
  }

  return {
    nextNodeIndex: agent.harnessState.nextNodeIndex,
    outputs: [...agent.harnessState.outputs],
    updatedAt: agent.harnessState.updatedAt,
  };
}

export function updateAgentHarnessState(
  agentId: string,
  state: Pick<AgentHarnessState, "nextNodeIndex" | "outputs">,
) {
  const agent = getStoredAgent(agentId);

  if (!agent) {
    return null;
  }

  agent.harnessState = {
    nextNodeIndex: state.nextNodeIndex,
    outputs: [...state.outputs],
    updatedAt: now(),
  };
  agent.updatedAt = now();
  saveStore();

  return agent.harnessState;
}

export function clearAgentHarnessState(agentId: string) {
  const agent = getStoredAgent(agentId);

  if (!agent) {
    return false;
  }

  if (!agent.harnessState) {
    return true;
  }

  delete agent.harnessState;
  agent.updatedAt = now();
  saveStore();

  return true;
}

export function createAgent(input: CreateAgentInput) {
  const createdAt = now();
  const agent: Agent = {
    id: slugify(input.name) || randomUUID(),
    name: input.name,
    icon: input.icon,
    personality: input.personality,
    runtime: input.runtime,
    memory: "",
    status: "Idle",
    color: input.color,
    createdAt,
    updatedAt: createdAt,
  };
  const store = getStore();
  const storedAgent: StoredAgent = {
    id: agent.id,
    name: agent.name,
    icon: agent.icon,
    personality: agent.personality,
    runtime: agent.runtime,
    status: agent.status,
    color: agent.color,
    createdAt,
    updatedAt: createdAt,
    flowNodes: createDefaultFlow(agent, input.orchestratorMarkdown),
    flowEdges: [],
  };

  store.agents.push(storedAgent);
  saveStore();
  syncAgentGraphifyOutput(agent);

  return agent;
}

export function deleteAgent(agentId: string) {
  const store = getStore();
  const agent = getAgent(agentId);
  const previousLength = store.agents.length;

  if (agent) {
    removeAgentSkillFiles(agent);
  }

  store.agents = store.agents.filter((item) => item.id !== agentId);
  store.messages = store.messages.filter((message) => message.agentId !== agentId);
  saveStore();

  return store.agents.length < previousLength;
}

export function listMessages(agentId: string) {
  return getStore()
    .messages.filter((message) => message.agentId === agentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function deleteAgentMessages(agentId: string) {
  const store = getStore();
  const previousLength = store.messages.length;

  store.messages = store.messages.filter((message) => message.agentId !== agentId);
  saveStore();

  return previousLength - store.messages.length;
}

export function getRecentMessages(agentId: string, limit = 8) {
  return listMessages(agentId).slice(-limit);
}

export function createMessage(
  agentId: string,
  role: ChatMessageRole,
  content: string,
  metadata?: { timeline?: ChatTimelineItem[] },
) {
  const message: ChatMessage = {
    id: randomUUID(),
    agentId,
    role,
    content,
    createdAt: now(),
    timeline: metadata?.timeline,
  };

  getStore().messages.push(message);
  saveStore();

  return message;
}

export function isDuplicateAgentName(name: string) {
  const normalizedName = name.trim().toLowerCase();

  return getStore().agents.some(
    (agent) => agent.name.trim().toLowerCase() === normalizedName,
  );
}

export function getAgentFlow(agentId: string) {
  const agent = getStoredAgent(agentId);

  if (!agent) {
    return { nodes: [], edges: [], selectedNodeId: null };
  }

  if (ensureOrchestratorSkillNode(agent)) {
    agent.updatedAt = now();
    saveStore();
  }

  const nodes = [...agent.flowNodes]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toFlowStep);
  const edges = [...agent.flowEdges]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ id, source, target }) => ({ id, source, target }));

  return {
    nodes,
    edges,
    selectedNodeId: nodes[0]?.id ?? null,
  };
}

export function getAgentFlowMarkdown(agentId: string, nodeId: string) {
  const agent = getStoredAgent(agentId);
  const node = agent?.flowNodes.find((item) => item.id === nodeId);

  if (node) {
    return node.markdown;
  }

  const publicAgent = agent ? toAgent(agent) : null;
  const filePath = publicAgent
    ? path.join(getAgentContentDir(publicAgent), `${slugify(nodeId)}.md`)
    : "";

  return filePath ? readTextFile(filePath) : "";
}

export function updateAgentFlowNode(
  agent: Agent,
  nodeId: string,
  patch: Partial<
    Pick<
      FlowStep,
      "step" | "title" | "subtitle" | "iconKey" | "connectedMcp" | "sourceLinks" | "instructionStatus"
    >
  > & { markdown?: string },
) {
  const storedAgent = getStoredAgent(agent.id);
  const node = storedAgent?.flowNodes.find((item) => item.id === nodeId);

  if (!storedAgent || !node) {
    return null;
  }

  const previousNode = toFlowStep(node);

  node.step = patch.step ?? node.step;
  node.title = patch.title ?? node.title;
  node.subtitle = patch.subtitle ?? node.subtitle;
  node.iconKey = patch.iconKey ?? node.iconKey;
  node.connectedMcp = patch.connectedMcp ?? node.connectedMcp;
  node.sourceLinks = patch.sourceLinks ?? node.sourceLinks;
  node.instructionStatus = patch.instructionStatus ?? node.instructionStatus;
  node.markdown = patch.markdown ?? node.markdown;
  storedAgent.updatedAt = now();

  const nextNode = toFlowStep(node);

  syncNodeContentFile(agent, nextNode, node.markdown, previousNode);
  saveStore();

  return nextNode;
}

export function addAgentFlowNode(agent: Agent, node: FlowStep, markdown: string) {
  const storedAgent = getStoredAgent(agent.id);

  if (!storedAgent) {
    return getAgentFlow(agent.id);
  }

  const sortOrder = storedAgent.flowNodes.length;
  const storedNode: StoredFlowNode = {
    id: node.id,
    step: node.step,
    title: node.title,
    subtitle: node.subtitle,
    iconKey: node.iconKey ?? "code",
    connectedMcp: node.connectedMcp,
    sourceLinks: node.sourceLinks,
    instructionStatus: node.instructionStatus,
    markdown,
    sortOrder,
  };

  storedAgent.flowNodes.push(storedNode);

  const previousNode = storedAgent.flowNodes[sortOrder - 1];

  if (previousNode) {
    storedAgent.flowEdges.push({
      id: `${previousNode.id}-${storedNode.id}`,
      source: previousNode.id,
      target: storedNode.id,
      sortOrder: sortOrder - 1,
    });
  }

  storedAgent.updatedAt = now();
  syncNodeContentFile(agent, toFlowStep(storedNode), markdown);
  saveStore();

  return getAgentFlow(agent.id);
}

export function deleteAgentFlowNode(agent: Agent, nodeId: string) {
  const storedAgent = getStoredAgent(agent.id);
  const nodeIndex =
    storedAgent?.flowNodes.findIndex((node) => node.id === nodeId) ?? -1;
  const node = storedAgent?.flowNodes[nodeIndex];

  if (!storedAgent || !node) {
    return null;
  }

  if (nodeIndex === 0 || node.step === "Skill") {
    throw new Error("The root Skill node cannot be deleted.");
  }

  storedAgent.flowNodes = storedAgent.flowNodes
    .filter((item) => item.id !== node.id)
    .map((item, index) => ({ ...item, sortOrder: index }));
  storedAgent.flowEdges = buildEdges(storedAgent.flowNodes);
  storedAgent.updatedAt = now();

  removeNodeSkillFiles(agent, node);
  removeNodeContentFile(agent, node);
  saveStore();
  syncAgentGraphifyOutput(agent);

  return getAgentFlow(agent.id);
}
