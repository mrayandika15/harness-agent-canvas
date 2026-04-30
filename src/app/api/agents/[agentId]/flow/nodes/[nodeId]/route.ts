import { NextResponse } from "next/server";

import type { SerializableFlowStep } from "@/features/flow/types/agent-flow";
import {
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
  readAgentGraphifyNodeMarkdown,
  writeAgentGraphifyGraph,
} from "@/lib/server/graphify-flow-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  context: { params: Promise<{ agentId: string; nodeId: string }> },
) {
  const { agentId, nodeId } = await context.params;

  const agent = getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    content:
      readAgentGraphifyNodeMarkdown(agent, nodeId) ||
      getAgentFlowMarkdown(agentId, nodeId),
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ agentId: string; nodeId: string }> },
) {
  const { agentId, nodeId } = await context.params;
  const agent = getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    node?: Partial<SerializableFlowStep>;
    markdown?: string;
  };
  const nextNode = updateAgentFlowNode(agent, nodeId, {
    ...body.node,
    markdown: body.markdown,
  });

  if (!nextNode) {
    return NextResponse.json({ error: "Flow node not found" }, { status: 404 });
  }

  const flow = serializeAgentFlow(getAgentFlow(agent.id));
  const markdownByNodeId = Object.fromEntries(
    flow.nodes.map((item) => [item.id, getAgentFlowMarkdown(agent.id, item.id)]),
  );

  writeAgentGraphifyGraph(agent, flow, markdownByNodeId);

  return NextResponse.json({ node: serializeFlowStep(nextNode) });
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ agentId: string; nodeId: string }> },
) {
  const { agentId, nodeId } = await context.params;
  const agent = getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  try {
    const flow = deleteAgentFlowNode(agent, nodeId);

    if (!flow) {
      return NextResponse.json({ error: "Flow node not found" }, { status: 404 });
    }

    const serializedFlow = serializeAgentFlow(flow);
    const markdownByNodeId = Object.fromEntries(
      serializedFlow.nodes.map((item) => [
        item.id,
        getAgentFlowMarkdown(agent.id, item.id),
      ]),
    );

    writeAgentGraphifyGraph(agent, serializedFlow, markdownByNodeId);

    return NextResponse.json(serializedFlow);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete flow node.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
