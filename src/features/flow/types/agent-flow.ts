import type { FlowStep } from "@/features/flow/types/flow-step";

export type SerializableFlowStep = Omit<FlowStep, "icon"> & {
  iconKey: string;
};

export type AgentFlowResponse = {
  nodes: SerializableFlowStep[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
  selectedNodeId: string | null;
};
