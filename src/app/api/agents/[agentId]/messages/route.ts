import { NextResponse } from "next/server";

import {
  clearAgentHarnessState,
  deleteAgentMessages,
  getAgent,
  updateAgentStatus,
  listMessages,
} from "@/lib/server/agent-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await context.params;

  if (!getAgent(agentId)) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({ messages: listMessages(agentId) });
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await context.params;

  if (!getAgent(agentId)) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  clearAgentHarnessState(agentId);
  updateAgentStatus(agentId, "Idle");

  return NextResponse.json({
    ok: true,
    deleted: deleteAgentMessages(agentId),
  });
}
