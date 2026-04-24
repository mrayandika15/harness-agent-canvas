"use client";

import { AgentListPanel } from "@/features/agents/components/agent-list-panel";
import { SelectedAgentHeader } from "@/features/agents/components/selected-agent-header";
import { SidebarNav } from "@/features/navigation/components/sidebar-nav";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";
import { cn } from "@/lib/utils";

type AgentCanvasShellProps = {
  children: React.ReactNode;
};

export function AgentCanvasShell({ children }: AgentCanvasShellProps) {
  const isAgentPanelCollapsed = useWorkspaceStore(
    (state) => state.isAgentPanelCollapsed,
  );

  return (
    <main className="relative h-screen overflow-hidden bg-[var(--background)] text-white">
      <div className="hex-surface" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <div
        className={cn(
          "relative grid h-screen w-full grid-cols-1 overflow-hidden transition-[grid-template-columns] duration-300 lg:grid-cols-[92px_320px_minmax(0,1fr)]",
          isAgentPanelCollapsed && "lg:grid-cols-[92px_minmax(0,1fr)]",
        )}
      >
        <SidebarNav />
        <AgentListPanel />
        <section className="flex h-screen min-h-0 flex-col">
          <SelectedAgentHeader />
          <div className="relative flex min-h-0 flex-1">{children}</div>
        </section>
      </div>
    </main>
  );
}
