"use client";

import { Plus, Trash2 } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { PixelAgent } from "@/features/agents/components/pixel-agent";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";
import { cn } from "@/lib/utils";

type FlowNodeData = {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  connectedMcp: string[];
  sourceLinks: string[];
  instructionStatus: "draft" | "ready" | "review";
  index: number;
  canAdd?: boolean;
  canDelete?: boolean;
  onAddStep?: () => void;
  onDeleteStep?: () => void;
};

export function FlowStepNode({ data, selected }: NodeProps) {
  const activeStep = useWorkspaceStore((state) => state.activeStep);
  const isPlaying = useWorkspaceStore((state) => state.isPlaying);
  const agentItems = useWorkspaceStore((state) => state.agentItems);
  const selectedAgentId = useWorkspaceStore((state) => state.selectedAgentId);
  const node = data as FlowNodeData;
  const isSelected = Boolean(selected);
  const isActive = isSelected || activeStep === node.index;
  const isOrchestrator = node.index === 0;
  const selectedAgent =
    agentItems.find((agent) => agent.id === selectedAgentId) ?? agentItems[0];
  const Icon = node.icon;
  const displayTitle = isOrchestrator ? selectedAgent?.name ?? node.title : node.title;

  return (
    <div className="group relative">
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div className="flow-node-drag-handle relative flex w-[144px] cursor-grab flex-col items-center bg-transparent text-center active:cursor-grabbing">
        <div
          className={cn(
            "relative flex h-[76px] w-[76px] items-center justify-center rounded-[24px] border transition-all duration-300",
            isOrchestrator
              ? "border-[rgba(245,148,78,0.22)] bg-[rgba(245,148,78,0.08)]"
              : "border-white/10 bg-white/[0.035]",
            isSelected
              ? "border-[rgba(245,148,78,0.6)] bg-[rgba(245,148,78,0.12)] shadow-[0_18px_70px_rgba(245,148,78,0.18)]"
              : isActive
                ? "border-[rgba(149,232,215,0.34)] bg-[rgba(149,232,215,0.08)] shadow-[0_18px_70px_rgba(149,232,215,0.12)]"
                : "group-hover:border-white/20 group-hover:bg-white/[0.055]",
          )}
        >
          {isPlaying && isActive ? (
            <div className="absolute inset-0 animate-pulse rounded-[24px] border border-[rgba(149,232,215,0.24)]" />
          ) : null}
          {isOrchestrator && selectedAgent ? (
            <PixelAgent
              color={selectedAgent.color}
              icon={selectedAgent.icon}
              size="sm"
            />
          ) : (
            <Icon
              className={cn(
                "h-7 w-7",
                isSelected || isActive
                  ? "text-[var(--accent-strong)]"
                  : "text-white/58",
              )}
            />
          )}
          {node.canDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                node.onDeleteStep?.();
              }}
              className="absolute -right-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(255,128,150,0.24)] bg-[rgba(28,10,13,0.96)] text-[#ff9aac] opacity-0 shadow-[0_0_24px_rgba(255,128,150,0.12)] transition-all hover:border-[rgba(255,128,150,0.5)] hover:bg-[rgba(58,18,24,0.96)] group-hover:opacity-100"
              title="Delete node"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-3 w-full truncate text-sm font-semibold tracking-[-0.03em]",
            isSelected || isActive ? "text-white" : "text-white/72",
          )}
        >
          {displayTitle}
        </p>
        {node.canAdd ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              node.onAddStep?.();
            }}
            className="absolute -right-5 top-[25px] z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(245,148,78,0.38)] bg-[rgba(24,13,8,0.98)] text-[var(--accent-strong)] shadow-[0_0_28px_rgba(245,148,78,0.2)] transition-colors hover:border-[rgba(245,148,78,0.54)] hover:bg-[rgba(52,28,15,0.96)]"
            title={isOrchestrator ? "Add agent step" : "Add next step"}
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
}
