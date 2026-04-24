"use client";

import { useEffect } from "react";

import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function useDashboardAutoplay(stepCount: number) {
  const activeStep = useWorkspaceStore((state) => state.activeStep);
  const isPlaying = useWorkspaceStore((state) => state.isPlaying);
  const setActiveStep = useWorkspaceStore((state) => state.setActiveStep);

  useEffect(() => {
    if (!isPlaying || stepCount === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveStep((activeStep + 1) % stepCount);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [activeStep, isPlaying, setActiveStep, stepCount]);
}
