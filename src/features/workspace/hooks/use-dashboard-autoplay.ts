"use client";

import { useEffect } from "react";

import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function useDashboardAutoplay(stepCount: number) {
  const activeStep = useWorkspaceStore((state) => state.activeStep);
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);
  const isPlaying = useWorkspaceStore((state) => state.isPlaying);
  const setActiveStep = useWorkspaceStore((state) => state.setActiveStep);
  const setSelectedFlowNodeId = useWorkspaceStore(
    (state) => state.setSelectedFlowNodeId,
  );

  useEffect(() => {
    if (!isPlaying || stepCount === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      const nextStep = (activeStep + 1) % stepCount;

      setActiveStep(nextStep);
      setSelectedFlowNodeId(flowStepItems[nextStep]?.id ?? null);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [
    activeStep,
    flowStepItems,
    isPlaying,
    setActiveStep,
    setSelectedFlowNodeId,
    stepCount,
  ]);
}
