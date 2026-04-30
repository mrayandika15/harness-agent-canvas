import { NextResponse } from "next/server";

import type { Agent } from "@/features/agents/types/agent";
import type { ChatMessage, ChatTimelineItem } from "@/features/chat/types/message";
import {
  clearAgentHarnessState,
  createMessage,
  getAgent,
  getAgentHarnessState,
  getRecentMessages,
  updateAgentHarnessState,
  updateAgentStatus,
} from "@/lib/server/agent-database";
import {
  streamAgentHarnessNode,
  updateAgentMemorySummary,
} from "@/lib/server/local-agent-cli";
import {
  inspectHarnessWithMcp,
  type HarnessMcpContext,
} from "@/lib/server/harness-mcp-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CurrentStepPayload = {
  id: string;
  title: string;
  index: number;
  total: number;
};

type AgentChatSession = {
  agentId: string;
  recentMessages: ChatMessage[];
  harnessContext: HarnessMcpContext;
  nextNodeIndex: number;
  outputs: string[];
};

type StepDecision = "complete" | "waiting_input";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Local CLI request failed.";
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function createTimeline(
  harnessContext: HarnessMcpContext,
  nodeIndex: number,
  currentStatus: ChatTimelineItem["status"],
) {
  return [
    {
      id: "inspect",
      label: "Read Graphify flow",
      detail: `${harnessContext.nodes.length} step${
        harnessContext.nodes.length === 1 ? "" : "s"
      } found`,
      status: "complete" as const,
    },
    ...harnessContext.nodes.map((node, index) => ({
      id: node.id,
      label: `${index + 1}. ${node.title}`,
      detail:
        index < nodeIndex
          ? "complete"
          : index === nodeIndex
            ? currentStatus === "complete"
              ? "complete"
              : "current"
            : "waiting",
      status:
        index < nodeIndex
          ? "complete"
          : index === nodeIndex
            ? currentStatus
            : "pending",
    })),
  ] satisfies ChatTimelineItem[];
}

function createCurrentStep(
  harnessContext: HarnessMcpContext,
  nodeIndex: number,
): CurrentStepPayload {
  const node = harnessContext.nodes[nodeIndex];

  if (!node) {
    throw new Error("Harness step not found.");
  }

  return {
    id: node.id,
    title: node.title,
    index: nodeIndex,
    total: harnessContext.nodes.length,
  };
}

function parseStepDecision(content: string): {
  content: string;
  decision: StepDecision;
} {
  const statusPattern =
    /(?:<!--\s*)?HARNESS_STEP_STATUS:\s*(complete|waiting_input)\s*(?:-->)?/i;
  const match = content.match(statusPattern);
  const cleanedContent = content.replace(statusPattern, "").trim();

  if (match?.[1]?.toLowerCase() === "complete") {
    return { content: cleanedContent, decision: "complete" };
  }

  if (match?.[1]?.toLowerCase() === "waiting_input") {
    return { content: cleanedContent, decision: "waiting_input" };
  }

  const looksBlocked =
    /\b(missing|required|please provide|cannot|can't|blocked|waiting for|need(?:s)? input)\b/i.test(
      content,
    );

  return {
    content: cleanedContent,
    decision: looksBlocked ? "waiting_input" : "complete",
  };
}

function createSession({
  agent,
  harnessContext,
  nextNodeIndex = 0,
  outputs = [],
}: {
  agent: Agent;
  harnessContext: HarnessMcpContext;
  nextNodeIndex?: number;
  outputs?: string[];
}): AgentChatSession {
  return {
    agentId: agent.id,
    recentMessages: getRecentMessages(agent.id, 8),
    harnessContext,
    nextNodeIndex,
    outputs,
  };
}

async function runCurrentHarnessStep({
  agent,
  session,
  userMessage,
  send,
  sendStatus,
}: {
  agent: Agent;
  session: AgentChatSession;
  userMessage: string;
  send: (event: string, data: unknown) => void;
  sendStatus: (status: string) => void;
}) {
  const nodeIndex = session.nextNodeIndex;
  const currentStep = createCurrentStep(session.harnessContext, nodeIndex);

  sendStatus(`Step ${nodeIndex + 1}/${session.harnessContext.nodes.length}`);
  send("currentStep", currentStep);
  send("timeline", {
    timeline: createTimeline(session.harnessContext, nodeIndex, "pending"),
  });

  sendStatus("Running");
  send("timeline", {
    timeline: createTimeline(session.harnessContext, nodeIndex, "running"),
  });

  const rawAssistantContent = await streamAgentHarnessNode(
    agent,
    session.recentMessages,
    userMessage,
    session.harnessContext,
    nodeIndex,
    session.outputs,
    (delta) => send("delta", { delta }),
  );
  const { content: assistantContent, decision } =
    parseStepDecision(rawAssistantContent);
  const stepComplete = decision === "complete";
  const timeline = createTimeline(
    session.harnessContext,
    nodeIndex,
    stepComplete ? "complete" : "running",
  );
  const assistantMessage = createMessage(agent.id, "assistant", assistantContent, {
    timeline,
  });
  const nextNodeIndex = stepComplete ? nodeIndex + 1 : nodeIndex;

  if (stepComplete) {
    session.outputs.push(assistantContent);
  }

  session.nextNodeIndex = nextNodeIndex;
  send("timeline", { timeline });
  send("assistantMessage", { assistantMessage });

  if (!stepComplete) {
    updateAgentHarnessState(agent.id, {
      nextNodeIndex: nodeIndex,
      outputs: session.outputs,
    });
    send("currentStep", currentStep);
    sendStatus("Waiting Input");
    send("done", { ok: true, waitingForInput: true });
    return;
  }

  if (nextNodeIndex < session.harnessContext.nodes.length) {
    updateAgentHarnessState(agent.id, {
      nextNodeIndex,
      outputs: session.outputs,
    });
    send("currentStep", createCurrentStep(session.harnessContext, nextNodeIndex));
    sendStatus("Waiting Input");
    send("done", { ok: true, waitingForInput: true });
    return;
  }

  clearAgentHarnessState(agent.id);

  try {
    const memory = await updateAgentMemorySummary(
      agent,
      userMessage,
      session.outputs.join("\n\n---\n\n"),
    );

    send("memory", { memory });
  } catch (memoryError) {
    send("memoryWarning", { warning: getErrorMessage(memoryError) });
  }

  sendStatus("Idle");
  send("done", { ok: true, waitingForInput: false });
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
    content?: string;
  };
  const content = body.content?.trim() ?? "";

  if (!content) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(encoder.encode(sse(event, data)));
        }

        function sendStatus(status: string) {
          const updatedAgent = updateAgentStatus(activeAgent.id, status);
          send("agentStatus", {
            agentId: activeAgent.id,
            status,
            agent: updatedAgent,
          });
        }

        try {
          const userMessage = createMessage(activeAgent.id, "user", content);
          let session: AgentChatSession | null = null;
          const harnessState = getAgentHarnessState(activeAgent.id);

          send("userMessage", { userMessage });

          if (!harnessState) {
            sendStatus("Reading Flow");
            const harnessContext = await inspectHarnessWithMcp(activeAgent);

            if (harnessContext.nodes.length === 0) {
              throw new Error("This agent has no harness nodes to run.");
            }

            session = createSession({ agent: activeAgent, harnessContext });
          } else {
            sendStatus("Reading Flow");
            const harnessContext = await inspectHarnessWithMcp(activeAgent);

            if (harnessContext.nodes.length === 0) {
              clearAgentHarnessState(activeAgent.id);
              throw new Error("This agent has no harness nodes to run.");
            }

            const nextNodeIndex = Math.min(
              Math.max(harnessState.nextNodeIndex, 0),
              harnessContext.nodes.length - 1,
            );

            session = createSession({
              agent: activeAgent,
              harnessContext,
              nextNodeIndex,
              outputs: harnessState.outputs,
            });
          }

          await runCurrentHarnessStep({
            agent: activeAgent,
            session,
            userMessage: content,
            send,
            sendStatus,
          });
        } catch (error) {
          clearAgentHarnessState(activeAgent.id);
          sendStatus("Failed");
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
