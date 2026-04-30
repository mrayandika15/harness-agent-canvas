import { NextResponse } from "next/server";

import type { AgentRuntime } from "@/features/agents/types/agent";
import {
  createAgent,
  isDuplicateAgentName,
  listAgents,
} from "@/lib/server/agent-database";
import {
  createAgentGeneration,
  deleteAgentGeneration,
  failAgentGeneration,
  isDuplicateAgentGenerationName,
  listAgentGenerations,
} from "@/lib/server/agent-generation-store";
import { writeAgentPersonalityFile } from "@/lib/server/agent-flow-sync";
import { getAgentGraphifyOutput } from "@/lib/server/graphify-flow-adapter";
import {
  generateAgentOrchestratorMarkdown,
  generateAgentPersonalityMarkdown,
} from "@/lib/server/local-agent-cli";

const runtimes = new Set<AgentRuntime>(["claude", "codex"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeIcon(icon: string) {
  return icon.trim().slice(0, 2).toUpperCase();
}

function listAgentsWithGenerations() {
  const agents = listAgents();
  const completedNames = new Set(
    agents.map((agent) => agent.name.trim().toLowerCase()),
  );
  const generations = listAgentGenerations().filter(
    (generation) => !completedNames.has(generation.name.trim().toLowerCase()),
  );

  return [...generations, ...agents];
}

export async function GET() {
  return NextResponse.json({ agents: listAgentsWithGenerations() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    icon?: string;
    personality?: string;
    runtime?: AgentRuntime;
    color?: string;
    generationId?: string;
  };
  const name = body.name?.trim() ?? "";
  const icon = normalizeIcon(body.icon ?? "");
  const personality = body.personality?.trim() ?? "";
  const runtime = body.runtime ?? "claude";
  const color = body.color?.trim() || "#F5944E";
  const generationId = body.generationId?.trim();

  if (!name || !icon || !personality || !runtimes.has(runtime)) {
    return NextResponse.json(
      { error: "Name, icon, personality, and runtime are required." },
      { status: 400 },
    );
  }

  if (
    isDuplicateAgentName(name) ||
    isDuplicateAgentGenerationName(name, generationId)
  ) {
    return NextResponse.json(
      { error: "An agent with this name already exists." },
      { status: 409 },
    );
  }

  const generation = createAgentGeneration({
    id: generationId,
    name,
    icon,
    runtime,
    color,
  });

  try {
    const [generatedPersonality, generatedOrchestrator] = await Promise.all([
      generateAgentPersonalityMarkdown({
        name,
        shortPersonality: personality,
        runtime,
      }),
      generateAgentOrchestratorMarkdown({
        name,
        shortPersonality: personality,
        runtime,
      }),
    ]);
    const agent = createAgent({
      name,
      icon,
      personality: generatedPersonality,
      orchestratorMarkdown: generatedOrchestrator,
      runtime,
      color,
    });

    writeAgentPersonalityFile(agent, generatedPersonality);
    deleteAgentGeneration(generation.id);

    return NextResponse.json(
      {
        agent,
        generationId: generation.id,
        graphify: getAgentGraphifyOutput(agent),
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create agent.";

    failAgentGeneration(generation.id, message);

    return NextResponse.json(
      { error: message, generationId: generation.id },
      { status: 500 },
    );
  }
}
