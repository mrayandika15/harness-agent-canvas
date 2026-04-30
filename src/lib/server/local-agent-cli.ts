import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import type { Agent, AgentRuntime } from "@/features/agents/types/agent";
import type { ChatMessage } from "@/features/chat/types/message";
import type { AgentFlowResponse } from "@/features/flow/types/agent-flow";
import type {
  HarnessMcpContext,
  HarnessNodeContext,
} from "@/lib/server/harness-mcp-client";
import {
  getClaudeMemAgentContext,
  recordClaudeMemAgentExchange,
} from "@/lib/server/claude-mem";
import {
  getProjectAgentCreatorSkillRef,
  getProjectCanvasSkillRef,
  getProjectChatSkillRef,
} from "@/lib/server/agent-flow-sync";

const execFileAsync = promisify(execFile);
const CLI_TIMEOUT_MS = 120_000;
type DeltaHandler = (delta: string) => void;

function stripMarkdownFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function buildSystemPrompt(agent: Agent, claudeMemContext = "") {
  return [
    `You are ${agent.name}, a local CLI-backed agent inside Harness Agent Canvas.`,
    "Respond concisely and technically.",
    "Do not modify files, run commands, or claim to have performed side effects from this chat.",
    "",
    "## Personality",
    agent.personality?.trim() || "No custom personality has been provided.",
    "",
    "## Claude-Mem Project Memory",
    claudeMemContext.trim() ||
      "No Claude-Mem context was available for this request.",
  ].join("\n");
}

function buildConversationContext(messages: ChatMessage[]) {
  if (messages.length === 0) {
    return "No recent conversation.";
  }

  return messages
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n\n");
}

function buildRuntimePrompt(
  agent: Agent,
  recentMessages: ChatMessage[],
  userMessage: string,
  harnessContext?: HarnessMcpContext,
  claudeMemContext = "",
) {
  return [
    buildSystemPrompt(agent, claudeMemContext),
    "",
    "## Harness Canvas MCP Context",
    harnessContext ? buildHarnessContext(harnessContext) : "No harness canvas context was provided.",
    "",
    "## Recent Conversation",
    buildConversationContext(recentMessages),
    "",
    "## New User Message",
    userMessage,
    "",
    "## Response Contract",
    "Use the Harness Canvas MCP context as the source of truth.",
    "Respond with a concise sequential plan that walks the nodes one by one.",
    "Do not claim to edit files, update nodes, run commands, or mutate the canvas.",
  ].join("\n");
}

function buildNodeRuntimePrompt(
  agent: Agent,
  recentMessages: ChatMessage[],
  userMessage: string,
  harnessContext: HarnessMcpContext,
  node: HarnessNodeContext,
  nodeIndex: number,
  previousOutputs: string[],
  claudeMemContext = "",
) {
  const runtimeSkill = getProjectChatSkillRef(agent.runtime);

  return [
    "Use the project-local Harness Agent Canvas chat skill for this request.",
    `Chat skill name: ${runtimeSkill.name}`,
    `Chat skill file: ${runtimeSkill.path}`,
    "Treat the chat skill as the behavior contract. Treat the sections below as data for this run.",
    "",
    "## Agent Data",
    `Agent name: ${agent.name}`,
    `Runtime: ${agent.runtime}`,
    "",
    "Personality:",
    agent.personality?.trim() || "No custom personality has been provided.",
    "",
    "Claude-Mem Project Memory:",
    claudeMemContext.trim() ||
      "No Claude-Mem context was available for this request.",
    "",
    "## Harness State",
    `Current step: ${nodeIndex + 1} of ${harnessContext.nodes.length}`,
    `Current node title: ${node.title}`,
    `Current node id: ${node.id}`,
    `Current node status: ${node.instructionStatus}`,
    `Connected MCP tags: ${node.connectedMcp.join(", ") || "None"}`,
    `Sources: ${node.sourceLinks.join(", ") || "None"}`,
    "",
    "## Full Harness Order",
    harnessContext.nodes
      .map((orderedNode, index) =>
        index === nodeIndex
          ? `${index + 1}. ${orderedNode.title}  <-- current`
          : `${index + 1}. ${orderedNode.title}`,
      )
      .join("\n"),
    "",
    "## User Input For This Step",
    userMessage,
    "",
    "## Recent Conversation",
    buildConversationContext(recentMessages),
    "",
    "## Previous Completed Node Outputs",
    previousOutputs.length
      ? previousOutputs
          .map((output, index) => `### Completed Node ${index + 1}\n${output}`)
          .join("\n\n")
      : "No earlier nodes have completed yet.",
    "",
    "## Current Node Markdown",
    node.markdown.trim() || "No markdown saved.",
  ].join("\n");
}

function buildHarnessContext(harnessContext: HarnessMcpContext) {
  if (harnessContext.nodes.length === 0) {
    return "The selected agent has no harness nodes.";
  }

  return harnessContext.nodes
    .map((node, index) =>
      [
        `### Node ${index + 1}: ${node.title}`,
        `ID: ${node.id}`,
        `Step: ${node.step}`,
        `Status: ${node.instructionStatus}`,
        `Subtitle: ${node.subtitle}`,
        `Connected MCP tags: ${node.connectedMcp.join(", ") || "None"}`,
        `Sources: ${node.sourceLinks.join(", ") || "None"}`,
        "",
        "Markdown:",
        node.markdown.trim() || "No markdown saved.",
      ].join("\n"),
    )
    .join("\n\n---\n\n");
}

function buildCanvasEditPrompt({
  agent,
  flow,
  markdownByNodeId,
  userPrompt,
  selectedNodeId,
  claudeMemContext = "",
}: {
  agent: Agent;
  flow: AgentFlowResponse;
  markdownByNodeId: Record<string, string>;
  userPrompt: string;
  selectedNodeId?: string | null;
  claudeMemContext?: string;
}) {
  const canvasSkill = getProjectCanvasSkillRef(agent.runtime);

  return [
    buildSystemPrompt(agent, claudeMemContext),
    "",
    "## Project Canvas Skill",
    `Canvas skill name: ${canvasSkill.name}`,
    `Canvas skill file: ${canvasSkill.path}`,
    "Use this project-local canvas skill as the behavior contract for Graphify canvas editing.",
    "",
    "## Task",
    "Edit the Harness Canvas by emitting strict JSON Lines operations.",
    "All workflow edits must preserve the Graphify MCP node schema used by this project.",
    "Return only JSON objects, one per line. Do not wrap in Markdown fences. Do not explain.",
    "Allowed operations are create_node, update_node, and select_node.",
    "Never delete or reorder nodes.",
    "Node index 0 is always the root orchestrator SKILL.md. Preserve it as the only Skill node.",
    "Every created node after index 0 must be an Agent step with step set to Agent.",
    "",
    "## Operation Schemas",
    `{"operation":"update_node","nodeId":"existing-node-id","patch":{"title":"New title","subtitle":"Short subtitle","instructionStatus":"draft|ready|review","connectedMcp":["tool"],"sourceLinks":[],"markdown":"# Markdown"}}`,
    `{"operation":"create_node","node":{"id":"optional-kebab-id","step":"Agent","title":"Agent Step Title","subtitle":"Short subtitle","iconKey":"code|diamond|search|shield|zap","instructionStatus":"draft|ready|review","connectedMcp":["local-cli"],"sourceLinks":[]},"markdown":"# Markdown"}`,
    `{"operation":"select_node","nodeId":"existing-or-created-node-id"}`,
    "",
    "## Current Selection",
    selectedNodeId ?? "No node selected",
    "",
    "## Current Flow",
    JSON.stringify(
      flow.nodes.map((node) => ({
        ...node,
        markdown: markdownByNodeId[node.id] ?? "",
      })),
      null,
      2,
    ),
    "",
    "## User Request",
    userPrompt,
    "",
    "## Rules",
    "If the request mentions @id, target that node id.",
    "If no target is mentioned and a node is selected, update the selected node.",
    "If the request asks for a new skill or new agent, create exactly one Agent node unless more are explicitly requested.",
    "For node index 0, Markdown should be root SKILL.md orchestration instructions that route all agent steps.",
    "For later nodes, write natural agent-step instructions in whatever structure best fits the user's requested workflow.",
    "Do not force a Purpose/Inputs/Workflow/Outputs/Success Criteria template unless the user asks for that format.",
  ].join("\n");
}

function buildGraphifyStructurePrompt({
  agent,
  flow,
  markdownByNodeId,
  userPrompt,
  selectedNodeId,
  selectedMcpKey,
  claudeMemContext = "",
}: {
  agent: Agent;
  flow: AgentFlowResponse;
  markdownByNodeId: Record<string, string>;
  userPrompt: string;
  selectedNodeId?: string | null;
  selectedMcpKey: string;
  claudeMemContext?: string;
}) {
  const canvasSkill = getProjectCanvasSkillRef(agent.runtime);

  return [
    buildSystemPrompt(agent, claudeMemContext),
    "",
    "## Project Canvas Skill",
    `Canvas skill name: ${canvasSkill.name}`,
    `Canvas skill file: ${canvasSkill.path}`,
    "Use this project-local canvas skill as the behavior contract for Graphify workflow creation.",
    "",
    "## Task",
    "Use Graphify MCP / the selected local MCP as the planning model for this Harness Canvas.",
    "Treat the existing Graphify canvas as the source of truth for current node order, ids, and saved node Markdown.",
    "The returned workflow must follow the Graphify MCP structure schema exactly.",
    "Create only the workflow structure. Do not run tests. Do not execute the workflow. Do not inspect websites. Do not implement code.",
    "If the selected MCP server/tool is available in the local CLI runtime, use it only to reason about Graphify-compatible graph structure.",
    "Return exactly one JSON object. Do not wrap it in Markdown fences. Do not explain.",
    "",
    "## Selected Local MCP",
    selectedMcpKey,
    "",
    "## JSON Schema",
    `{"nodes":[{"id":"optional-kebab-id","title":"Agent Step Title","subtitle":"One sentence structure-only purpose","iconKey":"code|diamond|search|shield|zap","instructionStatus":"draft|ready|review","connectedMcp":[${JSON.stringify(selectedMcpKey)}],"sourceLinks":[],"markdown":"# Agent Step Title\\n\\nWrite the agent instructions freely here. Use whatever headings, bullets, examples, policies, or handoff notes fit this specific agent step."}],"selectedNodeId":"optional-node-id"}`,
    "",
    "## Rules",
    "Do not include the first root Skill node in nodes. The app already owns skills.md as node 0.",
    "Every returned node is an Agent step coordinated by the root Skill.",
    "Preserve Graphify-compatible node sequencing: one ordered list of concrete downstream agent steps.",
    "Do not add arbitrary top-level keys outside nodes and selectedNodeId.",
    "Return between 1 and 6 nodes.",
    "Keep titles short and concrete.",
    `Use connectedMcp [${JSON.stringify(selectedMcpKey)}] unless the user names a more specific local MCP tag.`,
    "Markdown is instruction content only, not execution output.",
    "Let each node's Markdown format fit the task naturally; do not force a fixed Purpose/Inputs/Workflow/Outputs/Success Criteria template.",
    "",
    "## Existing Graphify Canvas",
    JSON.stringify(
      flow.nodes.map((node) => ({
        ...node,
        markdown: markdownByNodeId[node.id] ?? "",
      })),
      null,
      2,
    ),
    "",
    "## Current Selection",
    selectedNodeId ?? "No node selected",
    "",
    "## User Request",
    userPrompt,
  ].join("\n");
}

async function runClaude(systemPrompt: string, userPrompt: string) {
  const { stdout } = await execFileAsync(
    "claude",
    [
      "-p",
      "--output-format",
      "text",
      "--tools",
      "",
      "--append-system-prompt",
      systemPrompt,
      userPrompt,
    ],
    {
      cwd: process.cwd(),
      timeout: CLI_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 8,
    },
  );

  return stdout.trim();
}

function extractTextFromContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      const contentItem = item as { type?: string; text?: unknown };

      return contentItem.type === "text" && typeof contentItem.text === "string"
        ? contentItem.text
        : "";
    })
    .join("");
}

function getFullTextCandidate(event: Record<string, unknown>) {
  if (typeof event.result === "string") {
    return event.result;
  }

  const message = event.message as
    | { content?: unknown; text?: unknown }
    | undefined;

  if (message) {
    if (typeof message.text === "string") {
      return message.text;
    }

    const contentText = extractTextFromContent(message.content);

    if (contentText) {
      return contentText;
    }
  }

  const item = event.item as { content?: unknown; text?: unknown } | undefined;

  if (item) {
    if (typeof item.text === "string") {
      return item.text;
    }

    const contentText = extractTextFromContent(item.content);

    if (contentText) {
      return contentText;
    }
  }

  return extractTextFromContent(event.content);
}

function getJsonEventDelta(event: Record<string, unknown>, emittedText: string) {
  const delta = event.delta as { text?: unknown; content?: unknown } | string | undefined;

  if (typeof delta === "string") {
    return delta;
  }

  if (delta && typeof delta === "object") {
    if (typeof delta.text === "string") {
      return delta.text;
    }

    const contentText = extractTextFromContent(delta.content);

    if (contentText) {
      return contentText;
    }
  }

  if (typeof event.text === "string" && String(event.type ?? "").includes("delta")) {
    return event.text;
  }

  const candidate = getFullTextCandidate(event);

  if (!candidate) {
    return "";
  }

  return candidate.startsWith(emittedText)
    ? candidate.slice(emittedText.length)
    : emittedText
      ? ""
      : candidate;
}

function runStreamingCommand(
  command: string,
  args: string[],
  options: {
    parseJsonLines: boolean;
    onDelta?: DeltaHandler;
  },
) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let emittedText = "";
    let rawStdout = "";
    let stderr = "";
    let lineBuffer = "";
    let settled = false;
    const timeout = windowlessSetTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      reject(new Error("Local CLI request timed out."));
    }, CLI_TIMEOUT_MS);

    function emit(delta: string) {
      if (!delta) {
        return;
      }

      emittedText += delta;
      options.onDelta?.(delta);
    }

    function handleJsonLine(line: string) {
      if (!line.trim()) {
        return;
      }

      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        emit(getJsonEventDelta(event, emittedText));
      } catch {
        emit(line + "\n");
      }
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      rawStdout += chunk;

      if (!options.parseJsonLines) {
        emit(chunk);
        return;
      }

      lineBuffer += chunk;
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? "";
      lines.forEach(handleJsonLine);
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      settled = true;
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);

      if (settled) {
        return;
      }

      if (options.parseJsonLines && lineBuffer.trim()) {
        handleJsonLine(lineBuffer);
      }

      if (code !== 0) {
        reject(new Error(stderr.trim() || `Local CLI exited with code ${code}.`));
        return;
      }

      resolve((emittedText || rawStdout).trim());
    });
  });
}

function windowlessSetTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

async function streamClaude(
  systemPrompt: string,
  userPrompt: string,
  onDelta?: DeltaHandler,
) {
  return runStreamingCommand(
    "claude",
    [
      "-p",
      "--verbose",
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--tools",
      "",
      "--append-system-prompt",
      systemPrompt,
      userPrompt,
    ],
    { parseJsonLines: true, onDelta },
  );
}

async function streamClaudeWithLocalTools(
  systemPrompt: string,
  userPrompt: string,
  onDelta?: DeltaHandler,
) {
  return runStreamingCommand(
    "claude",
    [
      "-p",
      "--verbose",
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--append-system-prompt",
      systemPrompt,
      userPrompt,
    ],
    { parseJsonLines: true, onDelta },
  );
}

async function runCodex(prompt: string) {
  const { stdout } = await execFileAsync(
    "codex",
    [
      "exec",
      "--sandbox",
      "read-only",
      "--color",
      "never",
      "-C",
      process.cwd(),
      prompt,
    ],
    {
      cwd: process.cwd(),
      timeout: CLI_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 8,
    },
  );

  return stdout.trim();
}

async function streamCodex(prompt: string, onDelta?: DeltaHandler) {
  return runStreamingCommand(
    "codex",
    [
      "exec",
      "--sandbox",
      "read-only",
      "--color",
      "never",
      "--json",
      "-C",
      process.cwd(),
      prompt,
    ],
    { parseJsonLines: true, onDelta },
  );
}

async function runAgentPrompt(agent: Agent, prompt: string) {
  if (agent.runtime === "claude") {
    return runClaude(buildSystemPrompt(agent), prompt);
  }

  return runCodex(prompt);
}

function buildFallbackPersonalityMarkdown(name: string, shortPersonality: string) {
  return [
    `# ${name}`,
    "",
    "## Personality",
    `- Operates as a focused ${name} agent for this brief: ${shortPersonality.replace(/\s+/g, " ").trim()}`,
    "- Converts broad user requests into concrete, verifiable work outputs.",
    "- Prioritizes accuracy, explicit assumptions, and useful handoffs over generic responses.",
    "",
    "## Operating Style",
    "- Choose safe, documented defaults when the request is ambiguous or underspecified.",
    "- Break work into clear steps, identify required inputs, and continue with available context whenever possible.",
    "- Validate outputs against the requested format and the current canvas step before marking work complete.",
    "- Keep local runtime actions explicit, reversible, and grounded in what the runtime actually performed.",
    "",
    "## Boundaries",
    "- Do not claim completed side effects unless the local runtime confirms them.",
    "- Do not invent facts or silently skip constraints; use `unknown`, documented assumptions, or a non-destructive default.",
    "- Do not pause for approval in the middle of the flow. Skip unsafe, destructive, paid, or external-write actions unless the user explicitly requested them, then report the skip in the final output.",
  ].join("\n");
}

function buildFallbackOrchestratorMarkdown(name: string, shortPersonality: string) {
  const normalizedBrief = shortPersonality.replace(/\s+/g, " ").trim();

  return [
    "# Orchestrate Requests",
    "",
    `Root orchestration skill for ${name}.`,
    "",
    "## Agent Brief",
    "",
    normalizedBrief,
    "",
    "## Orchestration Responsibilities",
    "",
    "- Read the user request and identify the concrete outcome, required inputs, output format, and success criteria.",
    "- Inspect the current Graphify canvas state before routing work.",
    "- Use canvas order for multi-step work unless the user explicitly targets a specific node or asks to change the workflow.",
    "- Route work to downstream agent steps instead of performing every task inside this root skill.",
    "- Keep each downstream step focused on one clear responsibility.",
    "- Run the full flow as one continuous autonomous process with no human-in-the-loop pauses.",
    "",
    "## Context Handoff",
    "",
    "- Pass only the context the next step needs: user goal, relevant constraints, available sources, previous outputs, and known blockers.",
    "- Preserve decisions, assumptions, validation notes, and unresolved questions between steps.",
    "- If required input is missing, choose a safe default, record the assumption, and continue. If no safe default exists, skip only that unsafe action and explain it in the final output.",
    "",
    "## Completion Rules",
    "",
    "- Treat the request as complete only when the final output matches the user's requested format.",
    "- Surface any skipped validation, missing source data, tool limitation, or confidence issue in the handoff or final answer.",
    "- Do not claim file edits, browser actions, external writes, or canvas changes unless the runtime actually performed them.",
  ].join("\n");
}

export async function generateAgentPersonalityMarkdown({
  name,
  shortPersonality,
  runtime,
}: {
  name: string;
  shortPersonality: string;
  runtime: AgentRuntime;
}) {
  const normalizedBrief = shortPersonality.replace(/\s+/g, " ").trim();
  const fallback = buildFallbackPersonalityMarkdown(name, normalizedBrief);
  const agentCreatorSkill = getProjectAgentCreatorSkillRef(runtime);
  const systemPrompt = [
    "You write detailed Markdown personality prompts for local CLI agents.",
    "Return only Markdown. Do not wrap the response in code fences.",
    "Keep the result operational, specific, and suitable for a local agent runtime.",
  ].join("\n");
  const userPrompt = [
    `Agent name: ${name}`,
    `Runtime: ${runtime}`,
    "",
    "## Project Agent Creator Skill",
    `Agent creator skill name: ${agentCreatorSkill.name}`,
    `Agent creator skill file: ${agentCreatorSkill.path}`,
    "Use this project-local agent creator skill as the behavior contract for agent creation.",
    "",
    "Short personality brief:",
    normalizedBrief,
    "",
    "Create a detailed PERSONALITY.md with these exact sections:",
    `# ${name}`,
    "## Personality",
    "## Operating Style",
    "## Boundaries",
    "",
    "Use bullets under each section. Preserve the user's intent, but make it clearer, more specific, and actionable for runtime behavior.",
    "The personality must describe an autonomous one-process agent. Do not tell the agent to pause for human input, approval, or manual review during the flow.",
    "For incomplete inputs, instruct the agent to choose safe defaults, continue, and report assumptions or skipped unsafe actions in the final output.",
  ].join("\n");

  try {
    const output =
      runtime === "claude"
        ? await runClaude(systemPrompt, userPrompt)
        : await runCodex([systemPrompt, "", userPrompt].join("\n"));
    const markdown = stripMarkdownFence(output);

    return markdown || fallback;
  } catch {
    return fallback;
  }
}

export async function generateAgentOrchestratorMarkdown({
  name,
  shortPersonality,
  runtime,
}: {
  name: string;
  shortPersonality: string;
  runtime: AgentRuntime;
}) {
  const normalizedBrief = shortPersonality.replace(/\s+/g, " ").trim();
  const fallback = buildFallbackOrchestratorMarkdown(name, normalizedBrief);
  const agentCreatorSkill = getProjectAgentCreatorSkillRef(runtime);
  const systemPrompt = [
    "You write detailed Markdown orchestration skills for local CLI agents.",
    "Return only Markdown. Do not wrap the response in code fences.",
    "Keep the result operational, specific to the user brief, and suitable for a root SKILL.md that coordinates the canvas as one autonomous process.",
  ].join("\n");
  const userPrompt = [
    `Agent name: ${name}`,
    `Runtime: ${runtime}`,
    "",
    "## Project Agent Creator Skill",
    `Agent creator skill name: ${agentCreatorSkill.name}`,
    `Agent creator skill file: ${agentCreatorSkill.path}`,
    "Use this project-local agent creator skill as the behavior contract for agent creation.",
    "",
    "Short agent brief:",
    normalizedBrief,
    "",
    "Create a root orchestrator SKILL.md in a natural structure that fits this agent.",
    "Include practical sections such as Agent Brief, Routing Rules, Context Handoff, Step Coordination, Validation, and Boundaries when useful.",
    "Make the orchestration behavior specific to the user's brief.",
    "The root skill coordinates downstream canvas agent steps as one continuous run; it must not introduce human-in-the-loop approval gates.",
    "For missing details, define safe defaults and continue. For unsafe actions, skip that action and report it in the final output instead of asking for confirmation.",
    "The result must be detailed enough that the root node preview is useful immediately after agent creation.",
  ].join("\n");

  try {
    const output =
      runtime === "claude"
        ? await runClaude(systemPrompt, userPrompt)
        : await runCodex([systemPrompt, "", userPrompt].join("\n"));
    const markdown = stripMarkdownFence(output);

    return markdown || fallback;
  } catch {
    return fallback;
  }
}

async function streamAgentPrompt(
  agent: Agent,
  prompt: string,
  onDelta?: DeltaHandler,
) {
  if (agent.runtime === "claude") {
    return streamClaude(buildSystemPrompt(agent), prompt, onDelta);
  }

  return streamCodex(prompt, onDelta);
}

async function streamAgentGraphifyPrompt(
  agent: Agent,
  prompt: string,
  onDelta?: DeltaHandler,
) {
  if (agent.runtime === "claude") {
    return streamClaudeWithLocalTools(buildSystemPrompt(agent), prompt, onDelta);
  }

  return streamCodex(prompt, onDelta);
}

export async function streamLocalCliPrompt(
  agent: Agent,
  systemPrompt: string,
  userPrompt: string,
  onDelta?: DeltaHandler,
  options: { allowLocalTools?: boolean } = {},
) {
  if (agent.runtime === "claude") {
    return options.allowLocalTools
      ? streamClaudeWithLocalTools(systemPrompt, userPrompt, onDelta)
      : streamClaude(systemPrompt, userPrompt, onDelta);
  }

  return streamCodex(
    [
      systemPrompt.trim(),
      "",
      "## User Request",
      userPrompt.trim(),
    ].join("\n"),
    onDelta,
  );
}

export async function runAgentChat(
  agent: Agent,
  recentMessages: ChatMessage[],
  userMessage: string,
  harnessContext?: HarnessMcpContext,
) {
  const claudeMemContext = await getClaudeMemAgentContext(agent, userMessage);
  const prompt = buildRuntimePrompt(
    agent,
    recentMessages,
    userMessage,
    harnessContext,
    claudeMemContext,
  );
  const output = await runAgentPrompt(agent, prompt);

  return output || "No response was returned by the local CLI runtime.";
}

export async function streamAgentChat(
  agent: Agent,
  recentMessages: ChatMessage[],
  userMessage: string,
  harnessContext: HarnessMcpContext | undefined,
  onDelta: DeltaHandler,
) {
  const claudeMemContext = await getClaudeMemAgentContext(agent, userMessage);
  const prompt = buildRuntimePrompt(
    agent,
    recentMessages,
    userMessage,
    harnessContext,
    claudeMemContext,
  );
  const output = await streamAgentPrompt(agent, prompt, onDelta);

  return output || "No response was returned by the local CLI runtime.";
}

export async function streamAgentHarnessNode(
  agent: Agent,
  recentMessages: ChatMessage[],
  userMessage: string,
  harnessContext: HarnessMcpContext,
  nodeIndex: number,
  previousOutputs: string[],
  onDelta: DeltaHandler,
) {
  const node = harnessContext.nodes[nodeIndex];

  if (!node) {
    throw new Error("Harness node not found.");
  }

  const claudeMemContext = await getClaudeMemAgentContext(
    agent,
    `${userMessage} ${node.title}`,
  );
  const prompt = buildNodeRuntimePrompt(
    agent,
    recentMessages,
    userMessage,
    harnessContext,
    node,
    nodeIndex,
    previousOutputs,
    claudeMemContext,
  );
  const output = await streamAgentGraphifyPrompt(agent, prompt, onDelta);

  return output || "No response was returned by the local CLI runtime.";
}

export async function streamAgentCanvasEdits(
  agent: Agent,
  flow: AgentFlowResponse,
  markdownByNodeId: Record<string, string>,
  userPrompt: string,
  selectedNodeId: string | null | undefined,
  onDelta: DeltaHandler,
) {
  const prompt = buildCanvasEditPrompt({
    agent,
    flow,
    markdownByNodeId,
    userPrompt,
    selectedNodeId,
    claudeMemContext: await getClaudeMemAgentContext(agent, userPrompt),
  });
  const output = await streamAgentPrompt(agent, prompt, onDelta);

  return output.trim();
}

export async function streamAgentGraphifyStructure(
  agent: Agent,
  flow: AgentFlowResponse,
  markdownByNodeId: Record<string, string>,
  userPrompt: string,
  selectedNodeId: string | null | undefined,
  selectedMcpKey: string,
  onDelta: DeltaHandler,
) {
  const prompt = buildGraphifyStructurePrompt({
    agent,
    flow,
    markdownByNodeId,
    userPrompt,
    selectedNodeId,
    selectedMcpKey,
    claudeMemContext: await getClaudeMemAgentContext(agent, userPrompt),
  });
  const output = await streamAgentGraphifyPrompt(agent, prompt, onDelta);

  return output.trim();
}

export async function updateAgentMemorySummary(
  agent: Agent,
  userMessage: string,
  assistantMessage: string,
) {
  await recordClaudeMemAgentExchange({
    agent,
    userMessage,
    assistantMessage,
  });

  return "Claude-Mem manages durable memory for this project.";
}
