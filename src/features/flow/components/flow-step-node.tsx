"use client";

import { Check, Link2, Plus } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

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
  onAddStep?: () => void;
};

const statusMeta = {
  draft: {
    label: "Draft",
    className: "border-white/10 bg-white/[0.04] text-white/46",
  },
  ready: {
    label: "Ready",
    className: "border-[rgba(149,232,215,0.22)] bg-[rgba(149,232,215,0.1)] text-[#b8fff1]",
  },
  review: {
    label: "Review",
    className: "border-[rgba(235,192,95,0.24)] bg-[rgba(235,192,95,0.1)] text-[#ffe0a1]",
  },
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
  const status = statusMeta[node.instructionStatus];

  return (
    <div className="group relative">
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div
        onMouseEnter={() => setActiveStep(node.index)}
        className="flow-node-drag-handle relative flex cursor-pointer flex-col bg-transparent"
      >
        <div
          className={cn(
            "relative w-[280px] cursor-grab rounded-[22px] border p-4 transition-all duration-300 active:cursor-grabbing",
            isSelected
              ? "border-[rgba(245,148,78,0.56)] bg-[linear-gradient(180deg,rgba(41,25,16,0.98),rgba(12,12,12,0.98))] shadow-[0_24px_80px_rgba(245,148,78,0.18)]"
              : isActive
                ? "border-[rgba(149,232,215,0.34)] bg-[linear-gradient(180deg,rgba(20,34,31,0.96),rgba(11,11,11,0.98))] shadow-[0_20px_64px_rgba(149,232,215,0.12)]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(19,19,19,0.96),rgba(9,9,9,0.98))] group-hover:border-white/18 group-hover:shadow-[0_20px_54px_rgba(0,0,0,0.32)]",
          )}
        >
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />
          {isPlaying && isActive ? (
            <div className="absolute inset-0 animate-pulse rounded-[22px] border border-[rgba(149,232,215,0.24)]" />
          ) : null}
          {node.canAdd ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                node.onAddStep?.();
              }}
              className="absolute -right-4 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(245,148,78,0.38)] bg-[rgba(24,13,8,0.98)] text-[var(--accent-strong)] shadow-[0_0_28px_rgba(245,148,78,0.2)] transition-colors hover:border-[rgba(245,148,78,0.54)] hover:bg-[rgba(52,28,15,0.96)]"
              title="Add next step"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border",
                  isSelected || isActive || isCompleted
                    ? "border-[rgba(245,148,78,0.34)] bg-[rgba(245,148,78,0.14)]"
                    : "border-white/10 bg-white/[0.04]",
                )}
              >
                <Icon className="h-5 w-5 text-[var(--accent-strong)]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                    {node.step}
                  </p>
                  {isCompleted ? <Check className="h-3.5 w-3.5 text-[#95e8d7]" /> : null}
                </div>
                <p
                  className={cn(
                    "mt-1 truncate text-lg font-semibold tracking-[-0.04em] text-white/84",
                    isSelected && "text-white",
                  )}
                >
                  {node.title}
                </p>
              </div>
            </div>
            <span className={cn("rounded-full border px-2 py-1 text-[10px] font-medium", status.className)}>
              {status.label}
            </span>
          </div>

          <p className="relative z-10 mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-white/42">
            {node.subtitle}
          </p>

          <div className="relative z-10 mt-4 grid gap-2">
            <div className="rounded-[14px] border border-white/8 bg-black/20 px-3 py-2">
              <Link2 className="mb-1 h-3.5 w-3.5 text-white/34" />
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/24">
                {node.sourceLinks.length} links
              </p>
            </div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
}
