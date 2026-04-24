"use client";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { agents } from "@/features/agents/lib/agents";
import { AgentListItem } from "@/features/agents/components/agent-list-item";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function AgentListPanel() {
  const isAgentPanelCollapsed = useWorkspaceStore(
    (state) => state.isAgentPanelCollapsed,
  );
  const selectedAgentName = useWorkspaceStore((state) => state.selectedAgentName);
  const agentSearchQuery = useWorkspaceStore((state) => state.agentSearchQuery);
  const setAgentSearchQuery = useWorkspaceStore(
    (state) => state.setAgentSearchQuery,
  );

  const visibleAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase()),
  );

  return (
    <section
      className={cn(
        "border-b border-white/6 bg-[rgba(7,7,7,0.88)] transition-all duration-300 lg:border-b-0 lg:border-r",
        isAgentPanelCollapsed && "hidden lg:hidden",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-white/6 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium tracking-[0.02em] text-white/52">
                Harness Agent Canvas
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-white/10 bg-white/[0.03] px-3 text-white/84 hover:bg-white/[0.08]"
            >
              <Plus className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
              Add
            </Button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
            <Input
              value={agentSearchQuery}
              onChange={(event) => setAgentSearchQuery(event.target.value)}
              placeholder="Search agents"
              className="h-11 rounded-full border-white/8 bg-white/[0.03] pl-9 text-white placeholder:text-white/24"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2 py-2">
          <div className="space-y-1.5 pr-1">
            {visibleAgents.map((agent) => (
              <AgentListItem
                key={agent.name}
                agent={agent}
                active={agent.name === selectedAgentName}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
