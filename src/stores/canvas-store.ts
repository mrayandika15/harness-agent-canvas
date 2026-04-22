"use client";

import { create } from "zustand";

import { agentList, flowSteps, type FlowStepMeta } from "@/features/dashboard/lib/dashboard-data";

type CanvasState = {
  appView: "canvas" | "chat";
  activeStep: number;
  isPlaying: boolean;
  isAgentPanelCollapsed: boolean;
  isInspectorCollapsed: boolean;
  selectedAgentName: string;
  selectedFlowNodeId: string | null;
  flowStepItems: FlowStepMeta[];
  isMarkdownSidebarOpen: boolean;
  markdownSidebarMode: "view" | "edit";
  setAppView: (view: "canvas" | "chat") => void;
  setActiveStep: (step: number) => void;
  togglePlaying: () => void;
  toggleAgentPanel: () => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
  setFlowStepItems: (items: FlowStepMeta[]) => void;
  appendFlowStepItem: (item: FlowStepMeta) => void;
  setSelectedAgentName: (name: string) => void;
  setSelectedFlowNodeId: (id: string | null) => void;
  setMarkdownSidebarOpen: (open: boolean) => void;
  setMarkdownSidebarMode: (mode: "view" | "edit") => void;
};

export const useCanvasStore = create<CanvasState>((set) => ({
  appView: "canvas",
  activeStep: 1,
  isPlaying: false,
  isAgentPanelCollapsed: false,
  isInspectorCollapsed: false,
  selectedAgentName: agentList[0]?.name ?? "",
  selectedFlowNodeId: "persona",
  flowStepItems: flowSteps,
  isMarkdownSidebarOpen: false,
  markdownSidebarMode: "view",
  setAppView: (appView) => set({ appView }),
  setActiveStep: (activeStep) => set({ activeStep }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  toggleAgentPanel: () =>
    set((state) => ({ isAgentPanelCollapsed: !state.isAgentPanelCollapsed })),
  setInspectorCollapsed: (isInspectorCollapsed) => set({ isInspectorCollapsed }),
  setFlowStepItems: (flowStepItems) => set({ flowStepItems }),
  appendFlowStepItem: (item) =>
    set((state) => ({ flowStepItems: [...state.flowStepItems, item] })),
  setSelectedAgentName: (selectedAgentName) => set({ selectedAgentName }),
  setSelectedFlowNodeId: (selectedFlowNodeId) => set({ selectedFlowNodeId }),
  setMarkdownSidebarOpen: (isMarkdownSidebarOpen) => set({ isMarkdownSidebarOpen }),
  setMarkdownSidebarMode: (markdownSidebarMode) => set({ markdownSidebarMode }),
}));
