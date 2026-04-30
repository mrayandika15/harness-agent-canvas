import { NextResponse } from "next/server";

import type { SerializableFlowStep } from "@/features/flow/types/agent-flow";
import {
  addAgentFlowNode,
  getAgent,
  getAgentFlowMarkdown,
} from "@/lib/server/agent-database";
import { serializeAgentFlow } from "@/lib/server/agent-flow-serialization";
import { createDummyMarkdownContent } from "@/features/flow/lib/flow-data";
import { getFlowIcon } from "@/features/flow/lib/flow-icons";
import { writeAgentGraphifyGraph } from "@/lib/server/graphify-flow-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await context.params;
  const agent = getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    node?: SerializableFlowStep;
    markdown?: string;
  };
  const node = body.node;

  if (!node?.id || !node.title) {
    return NextResponse.json({ error: "Invalid node" }, { status: 400 });
  }

  const flowNode = {
    ...node,
    icon: getFlowIcon(node.iconKey),
  };
  const markdown = body.markdown ?? createDummyMarkdownContent(flowNode);

  const flow = serializeAgentFlow(addAgentFlowNode(agent, flowNode, markdown));
  const markdownByNodeId = Object.fromEntries(
    flow.nodes.map((item) => [item.id, getAgentFlowMarkdown(agent.id, item.id)]),
  );

  writeAgentGraphifyGraph(agent, flow, markdownByNodeId);

  return NextResponse.json(flow, { status: 201 });
}
