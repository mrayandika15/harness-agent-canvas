"use client";

import { create } from "zustand";

import { agents } from "@/features/agents/lib/agents";
import type { WorkspaceState } from "@/features/workspace/types/workspace";

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  appView: "canvas",
  activeStep: 0,
  agentItems: agents,
  flowStepItems: [],
  isAgentPanelCollapsed: false,
  isInspectorCollapsed: true,
  isMarkdownSidebarOpen: false,
  isPlaying: false,
  markdownSidebarMode: "view",
  selectedAgentId: agents[0]?.id ?? "",
  selectedFlowNodeId: null,
  agentSearchQuery: "",
  addAgent: (agent) =>
    set((state) => ({
      agentItems: [...state.agentItems, agent],
      selectedAgentId: agent.id,
      agentSearchQuery: "",
    })),
  removeAgent: (agentId) =>
    set((state) => {
      const agentItems = state.agentItems.filter((agent) => agent.id !== agentId);

      return {
        agentItems,
        selectedAgentId:
          state.selectedAgentId === agentId
            ? agentItems[0]?.id ?? ""
            : state.selectedAgentId,
        flowStepItems: state.selectedAgentId === agentId ? [] : state.flowStepItems,
        selectedFlowNodeId:
          state.selectedAgentId === agentId ? null : state.selectedFlowNodeId,
      };
    }),
  replaceAgent: (agentId, agent) =>
    set((state) => ({
      agentItems: state.agentItems.map((item) =>
        item.id === agentId ? agent : item,
      ),
      selectedAgentId:
        state.selectedAgentId === agentId ? agent.id : state.selectedAgentId,
      agentSearchQuery: "",
    })),
  updateAgent: (agentId, patch) =>
    set((state) => ({
      agentItems: state.agentItems.map((agent) =>
        agent.id === agentId ? { ...agent, ...patch } : agent,
      ),
    })),
  setActiveStep: (activeStep) => set({ activeStep }),
  setAppView: (appView) => set({ appView }),
  setAgentSearchQuery: (agentSearchQuery) => set({ agentSearchQuery }),
  setAgentItems: (agentItems) =>
    set((state) => {
      const pendingAgents = state.agentItems.filter(
        (agent) =>
          agent.id.startsWith("generating-") &&
          !agentItems.some((item) => item.name === agent.name),
      );
      const nextAgentItems = [...pendingAgents, ...agentItems];

      return {
        agentItems: nextAgentItems,
        selectedAgentId: nextAgentItems.some(
          (agent) => agent.id === state.selectedAgentId,
        )
          ? state.selectedAgentId
          : nextAgentItems[0]?.id ?? "",
      };
    }),
  setFlowStepItems: (flowStepItems) => set({ flowStepItems }),
  setInspectorCollapsed: (isInspectorCollapsed) => set({ isInspectorCollapsed }),
  setMarkdownSidebarMode: (markdownSidebarMode) => set({ markdownSidebarMode }),
  setMarkdownSidebarOpen: (isMarkdownSidebarOpen) => set({ isMarkdownSidebarOpen }),
  setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
  setSelectedFlowNodeId: (selectedFlowNodeId) => set({ selectedFlowNodeId }),
  toggleAgentPanel: () =>
    set((state) => ({ isAgentPanelCollapsed: !state.isAgentPanelCollapsed })),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
