"use client";

import { Plus } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

type FlowNodeData = {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  index: number;
  canAdd?: boolean;
  onAddStep?: () => void;
};

export function FlowStepNode({ data, selected }: NodeProps) {
  const activeStep = useWorkspaceStore((state) => state.activeStep);
  const isPlaying = useWorkspaceStore((state) => state.isPlaying);
  const setActiveStep = useWorkspaceStore((state) => state.setActiveStep);
  const node = data as FlowNodeData;
  const isActive = activeStep === node.index;
  const isCompleted = activeStep > node.index;
  const isSelected = Boolean(selected);
  const Icon = node.icon;

  return (
    <div className="group relative">
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div
        onMouseEnter={() => setActiveStep(node.index)}
        className="flow-node-drag-handle relative flex cursor-pointer flex-col items-center bg-transparent"
      >
        <div
          className={cn(
            "relative flex h-26 w-26 cursor-grab items-center justify-center rounded-full border transition-all duration-300 active:cursor-grabbing",
            isSelected
              ? "border-[rgba(245,148,78,0.56)] bg-[radial-gradient(circle_at_top,_rgba(109,58,24,0.96),_rgba(24,13,8,0.98))] shadow-[0_0_50px_rgba(245,148,78,0.24)]"
              : isActive
                ? "border-[rgba(245,148,78,0.42)] bg-[radial-gradient(circle_at_top,_rgba(88,43,19,0.92),_rgba(22,12,8,0.98))] shadow-[0_0_42px_rgba(245,148,78,0.18)]"
                : "border-[rgba(245,148,78,0.28)] bg-[radial-gradient(circle_at_top,_rgba(52,28,15,0.84),_rgba(18,11,8,0.98))] group-hover:border-[rgba(245,148,78,0.42)] group-hover:shadow-[0_0_32px_rgba(245,148,78,0.12)]",
          )}
        >
          <div className="absolute inset-[10px] rounded-full border border-white/6" />
          {isPlaying && isActive ? (
            <div className="absolute inset-0 animate-ping rounded-full border border-[rgba(245,148,78,0.3)]" />
          ) : null}
          {node.canAdd ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                node.onAddStep?.();
              }}
              className="absolute -right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(245,148,78,0.38)] bg-[rgba(24,13,8,0.98)] text-[var(--accent-strong)] shadow-[0_0_28px_rgba(245,148,78,0.2)] transition-colors hover:border-[rgba(245,148,78,0.54)] hover:bg-[rgba(52,28,15,0.96)]"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}
          <div
            className={cn(
              "relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border",
              isSelected || isActive || isCompleted
                ? "border-[rgba(245,148,78,0.38)] bg-[rgba(245,148,78,0.16)]"
                : "border-[rgba(245,148,78,0.24)] bg-[rgba(245,148,78,0.08)]",
            )}
          >
            <Icon className="h-5 w-5 text-[var(--accent-strong)]" />
          </div>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-20 -translate-x-1/2 whitespace-nowrap text-center">
          <p
            className={cn(
              "text-base font-semibold tracking-[-0.03em] text-white/84",
              isSelected && "text-white",
            )}
          >
            {node.title}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/26">
            {node.step}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
}
