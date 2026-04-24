import type { FlowStep } from "@/features/flow/types/flow-step";

export type AppView = "canvas" | "chat";

export type MarkdownSidebarMode = "view" | "edit";

export type WorkspaceState = {
  appView: AppView;
  activeStep: number;
  flowStepItems: FlowStep[];
  isAgentPanelCollapsed: boolean;
  isInspectorCollapsed: boolean;
  isMarkdownSidebarOpen: boolean;
  isPlaying: boolean;
  markdownSidebarMode: MarkdownSidebarMode;
  selectedAgentName: string;
  selectedFlowNodeId: string | null;
  agentSearchQuery: string;
  setActiveStep: (step: number) => void;
  setAppView: (view: AppView) => void;
  setAgentSearchQuery: (query: string) => void;
  setFlowStepItems: (items: FlowStep[]) => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
  setMarkdownSidebarMode: (mode: MarkdownSidebarMode) => void;
  setMarkdownSidebarOpen: (open: boolean) => void;
  setSelectedAgentName: (name: string) => void;
  setSelectedFlowNodeId: (id: string | null) => void;
  toggleAgentPanel: () => void;
  togglePlaying: () => void;
};
