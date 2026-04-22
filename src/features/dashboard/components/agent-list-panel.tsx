"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { agentList } from "@/features/dashboard/lib/dashboard-data";
import { SidebarHeader } from "@/features/dashboard/components/sidebar-header";
import { AgentListItem } from "@/features/dashboard/components/agent-list-item";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvas-store";

export function AgentListPanel() {
  const { isAgentPanelCollapsed, selectedAgentName } = useCanvasStore();

  return (
    <section
      className={cn(
        "border-b border-white/6 bg-[rgba(7,7,7,0.88)] transition-all duration-300 lg:border-b-0 lg:border-r",
        isAgentPanelCollapsed && "hidden lg:hidden",
      )}
    >
      <div className="flex h-full flex-col">
        <SidebarHeader />
        <Separator />
        <ScrollArea
          className={cn(
            "min-h-0 flex-1 px-2 py-2 transition-all duration-300",
            isAgentPanelCollapsed && "px-2 py-3",
          )}
        >
          <div className={cn("space-y-1 pr-1", isAgentPanelCollapsed && "pr-0")}>
            {agentList.map((agent, index) => (
              <AgentListItem
                key={agent.name}
                agent={{
                  ...agent,
                  active: agent.name === selectedAgentName,
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
