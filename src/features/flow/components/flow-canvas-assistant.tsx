"use client";

import { ArrowUp, Paperclip } from "lucide-react";

import { PanelCard } from "@/components/app/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function FlowCanvasAssistant() {
  const selectedFlowNodeId = useWorkspaceStore((state) => state.selectedFlowNodeId);
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);

  const selectedNode = flowStepItems.find((step) => step.id === selectedFlowNodeId);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[3vh] z-20 px-6">
      <div className="pointer-events-auto mx-auto w-full max-w-3xl">
        <PanelCard className="rounded-[22px] border-white/8 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(8,8,8,0.97))] p-2.5 shadow-[0_20px_56px_rgba(0,0,0,0.32)]">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                AI Assistant
              </p>
              {selectedNode ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-[rgba(245,148,78,0.18)] bg-[rgba(245,148,78,0.08)] px-3 text-[10px] uppercase tracking-[0.18em] text-[var(--accent-strong)]"
                >
                  @{selectedNode.id}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Textarea
              placeholder="Update the full flow, tag nodes like @persona or @compose, or ask AI to draft a PRD for the current workflow..."
              className="min-h-[52px] resize-none rounded-[18px] border-0 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(8,8,8,0.97))] px-4 py-2.5 text-[14px] leading-5 text-white/80 placeholder:text-white/24 shadow-none focus-visible:ring-0 focus-visible:border-0"
            />

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-[40px] w-[40px] rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] text-white/62 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </Button>

              <Button
                type="button"
                variant="default"
                className="h-[40px] rounded-full border border-[rgba(196,112,52,0.56)] bg-[linear-gradient(180deg,#5c3118,#4b2612)] px-4 text-[13px] font-semibold text-[#f8ede6] shadow-[inset_0_1px_0_rgba(255,206,178,0.12)] hover:bg-[linear-gradient(180deg,#6a391d,#572c16)]"
              >
                <ArrowUp className="h-3 w-3" />
                Update Flow
              </Button>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
