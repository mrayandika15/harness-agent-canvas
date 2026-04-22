"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PixelAgent } from "@/features/dashboard/components/pixel-agent";
import { useCanvasStore } from "@/stores/canvas-store";

type AgentListItemProps = {
  agent: {
    name: string;
    status: string;
    color: string;
    active?: boolean;
  };
};

export function AgentListItem({ agent }: AgentListItemProps) {
  const { isAgentPanelCollapsed, setSelectedAgentName } = useCanvasStore();

  return (
    <button
      type="button"
      aria-pressed={agent.active}
      className="w-full text-left"
      onClick={() => setSelectedAgentName(agent.name)}
    >
      <Card
        className={cn(
          "flex items-center gap-2.5 border border-transparent bg-transparent px-2 py-1.5 shadow-none transition-colors duration-200 hover:bg-white/[0.03]",
          isAgentPanelCollapsed && "justify-center px-2 py-3",
          agent.active &&
            "border-[rgba(217,134,75,0.22)] bg-[linear-gradient(180deg,rgba(54,29,15,0.24),rgba(255,255,255,0.03))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center shrink-0">
          <PixelAgent color={agent.color} size="sm" />
        </div>
        {!isAgentPanelCollapsed ? (
          <>
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full bg-white/18 transition-colors duration-200",
                agent.active && "bg-[var(--accent)] shadow-[0_0_12px_rgba(217,134,75,0.45)]",
              )}
            />
            <div>
              <p
                className={cn(
                  "text-[0.95rem] font-semibold tracking-[-0.04em] text-white/88",
                  agent.active && "text-white",
                )}
              >
                {agent.name}
              </p>
              <p
                className={cn(
                  "text-[11px] text-white/42",
                  agent.active && "text-white/58",
                )}
              >
                {agent.status}
              </p>
            </div>
          </>
        ) : null}
      </Card>
    </button>
  );
}
