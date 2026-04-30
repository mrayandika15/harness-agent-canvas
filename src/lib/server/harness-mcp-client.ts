import type { Agent } from "@/features/agents/types/agent";
import type { ChatTimelineItem } from "@/features/chat/types/message";
import type { AgentFlowResponse } from "@/features/flow/types/agent-flow";
import {
  getAgentFlow,
  getAgentFlowMarkdown,
} from "@/lib/server/agent-database";
import { serializeAgentFlow } from "@/lib/server/agent-flow-serialization";
import {
  readAgentGraphifyFlow,
  readAgentGraphifyNodeMarkdown,
} from "@/lib/server/graphify-flow-adapter";

export type HarnessNodeContext = AgentFlowResponse["nodes"][number] & {
  markdown: string;
};

export type HarnessMcpContext = {
  flow: AgentFlowResponse;
  nodes: HarnessNodeContext[];
  timeline: ChatTimelineItem[];
};

function createTimeline(nodes: HarnessNodeContext[]): ChatTimelineItem[] {
  return [
    {
      id: "inspect",
      label: "Read Graphify canvas",
      detail: `${nodes.length} node${nodes.length === 1 ? "" : "s"} discovered`,
      status: "complete",
    },
    ...nodes.map((node, index) => ({
      id: node.id,
      label: `${index + 1}. ${node.title}`,
      detail: `${node.instructionStatus} · ${node.sourceLinks.length} source${
        node.sourceLinks.length === 1 ? "" : "s"
      }`,
      status: "complete" as const,
    })),
    {
      id: "compose",
      label: "Compose response",
      detail: "Approval-gated harness run",
      status: "complete" as const,
    },
  ];
}

export async function inspectHarnessWithMcp(agent: Agent): Promise<HarnessMcpContext> {
  const fallbackFlow = serializeAgentFlow(getAgentFlow(agent.id));
  const flow = readAgentGraphifyFlow(agent, fallbackFlow);
  const nodes = flow.nodes.map((node) => ({
    ...node,
    markdown:
      readAgentGraphifyNodeMarkdown(agent, node.id) ||
      getAgentFlowMarkdown(agent.id, node.id),
  }));

  return {
    flow,
    nodes,
    timeline: createTimeline(nodes),
  };
}
