"use client";

import { useEffect } from "react";

import { flowSteps } from "@/features/dashboard/lib/dashboard-data";
import { SidebarNav } from "@/features/dashboard/components/sidebar-nav";
import { AgentListPanel } from "@/features/dashboard/components/agent-list-panel";
import { AgentChatWorkspace } from "@/features/dashboard/components/agent-chat-workspace";
import { FlowCanvas } from "@/features/dashboard/components/flow-canvas";
import { FlowNodeInspector } from "@/features/dashboard/components/flow-node-inspector";
import { FlowNodeMarkdownSidebar } from "@/features/dashboard/components/flow-node-markdown-sidebar";
import { SelectedAgentHeader } from "@/features/dashboard/components/selected-agent-header";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvas-store";

export function AgentCanvasDashboard() {
  const { activeStep, appView, isPlaying, isAgentPanelCollapsed, setActiveStep } =
    useCanvasStore();

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveStep((activeStep + 1) % flowSteps.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [activeStep, isPlaying, setActiveStep]);

  return (
    <main className="relative h-screen overflow-hidden bg-[var(--background)] text-white">
      <div className="hex-surface" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <div
        className={cn(
          "relative grid h-screen w-full grid-cols-1 overflow-hidden transition-[grid-template-columns] duration-300 lg:grid-cols-[92px_236px_minmax(0,1fr)]",
          isAgentPanelCollapsed && "lg:grid-cols-[92px_minmax(0,1fr)]",
        )}
      >
        <SidebarNav />
        <AgentListPanel />
        <section className="flex h-screen min-h-0 flex-col">
          <SelectedAgentHeader />
          {appView === "chat" ? (
            <AgentChatWorkspace />
          ) : (
            <div className="flex min-h-0 flex-1">
              <FlowCanvas />
              <FlowNodeMarkdownSidebar />
              <FlowNodeInspector />
            </div>
          )}
        </section>
      </div>

    </main>
  );
}
