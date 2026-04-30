import type { AgentFlowResponse, SerializableFlowStep } from "@/features/flow/types/agent-flow";
import type { FlowStep } from "@/features/flow/types/flow-step";

export function serializeFlowStep(step: FlowStep): SerializableFlowStep {
  return {
    id: step.id,
    step: step.step,
    title: step.title,
    subtitle: step.subtitle,
    iconKey: step.iconKey ?? "code",
    connectedMcp: step.connectedMcp,
    sourceLinks: step.sourceLinks,
    instructionStatus: step.instructionStatus,
  };
}

export function serializeAgentFlow(flow: {
  nodes: FlowStep[];
  edges: AgentFlowResponse["edges"];
  selectedNodeId: string | null;
}): AgentFlowResponse {
  return {
    nodes: flow.nodes.map(serializeFlowStep),
    edges: flow.edges,
    selectedNodeId: flow.selectedNodeId,
  };
}
