import { NextResponse } from "next/server";

import {
  getAgent,
  getAgentFlow,
  getAgentFlowMarkdown,
} from "@/lib/server/agent-database";
import { serializeAgentFlow } from "@/lib/server/agent-flow-serialization";
import {
  readAgentGraphifyFlow,
  writeAgentGraphifyGraph,
} from "@/lib/server/graphify-flow-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await context.params;

  const agent = getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const fallbackFlow = serializeAgentFlow(getAgentFlow(agentId));
  const markdownByNodeId = Object.fromEntries(
    fallbackFlow.nodes.map((node) => [
      node.id,
      getAgentFlowMarkdown(agent.id, node.id),
    ]),
  );

  writeAgentGraphifyGraph(agent, fallbackFlow, markdownByNodeId);

  return NextResponse.json(readAgentGraphifyFlow(agent, fallbackFlow));
}
