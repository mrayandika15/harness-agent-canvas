import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import type { Agent } from "@/features/agents/types/agent";
import type {
  AgentFlowResponse,
  SerializableFlowStep,
} from "@/features/flow/types/agent-flow";
import type { FlowStep } from "@/features/flow/types/flow-step";
import {
  addAgentFlowNode,
  deleteAgentFlowNode,
  getAgent,
  getAgentFlow,
  getAgentFlowMarkdown,
  updateAgentFlowNode,
} from "@/lib/server/agent-database";
import {
  serializeAgentFlow,
  serializeFlowStep,
} from "@/lib/server/agent-flow-serialization";
import {
  readAgentGraphifyFlow,
  writeAgentGraphifyGraph,
} from "@/lib/server/graphify-flow-adapter";
import { getFlowIcon, flowIconMap } from "@/features/flow/lib/flow-icons";
import { streamAgentGraphifyStructure } from "@/lib/server/local-agent-cli";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CanvasEditOperation =
  | {
      operation: "update_node";
      nodeId: string;
      patch: Partial<SerializableFlowStep> & { markdown?: string };
    }
  | {
      operation: "create_node";
      node: Partial<SerializableFlowStep> & { markdown?: string };
      markdown?: string;
    }
  | {
      operation: "select_node";
      nodeId: string;
    };

type AppliedPayload = {
  operation: CanvasEditOperation["operation"] | "replace_flow";
  label: string;
  node?: SerializableFlowStep;
  flow?: AgentFlowResponse;
  selectedNodeId?: string;
};

type GraphifyStructureNode = {
  id?: string;
  title: string;
  subtitle?: string;
  iconKey?: string;
  instructionStatus?: FlowStep["instructionStatus"];
  connectedMcp?: string[];
  sourceLinks?: string[];
  markdown?: string;
};

type GraphifyStructurePayload = {
  nodes?: GraphifyStructureNode[];
  selectedNodeId?: string;
};

type AssistantEditMode = "append" | "targeted" | "reset";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Flow assistant failed.";
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function getAssistantEditMode(
  prompt: string,
  flow: AgentFlowResponse,
  selectedNodeId?: string | null,
): AssistantEditMode {
  const normalized = prompt.toLowerCase();
  const changeIntent =
    /\b(simplif(?:y|ied)|reduce|shorten|smaller|clean(?:up| up)?|compact|dedup(?:e|licate)?|prune|rebuild|replace|refactor|condense|merge|trim)\b/.test(
      normalized,
    );
  const flowSubjectIntent =
    /\b(canvas|flow|pipeline|workflow|nodes?|steps?)\b/.test(normalized);
  const wholeFlowIntent =
    /\b(entire|whole|all|full|everything)\b[\s\S]{0,80}\b(canvas|flow|pipeline|workflow|nodes?|steps?)\b/.test(
      normalized,
    ) ||
    /\b(canvas|flow|pipeline|workflow)\b[\s\S]{0,80}\b(from scratch|reset|rebuild all|replace all)\b/.test(
      normalized,
    );
  const appendIntent = /\b(add|append|extend|insert|include|new)\b/.test(normalized);
  const mentionedNodeId = extractMentionedNodeId(prompt, flow);

  if (changeIntent && wholeFlowIntent && !appendIntent) {
    return "reset";
  }

  if (changeIntent && !appendIntent && !mentionedNodeId && !selectedNodeId && flowSubjectIntent) {
    return "reset";
  }

  if (changeIntent && !appendIntent) {
    return "targeted";
  }

  return "append";
}

function isDeleteIntent(prompt: string) {
  return /\b(delete|remove|drop)\b/i.test(prompt);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function statusValue(value: unknown): FlowStep["instructionStatus"] | undefined {
  return value === "draft" || value === "ready" || value === "review"
    ? value
    : undefined;
}

function iconKeyValue(value: unknown) {
  return typeof value === "string" && value in flowIconMap ? value : undefined;
}

function sanitizeId(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || `node-${randomUUID().slice(0, 8)}`
  );
}

function uniqueNodeId(baseId: string, flow: AgentFlowResponse) {
  const usedIds = new Set(flow.nodes.map((node) => node.id));
  let nextId = sanitizeId(baseId);
  let suffix = 2;

  while (usedIds.has(nextId)) {
    nextId = `${sanitizeId(baseId)}-${suffix}`;
    suffix += 1;
  }

  return nextId;
}

function parseOperation(line: string): CanvasEditOperation | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("```")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (!isRecord(parsed) || typeof parsed.operation !== "string") {
      return null;
    }

    if (parsed.operation === "update_node") {
      if (typeof parsed.nodeId !== "string" || !isRecord(parsed.patch)) {
        return null;
      }

      return {
        operation: "update_node",
        nodeId: parsed.nodeId,
        patch: normalizeNodePatch(parsed.patch),
      };
    }

    if (parsed.operation === "create_node") {
      if (!isRecord(parsed.node)) {
        return null;
      }

      return {
        operation: "create_node",
        node: normalizeNodePatch(parsed.node),
        markdown:
          typeof parsed.markdown === "string"
            ? parsed.markdown
            : typeof parsed.node.markdown === "string"
              ? parsed.node.markdown
              : undefined,
      };
    }

    if (parsed.operation === "select_node" && typeof parsed.nodeId === "string") {
      return {
        operation: "select_node",
        nodeId: parsed.nodeId,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function parseOperationsFromText(text: string) {
  const operations: CanvasEditOperation[] = [];
  const candidates = [
    text,
    ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map(
      (match) => match[1] ?? "",
    ),
  ];

  for (const candidate of candidates) {
    const parsed = parseJsonOperationCandidate(candidate);

    if (parsed.length > 0) {
      operations.push(...parsed);
    }
  }

  if (operations.length > 0) {
    return dedupeOperations(operations);
  }

  return text
    .split(/\r?\n/)
    .map(parseOperation)
    .filter((operation): operation is CanvasEditOperation => Boolean(operation));
}

function parseGraphifyStructureFromText(
  text: string,
  defaultMcpKey: string,
): GraphifyStructurePayload | null {
  const directPayload = parseDirectGraphifyStructure(text, defaultMcpKey);

  if (directPayload?.nodes?.length) {
    return directPayload;
  }

  const candidates = [
    text,
    ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map(
      (match) => match[1] ?? "",
    ),
    ...extractBalancedJsonChunks(text),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim()) as unknown;
      const payload = normalizeGraphifyStructurePayload(parsed, defaultMcpKey);

      if (payload?.nodes?.length) {
        return payload;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function parseDirectGraphifyStructure(
  text: string,
  defaultMcpKey: string,
): GraphifyStructurePayload | null {
  try {
    return normalizeGraphifyStructurePayload(JSON.parse(text.trim()), defaultMcpKey);
  } catch {
    return null;
  }
}

function normalizeGraphifyStructurePayload(
  value: unknown,
  defaultMcpKey: string,
): GraphifyStructurePayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawNodes = Array.isArray(value.nodes)
    ? value.nodes
    : isRecord(value.graph) && Array.isArray(value.graph.nodes)
      ? value.graph.nodes
      : [];
  const nodes = rawNodes
    .map((node) => normalizeGraphifyStructureNode(node, defaultMcpKey))
    .filter((node): node is GraphifyStructureNode => Boolean(node))
    .slice(0, 6);

  return {
    nodes,
    selectedNodeId:
      typeof value.selectedNodeId === "string"
        ? sanitizeId(value.selectedNodeId)
        : undefined,
  };
}

function normalizeGraphifyStructureNode(
  value: unknown,
  defaultMcpKey: string,
): GraphifyStructureNode | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawTitle =
    typeof value.title === "string"
      ? value.title.trim()
      : typeof value.label === "string"
        ? value.label.trim()
        : typeof value.name === "string"
          ? value.name.trim()
          : "";
  const title = cleanGeneratedTitle(rawTitle);

  if (!title) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? sanitizeId(value.id) : undefined,
    title,
    subtitle:
      typeof value.subtitle === "string"
        ? value.subtitle
        : typeof value.summary === "string"
          ? value.summary
          : undefined,
    iconKey: iconKeyValue(value.iconKey) ?? iconForTitle(title),
    instructionStatus: statusValue(value.instructionStatus) ?? "draft",
    connectedMcp: stringArray(value.connectedMcp) ?? [defaultMcpKey],
    sourceLinks: stringArray(value.sourceLinks) ?? [],
    markdown: typeof value.markdown === "string" ? value.markdown : undefined,
  };
}

function operationsFromGraphifyStructure(
  payload: GraphifyStructurePayload,
  defaultMcpKey: string,
): CanvasEditOperation[] {
  const nodes = payload.nodes ?? [];

  return nodes.map((node) => ({
    operation: "create_node",
    node: {
      id: node.id,
      step: "Agent",
      title: node.title,
      subtitle: node.subtitle ?? `${node.title} agent step coordinated by ${defaultMcpKey}`,
      iconKey: node.iconKey,
      instructionStatus: node.instructionStatus ?? "draft",
      connectedMcp: node.connectedMcp?.length ? node.connectedMcp : [defaultMcpKey],
      sourceLinks: node.sourceLinks ?? [],
    },
    markdown:
      node.markdown?.trim() ||
      markdownFromQuickWorkflow(
        node.title,
        node.subtitle ?? `${node.title} agent step coordinated by ${defaultMcpKey}`,
        `${defaultMcpKey} structure planning`,
        0,
        nodes.map((item) => item.title),
      ),
  }));
}

function parseJsonOperationCandidate(candidate: string) {
  const trimmed = candidate.trim();

  if (!trimmed) {
    return [];
  }

  const jsonChunks = [
    trimmed,
    ...extractBalancedJsonChunks(trimmed),
  ];

  for (const chunk of jsonChunks) {
    try {
      const parsed = JSON.parse(chunk) as unknown;
      const values = Array.isArray(parsed) ? parsed : [parsed];
      const operations = values
        .map((value) => operationFromUnknown(value))
        .filter((operation): operation is CanvasEditOperation => Boolean(operation));

      if (operations.length > 0) {
        return operations;
      }
    } catch {
      continue;
    }
  }

  return [];
}

function extractBalancedJsonChunks(text: string) {
  const chunks: string[] = [];
  const stack: string[] = [];
  let startIndex = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      if (stack.length === 0) {
        startIndex = index;
      }

      stack.push(char);
      continue;
    }

    if (char !== "}" && char !== "]") {
      continue;
    }

    const opener = stack[stack.length - 1];
    const isMatch = (opener === "{" && char === "}") || (opener === "[" && char === "]");

    if (!isMatch) {
      stack.length = 0;
      startIndex = -1;
      continue;
    }

    stack.pop();

    if (stack.length === 0 && startIndex >= 0) {
      chunks.push(text.slice(startIndex, index + 1));
      startIndex = -1;
    }
  }

  return chunks;
}

function operationFromUnknown(value: unknown): CanvasEditOperation | null {
  if (!isRecord(value) || typeof value.operation !== "string") {
    return null;
  }

  if (value.operation === "update_node") {
    if (typeof value.nodeId !== "string" || !isRecord(value.patch)) {
      return null;
    }

    return {
      operation: "update_node",
      nodeId: value.nodeId,
      patch: normalizeNodePatch(value.patch),
    };
  }

  if (value.operation === "create_node") {
    if (!isRecord(value.node)) {
      return null;
    }

    return {
      operation: "create_node",
      node: normalizeNodePatch(value.node),
      markdown:
        typeof value.markdown === "string"
          ? value.markdown
          : typeof value.node.markdown === "string"
            ? value.node.markdown
            : undefined,
    };
  }

  if (value.operation === "select_node" && typeof value.nodeId === "string") {
    return {
      operation: "select_node",
      nodeId: value.nodeId,
    };
  }

  return null;
}

function dedupeOperations(operations: CanvasEditOperation[]) {
  const seen = new Set<string>();

  return operations.filter((operation) => {
    const key = JSON.stringify(operation);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createQuickWorkflowOperations(prompt: string, flow: AgentFlowResponse) {
  if (!shouldUseQuickWorkflow(prompt)) {
    return [];
  }

  const workflowText = prompt
    .replace(/@\S+/g, " ")
    .replace(/\b(please|can you|make|create|build|generate|add|workflow|flow|agent|agents|step|steps|for|to|that|which|will|should)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const phrases = splitWorkflowPhrases(workflowText);
  const fallbackTitle = titleFromPrompt(prompt);
  const titles = (phrases.length ? phrases : [fallbackTitle])
    .map(toAgentStepTitle)
    .filter(Boolean)
    .slice(0, 6);

  if (titles.length === 0) {
    return [];
  }

  return titles.map((title, index): CanvasEditOperation => {
    const subtitle = buildQuickSubtitle(title, index, titles.length);

    return {
      operation: "create_node",
      node: {
        step: "Agent",
        title,
        subtitle,
        iconKey: iconForTitle(title),
        instructionStatus: "draft",
        connectedMcp: ["local-cli"],
        sourceLinks: [],
      },
      markdown: markdownFromQuickWorkflow(title, subtitle, prompt, index, titles),
    };
  });
}

function shouldUseQuickWorkflow(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\b(create|build|generate|add|make)\b/.test(normalized) &&
    /\b(workflow|flow|agent|agents|step|steps|pipeline)\b/.test(normalized)
  );
}

function splitWorkflowPhrases(value: string) {
  return value
    .split(/\s*(?:,|&|\+|->|→|\bthen\b|\band\b|\bafter\b)\s*/i)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length > 2)
    .filter((phrase) => !/\b(test|testing|verify|verification)\b/i.test(phrase));
}

function toAgentStepTitle(value: string) {
  const cleaned = cleanGeneratedTitle(value)
    .replace(/\b(website|websites)\b/gi, "Websites")
    .replace(/\bcsv\b/gi, "CSV")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(" ")
    .slice(0, 7)
    .map((word) =>
      word === word.toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

function cleanGeneratedTitle(value: string) {
  return value
    .replace(/^[^:\n]{3,80}:\s*\d+[\).:-]?\s*/i, "")
    .replace(/^\d+[\).:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildQuickSubtitle(title: string, index: number, total: number) {
  if (total === 1) {
    return `${title} agent step coordinated by the orchestrator`;
  }

  return `Step ${index + 1} of ${total} for the generated workflow`;
}

function iconForTitle(title: string) {
  const normalized = title.toLowerCase();

  if (/\b(scrape|crawl|collect|fetch|read)\b/.test(normalized)) {
    return "search";
  }

  if (/\b(filter|qualify|analyze|review|score)\b/.test(normalized)) {
    return "diamond";
  }

  if (/\b(export|csv|deploy|ship|send)\b/.test(normalized)) {
    return "zap";
  }

  if (/\b(guard|safe|policy|validate)\b/.test(normalized)) {
    return "shield";
  }

  return "code";
}

function markdownFromQuickWorkflow(
  title: string,
  subtitle: string,
  prompt: string,
  index: number,
  titles: string[],
) {
  const previous = titles[index - 1] ?? "the orchestrator";
  const next = titles[index + 1] ?? "the orchestrator final response";

  return `# ${title}

${subtitle}

This agent step was created from:

> ${prompt}

Work only on **${title}**. Use the handoff from **${previous}**, keep the response focused, and pass the useful result or blockers to **${next}**.

Write in the shape this step needs: short instructions, examples, policies, or handoff notes are all acceptable. Do not run unrelated tests or execute work from the canvas assistant.
`;
}

function createFallbackOperation({
  prompt,
  flow,
  selectedNodeId,
}: {
  prompt: string;
  flow: AgentFlowResponse;
  selectedNodeId?: string | null;
}): CanvasEditOperation | null {
  const targetId =
    extractMentionedNodeId(prompt, flow) ?? selectedNodeId ?? flow.nodes[0]?.id;
  const targetNode = targetId
    ? flow.nodes.find((node) => node.id === targetId)
    : undefined;

  if (!targetNode) {
    const title = titleFromPrompt(prompt);

    return {
      operation: "create_node",
      node: {
        step: "Agent",
        title,
        subtitle: "Agent step generated from the canvas assistant",
        iconKey: "code",
        instructionStatus: "draft",
        connectedMcp: ["local-cli"],
        sourceLinks: [],
      },
      markdown: markdownFromPrompt(title, prompt, false),
    };
  }

  const isOrchestrator = flow.nodes.findIndex((node) => node.id === targetNode.id) === 0;

  return {
    operation: "update_node",
    nodeId: targetNode.id,
    patch: {
      subtitle: prompt.slice(0, 150),
      instructionStatus: "review",
      markdown: markdownFromPrompt(targetNode.title, prompt, isOrchestrator),
    },
  };
}

function extractMentionedNodeId(prompt: string, flow: AgentFlowResponse) {
  const mentions = Array.from(prompt.matchAll(/@([a-zA-Z0-9_-]+)/g)).map(
    (match) => sanitizeId(match[1] ?? ""),
  );

  for (const mention of mentions) {
    const exactMatch = flow.nodes.find((node) => node.id === mention);

    if (exactMatch) {
      return exactMatch.id;
    }

    const partialMatch = flow.nodes.find((node) => {
      const searchable = `${node.id} ${sanitizeId(node.title)}`;

      return searchable.includes(mention);
    });

    if (partialMatch) {
      return partialMatch.id;
    }
  }

  return undefined;
}

function titleFromPrompt(prompt: string) {
  const words = prompt
    .replace(/@[a-zA-Z0-9_-]+/g, "")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

  if (words.length === 0) {
    return "New Agent Step";
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function markdownFromPrompt(title: string, prompt: string, isOrchestrator: boolean) {
  if (isOrchestrator) {
    return `# ${title}

${prompt}

Coordinate the downstream canvas agent steps in the order that makes sense for the user's request. Keep handoffs clear, preserve useful context, and ask for missing input before moving to a step that cannot run yet.
`;
  }

  return `# ${title}

${prompt}

Write this agent's behavior freely. Include only the instructions, examples, constraints, and handoff notes that make this step useful.
`;
}

function normalizeNodePatch(input: Record<string, unknown>) {
  const patch: Partial<SerializableFlowStep> & { markdown?: string } = {};
  const connectedMcp = stringArray(input.connectedMcp);
  const sourceLinks = stringArray(input.sourceLinks);
  const instructionStatus = statusValue(input.instructionStatus);
  const iconKey = iconKeyValue(input.iconKey);

  if (typeof input.id === "string") {
    patch.id = sanitizeId(input.id);
  }

  if (typeof input.step === "string") {
    patch.step = input.step.slice(0, 32);
  }

  if (typeof input.title === "string") {
    patch.title = input.title.slice(0, 80);
  }

  if (typeof input.subtitle === "string") {
    patch.subtitle = input.subtitle.slice(0, 160);
  }

  if (iconKey) {
    patch.iconKey = iconKey;
  }

  if (connectedMcp) {
    patch.connectedMcp = connectedMcp;
  }

  if (sourceLinks) {
    patch.sourceLinks = sourceLinks;
  }

  if (instructionStatus) {
    patch.instructionStatus = instructionStatus;
  }

  if (typeof input.markdown === "string") {
    patch.markdown = input.markdown;
  }

  return patch;
}

function createFallbackMarkdown(
  node: Pick<FlowStep, "title" | "subtitle">,
  isOrchestrator: boolean,
) {
  if (isOrchestrator) {
    return `# ${node.title}

${node.subtitle}

Coordinate the downstream agent steps for this harness. Keep routing, memory, and handoff context clear. Ask for missing input before moving to a step that cannot run yet.
`;
  }

  return `# ${node.title}

${node.subtitle}

Describe this agent step in the format that fits it best. Include only useful behavior, constraints, examples, and handoff notes.
`;
}

function getSerializedFlow(agent: Agent) {
  return serializeAgentFlow(getAgentFlow(agent.id));
}

function syncGraphifyCanvas(agent: Agent) {
  const flow = getSerializedFlow(agent);
  const markdownByNodeId = Object.fromEntries(
    flow.nodes.map((node) => [node.id, getAgentFlowMarkdown(agent.id, node.id)]),
  );

  writeAgentGraphifyGraph(agent, flow, markdownByNodeId);

  return flow;
}

function replaceAgentNodes(agent: Agent) {
  const currentFlow = readAgentGraphifyFlow(agent, getSerializedFlow(agent));
  const removableNodes = currentFlow.nodes.filter(
    (node, index) => index > 0 && node.step !== "Skill",
  );

  removableNodes.forEach((node) => {
    deleteAgentFlowNode(agent, node.id);
  });

  return {
    removedCount: removableNodes.length,
    flow: syncGraphifyCanvas(agent),
  };
}

function getTargetNodeId(
  prompt: string,
  flow: AgentFlowResponse,
  selectedNodeId?: string | null,
) {
  return extractMentionedNodeId(prompt, flow) ?? selectedNodeId ?? null;
}

function updateTargetNodeFromStructure({
  agent,
  targetNodeId,
  payload,
  defaultMcpKey,
}: {
  agent: Agent;
  targetNodeId: string;
  payload: GraphifyStructurePayload;
  defaultMcpKey: string;
}) {
  const node = payload.nodes?.[0];

  if (!node) {
    throw new Error("The selected MCP did not return a target node update.");
  }

  return applyOperation({
    agent,
    operation: {
      operation: "update_node",
      nodeId: targetNodeId,
      patch: {
        title: node.title,
        subtitle: node.subtitle ?? `${node.title} agent step coordinated by ${defaultMcpKey}`,
        iconKey: node.iconKey,
        instructionStatus: node.instructionStatus ?? "review",
        connectedMcp: node.connectedMcp?.length ? node.connectedMcp : [defaultMcpKey],
        sourceLinks: node.sourceLinks ?? [],
        markdown:
          node.markdown?.trim() ||
          markdownFromQuickWorkflow(
            node.title,
            node.subtitle ?? `${node.title} agent step coordinated by ${defaultMcpKey}`,
            `${defaultMcpKey} targeted update`,
            0,
            [node.title],
          ),
      },
    },
  });
}

function applyOperation({
  agent,
  operation,
}: {
  agent: Agent;
  operation: CanvasEditOperation;
}): AppliedPayload {
  const flow = readAgentGraphifyFlow(agent, getSerializedFlow(agent));

  if (operation.operation === "select_node") {
    const node = flow.nodes.find((item) => item.id === operation.nodeId);

    if (!node) {
      throw new Error(`Cannot select missing node "${operation.nodeId}".`);
    }

    return {
      operation: "select_node",
      selectedNodeId: node.id,
      label: `Selected ${node.title}`,
    };
  }

  if (operation.operation === "update_node") {
    const currentIndex = flow.nodes.findIndex((item) => item.id === operation.nodeId);
    const currentNode = flow.nodes[currentIndex];

    if (!currentNode) {
      throw new Error(`Cannot update missing node "${operation.nodeId}".`);
    }

    const patch = {
      ...operation.patch,
      step: currentIndex === 0 ? "Skill" : "Agent",
      iconKey: currentIndex === 0 ? "brain" : operation.patch.iconKey,
    };
    const updatedNode = updateAgentFlowNode(agent, currentNode.id, patch);

    if (!updatedNode) {
      throw new Error(`Unable to update "${currentNode.title}".`);
    }

    return {
      operation: "update_node",
      node: serializeFlowStep(updatedNode),
      flow: syncGraphifyCanvas(agent),
      selectedNodeId: updatedNode.id,
      label: `Updated ${updatedNode.title}`,
    };
  }

  const isFirstNode = flow.nodes.length === 0;
  const title = operation.node.title?.trim() || "New Agent Step";
  const nodeId = uniqueNodeId(operation.node.id || title, flow);
  const node: FlowStep = {
    id: nodeId,
    step: isFirstNode ? "Skill" : "Agent",
    title,
    subtitle:
      operation.node.subtitle?.trim() ||
      (isFirstNode
        ? "Routes every agent step from one local SKILL.md"
        : "Agent step coordinated by the orchestrator skill"),
    iconKey: isFirstNode ? "brain" : operation.node.iconKey ?? "code",
    icon: getFlowIcon(isFirstNode ? "brain" : operation.node.iconKey ?? "code"),
    connectedMcp: operation.node.connectedMcp ?? ["local-cli"],
    sourceLinks: operation.node.sourceLinks ?? [],
    instructionStatus: operation.node.instructionStatus ?? "draft",
  };
  const markdown =
    operation.markdown?.trim() ||
    operation.node.markdown?.trim() ||
    createFallbackMarkdown(node, isFirstNode);

  addAgentFlowNode(agent, node, markdown);
  const nextFlow = syncGraphifyCanvas(agent);

  return {
    operation: "create_node",
    node: serializeFlowStep(node),
    flow: nextFlow,
    selectedNodeId: node.id,
    label: `Created ${node.title}`,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await context.params;
  const agent = getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const activeAgent = agent;
  const body = (await request.json()) as {
    prompt?: string;
    selectedNodeId?: string | null;
    selectedMcpKey?: string | null;
  };
  const prompt = body.prompt?.trim() ?? "";
  const selectedMcpKey =
    typeof body.selectedMcpKey === "string" && body.selectedMcpKey.trim()
      ? sanitizeId(body.selectedMcpKey)
      : "local-cli";

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(encoder.encode(sse(event, data)));
        }

        const runId = randomUUID();
        let rawOutput = "";
        let appliedCount = 0;
        let replacedCount = 0;
        const appliedOperationKeys = new Set<string>();

        function applyParsedOperation(operation: CanvasEditOperation) {
          const operationKey = JSON.stringify(operation);

          if (appliedOperationKeys.has(operationKey)) {
            return;
          }

          appliedOperationKeys.add(operationKey);
          send("operation", { label: operationLabel(operation) });
          const applied = applyOperation({ agent: activeAgent, operation });
          appliedCount += applied.operation === "select_node" ? 0 : 1;
          send("applied", applied);
        }

        try {
          const flow = readAgentGraphifyFlow(activeAgent, getSerializedFlow(activeAgent));
          const editMode = getAssistantEditMode(prompt, flow, body.selectedNodeId);
          const targetNodeId = getTargetNodeId(prompt, flow, body.selectedNodeId);
          const markdownByNodeId = Object.fromEntries(
            flow.nodes.map((node) => [
              node.id,
              getAgentFlowMarkdown(activeAgent.id, node.id),
            ]),
          );

          send("started", { runId });
          send("thinking", { message: "Reading harness canvas" });
          send("thinking", {
            message:
              editMode === "reset"
                ? "Preparing full-flow reset"
                : editMode === "targeted"
                  ? "Preparing targeted node edit"
                  : `Calling ${selectedMcpKey} structure`,
          });

          if (editMode === "targeted" && !targetNodeId) {
            throw new Error(
              "Select a canvas node or mention it with @node-id before asking to replace, simplify, or delete it. Say \"entire flow\" if you want a full-flow reset.",
            );
          }

          if (
            editMode === "targeted" &&
            targetNodeId &&
            !flow.nodes.some((node) => node.id === targetNodeId)
          ) {
            throw new Error(`Cannot find target node "${targetNodeId}" on this canvas.`);
          }

          if (editMode === "targeted" && isDeleteIntent(prompt) && targetNodeId) {
            const targetNode = flow.nodes.find((node) => node.id === targetNodeId);

            if (!targetNode) {
              throw new Error(`Cannot delete missing node "${targetNodeId}".`);
            }

            send("operation", { label: `Deleting ${targetNode.title}` });
            const nextFlow = deleteAgentFlowNode(activeAgent, targetNode.id);

            if (!nextFlow) {
              throw new Error(`Cannot delete missing node "${targetNodeId}".`);
            }

            appliedCount = 1;
            send("applied", {
              operation: "replace_flow",
              label: `Deleted ${targetNode.title}`,
              flow: syncGraphifyCanvas(activeAgent),
              selectedNodeId: nextFlow.selectedNodeId ?? undefined,
            } satisfies AppliedPayload);
            send("done", {
              ok: true,
              appliedCount,
              editMode,
              replacedCount: 1,
              finalStepCount: nextFlow.nodes.length,
              finalAgentStepCount: nextFlow.nodes.filter((node) => node.step !== "Skill")
                .length,
              flow: readAgentGraphifyFlow(activeAgent, getSerializedFlow(activeAgent)),
            });
            return;
          }

          if (editMode === "reset") {
            const replacement = replaceAgentNodes(activeAgent);
            replacedCount = replacement.removedCount;
            send("applied", {
              operation: "replace_flow",
              label: `Removed ${replacedCount} existing node${
                replacedCount === 1 ? "" : "s"
              }`,
              flow: replacement.flow,
              selectedNodeId: replacement.flow.selectedNodeId ?? undefined,
            } satisfies AppliedPayload);
          }

          rawOutput = await streamAgentGraphifyStructure(
            activeAgent,
            flow,
            markdownByNodeId,
            prompt,
            body.selectedNodeId,
            selectedMcpKey,
            (delta) => {
              rawOutput += delta;
            },
          );

          const graphifyStructure = parseGraphifyStructureFromText(
            rawOutput,
            selectedMcpKey,
          );

          if (graphifyStructure?.nodes?.length) {
            send("thinking", { message: "Applying MCP structure" });

            if (editMode === "targeted" && targetNodeId) {
              send("operation", { label: `Updating ${targetNodeId}` });
              const applied = updateTargetNodeFromStructure({
                agent: activeAgent,
                targetNodeId,
                payload: graphifyStructure,
                defaultMcpKey: selectedMcpKey,
              });
              appliedCount += 1;
              send("applied", applied);
            } else {
              operationsFromGraphifyStructure(
                graphifyStructure,
                selectedMcpKey,
              ).forEach(applyParsedOperation);
            }
          }

          if (appliedCount === 0) {
            throw new Error(
              `The selected MCP did not return a canvas structure. Raw response length: ${rawOutput.length}.`,
            );
          }

          const finalFlow = readAgentGraphifyFlow(activeAgent, getSerializedFlow(activeAgent));

          send("done", {
            ok: true,
            appliedCount,
            editMode,
            replacedCount,
            finalStepCount: finalFlow.nodes.length,
            finalAgentStepCount: finalFlow.nodes.filter((node) => node.step !== "Skill")
              .length,
            flow: finalFlow,
          });
        } catch (error) {
          send("error", { error: getErrorMessage(error) });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    },
  );
}

function operationLabel(operation: CanvasEditOperation) {
  if (operation.operation === "create_node") {
    return `Creating ${operation.node.title ?? "new node"}`;
  }

  if (operation.operation === "update_node") {
    return `Updating ${operation.nodeId}`;
  }

  return `Selecting ${operation.nodeId}`;
}
