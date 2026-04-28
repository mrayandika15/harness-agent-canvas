"use client";

import { create } from "zustand";

import { agents } from "@/features/agents/lib/agents";
import { flowSteps } from "@/features/flow/lib/flow-data";
import type { WorkspaceState } from "@/features/workspace/types/workspace";

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  appView: "canvas",
  activeStep: 1,
  agentItems: agents,
  flowStepItems: flowSteps,
  isAgentPanelCollapsed: false,
  isInspectorCollapsed: false,
  isMarkdownSidebarOpen: false,
  isPlaying: false,
  markdownSidebarMode: "view",
  selectedAgentName: agents[0]?.name ?? "",
  selectedFlowNodeId: flowSteps[0]?.id ?? null,
  agentSearchQuery: "",
  addAgent: (agent) =>
    set((state) => ({
      agentItems: [...state.agentItems, agent],
      selectedAgentName: agent.name,
      agentSearchQuery: "",
    })),
  setActiveStep: (activeStep) => set({ activeStep }),
  setAppView: (appView) => set({ appView }),
  setAgentSearchQuery: (agentSearchQuery) => set({ agentSearchQuery }),
  setFlowStepItems: (flowStepItems) => set({ flowStepItems }),
  setInspectorCollapsed: (isInspectorCollapsed) => set({ isInspectorCollapsed }),
  setMarkdownSidebarMode: (markdownSidebarMode) => set({ markdownSidebarMode }),
  setMarkdownSidebarOpen: (isMarkdownSidebarOpen) => set({ isMarkdownSidebarOpen }),
  setSelectedAgentName: (selectedAgentName) => set({ selectedAgentName }),
  setSelectedFlowNodeId: (selectedFlowNodeId) => set({ selectedFlowNodeId }),
  toggleAgentPanel: () =>
    set((state) => ({ isAgentPanelCollapsed: !state.isAgentPanelCollapsed })),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
