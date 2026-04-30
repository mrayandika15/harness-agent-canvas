import { getFlowIcon } from "@/features/flow/lib/flow-icons";
import type {
  AgentFlowResponse,
  SerializableFlowStep,
} from "@/features/flow/types/agent-flow";
import type { FlowStep } from "@/features/flow/types/flow-step";

export function hydrateFlowStep(step: SerializableFlowStep): FlowStep {
  return {
    ...step,
    icon: getFlowIcon(step.iconKey),
  };
}

function serializeFlowStep(step: FlowStep): SerializableFlowStep {
  const { icon: _icon, ...serializableStep } = step;

  return {
    ...serializableStep,
    iconKey: step.iconKey ?? "code",
  };
}

export function hydrateFlow(response: AgentFlowResponse) {
  return {
    ...response,
    nodes: response.nodes.map(hydrateFlowStep),
  };
}

export type LocalMcpServer = {
  key: string;
  label: string;
  source: string;
  command: string;
  args: string[];
  available: boolean;
  path: string | null;
};

export async function fetchLocalMcps() {
  const response = await fetch("/api/local-mcps", { cache: "no-store" });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { mcps?: LocalMcpServer[] };
  return data.mcps ?? [];
}

export async function runFlowAssistant(
  agentId: string,
  payload: {
    prompt: string;
    selectedNodeId?: string | null;
    selectedMcpKey?: string | null;
  },
) {
  const response = await fetch(`/api/agents/${agentId}/flow/assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    throw new Error(data.error ?? "Unable to run flow assistant");
  }

  return response.body;
}

export async function fetchAgentFlow(agentId: string) {
  const response = await fetch(`/api/agents/${agentId}/flow`);

  if (!response.ok) {
    return { nodes: [], edges: [], selectedNodeId: null };
  }

  return hydrateFlow((await response.json()) as AgentFlowResponse);
}

export async function createAgentFlowNode(
  agentId: string,
  node: FlowStep,
  markdown: string,
) {
  const response = await fetch(`/api/agents/${agentId}/flow/nodes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      node: serializeFlowStep(node),
      markdown,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to create flow node");
  }

  return hydrateFlow((await response.json()) as AgentFlowResponse);
}

export async function fetchAgentFlowNodeContent(agentId: string, nodeId: string) {
  const response = await fetch(`/api/agents/${agentId}/flow/nodes/${nodeId}`);

  if (!response.ok) {
    return "";
  }

  const data = (await response.json()) as { content?: string };
  return data.content ?? "";
}

export async function saveAgentFlowNode(
  agentId: string,
  node: FlowStep,
  markdown: string,
) {
  const response = await fetch(`/api/agents/${agentId}/flow/nodes/${node.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      node: serializeFlowStep(node),
      markdown,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to save flow node");
  }

  const data = (await response.json()) as { node: SerializableFlowStep };
  return hydrateFlowStep(data.node);
}

export async function deleteAgentFlowNode(agentId: string, nodeId: string) {
  const response = await fetch(`/api/agents/${agentId}/flow/nodes/${nodeId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    throw new Error(data.error ?? "Unable to delete flow node");
  }

  return hydrateFlow((await response.json()) as AgentFlowResponse);
}
