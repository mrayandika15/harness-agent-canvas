import { NextResponse } from "next/server";

import { deleteAgent, getAgent } from "@/lib/server/agent-database";
import { deleteAgentGeneration } from "@/lib/server/agent-generation-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await context.params;

  try {
    const agent = getAgent(agentId);

    if (!agent) {
      if (deleteAgentGeneration(agentId)) {
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    deleteAgent(agentId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete agent.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
