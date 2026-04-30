import type { Agent } from "@/features/agents/types/agent";
import type { FlowStep } from "@/features/flow/types/flow-step";

export type AppView = "canvas" | "chat" | "integrations" | "settings";

export type MarkdownSidebarMode = "view" | "edit";

export type WorkspaceState = {
  appView: AppView;
  activeStep: number;
  agentItems: Agent[];
  flowStepItems: FlowStep[];
  isAgentPanelCollapsed: boolean;
  isInspectorCollapsed: boolean;
  isMarkdownSidebarOpen: boolean;
  isPlaying: boolean;
  markdownSidebarMode: MarkdownSidebarMode;
  selectedAgentId: string;
  selectedFlowNodeId: string | null;
  agentSearchQuery: string;
  addAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  replaceAgent: (agentId: string, agent: Agent) => void;
  updateAgent: (agentId: string, patch: Partial<Agent>) => void;
  setActiveStep: (step: number) => void;
  setAppView: (view: AppView) => void;
  setAgentSearchQuery: (query: string) => void;
  setAgentItems: (agents: Agent[]) => void;
  setFlowStepItems: (items: FlowStep[]) => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
  setMarkdownSidebarMode: (mode: MarkdownSidebarMode) => void;
  setMarkdownSidebarOpen: (open: boolean) => void;
  setSelectedAgentId: (id: string) => void;
  setSelectedFlowNodeId: (id: string | null) => void;
  toggleAgentPanel: () => void;
  togglePlaying: () => void;
};
