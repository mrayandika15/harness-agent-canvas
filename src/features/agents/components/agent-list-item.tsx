"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PixelAgent } from "@/features/agents/components/pixel-agent";
import type { Agent } from "@/features/agents/types/agent";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

type AgentListItemProps = {
  agent: Agent;
  active: boolean;
};

export function AgentListItem({ agent, active }: AgentListItemProps) {
  const isAgentPanelCollapsed = useWorkspaceStore(
    (state) => state.isAgentPanelCollapsed,
  );
  const setSelectedAgentName = useWorkspaceStore(
    (state) => state.setSelectedAgentName,
  );

  return (
    <button
      type="button"
      aria-pressed={active}
      className="w-full text-left"
      onClick={() => setSelectedAgentName(agent.name)}
    >
      <div
        className={cn(
          "group rounded-[24px] border px-3 py-2.5 transition-all duration-200",
          active
            ? "border-[rgba(245,148,78,0.32)] bg-[linear-gradient(180deg,rgba(73,39,18,0.42),rgba(17,13,10,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_16px_40px_rgba(0,0,0,0.18)]"
            : "border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.03]",
          isAgentPanelCollapsed && "flex justify-center px-2 py-3",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.03]">
            <PixelAgent color={agent.color} size="sm" />
          </div>
          {!isAgentPanelCollapsed ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p
                  className={cn(
                    "truncate text-[0.95rem] font-semibold tracking-[-0.04em] text-white/86",
                    active && "text-white",
                  )}
                >
                  {agent.name}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full border-white/10 bg-white/[0.03] px-2.5 text-[10px] uppercase tracking-[0.2em] text-white/46",
                    active && "border-[rgba(245,148,78,0.2)] text-[var(--accent-strong)]",
                  )}
                >
                  {agent.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-white/42">
                Assigned to orchestrated workflow operations
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
