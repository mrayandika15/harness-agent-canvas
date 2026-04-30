"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PixelAgent } from "@/features/agents/components/pixel-agent";
import {
  runtimeIcons,
  runtimeLabels,
} from "@/features/agents/lib/runtime-assets";
import type { Agent } from "@/features/agents/types/agent";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

type AgentListItemProps = {
  agent: Agent;
  active: boolean;
};

export function AgentListItem({ agent, active }: AgentListItemProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isAgentPanelCollapsed = useWorkspaceStore(
    (state) => state.isAgentPanelCollapsed,
  );
  const setSelectedAgentId = useWorkspaceStore(
    (state) => state.setSelectedAgentId,
  );
  const removeAgent = useWorkspaceStore((state) => state.removeAgent);
  const isGenerating = agent.status === "Generating";
  const isFailed = agent.status === "Failed";
  const isRunning =
    agent.status === "Reading Flow" ||
    agent.status === "Running" ||
    agent.status.startsWith("Step ");
  const isWaitingInput = agent.status === "Waiting Input";

  async function readDeletePayload(response: Response) {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as { error?: string; ok?: boolean };
    } catch {
      return {
        error: response.ok
          ? undefined
          : text || "Could not delete agent.",
      };
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "DELETE",
      });
      const payload = await readDeletePayload(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not delete agent.");
      }

      removeAgent(agent.id);
      setIsDeleteOpen(false);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete agent.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={active}
        onClick={() => {
          if (!isGenerating) {
            setSelectedAgentId(agent.id);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!isGenerating) {
              setSelectedAgentId(agent.id);
            }
          }
        }}
        className={cn(
          "group rounded-[24px] border px-3 py-2.5 text-left transition-all duration-200",
          active
            ? "border-[rgba(245,148,78,0.32)] bg-[linear-gradient(180deg,rgba(73,39,18,0.42),rgba(17,13,10,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_16px_40px_rgba(0,0,0,0.18)]"
            : "border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.03]",
          isGenerating &&
            "border-[rgba(149,232,215,0.18)] bg-[linear-gradient(180deg,rgba(149,232,215,0.08),rgba(255,255,255,0.015))] shadow-[inset_0_1px_0_rgba(149,232,215,0.08)]",
          isRunning &&
            "border-[rgba(149,232,215,0.18)] bg-[linear-gradient(180deg,rgba(149,232,215,0.07),rgba(255,255,255,0.015))]",
          isWaitingInput &&
            "border-[rgba(245,148,78,0.24)] bg-[linear-gradient(180deg,rgba(245,148,78,0.09),rgba(255,255,255,0.015))]",
          isFailed &&
            "border-[#ff8e97]/18 bg-[linear-gradient(180deg,rgba(255,142,151,0.08),rgba(255,255,255,0.015))]",
          isAgentPanelCollapsed && "flex justify-center px-2 py-3",
        )}
      >
        <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_28px] items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.03]">
            <PixelAgent color={agent.color} icon={agent.icon} size="sm" />
            {isGenerating || isRunning ? (
              <div className="absolute inset-[-3px] rounded-[19px] border border-[#95e8d7]/28" />
            ) : null}
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[#101010] bg-white p-0.5 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
              {isGenerating || isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#111]" />
              ) : (
                <img
                  src={runtimeIcons[agent.runtime]}
                  alt={`${runtimeLabels[agent.runtime]} runtime`}
                  className="h-full w-full rounded-full object-contain"
                />
              )}
            </div>
          </div>
          {!isAgentPanelCollapsed ? (
            <div className="min-w-0 flex-1">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
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
                    "max-w-24 shrink-0 rounded-full border-white/10 bg-white/[0.03] px-2 text-[10px] uppercase tracking-[0.18em] text-white/46",
                    active && "border-[rgba(245,148,78,0.2)] text-[var(--accent-strong)]",
                    (isGenerating || isRunning) &&
                      "border-[#95e8d7]/18 bg-[#95e8d7]/8 text-[#b8fff1]",
                    isWaitingInput &&
                      "border-[rgba(245,148,78,0.28)] bg-[rgba(245,148,78,0.09)] text-[var(--accent-strong)]",
                    isFailed &&
                      "border-[#ff8e97]/20 bg-[#ff8e97]/8 text-[#ffb8c0]",
                  )}
                >
                  {isGenerating || isRunning ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  <span className="truncate">{agent.status}</span>
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-white/42">
                <span className="mr-1 text-white/28">
                  {runtimeLabels[agent.runtime]}
                </span>
                {agent.personality
                  ? agent.personality.replace(/^#+\s*/m, "").split("\n")[0]
                  : "Assigned to orchestrated workflow operations"}
              </p>
            </div>
          ) : null}
          {!isAgentPanelCollapsed && !isGenerating ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={(event) => {
                event.stopPropagation();
                setDeleteError(null);
                setIsDeleteOpen(true);
              }}
              className="h-7 w-7 rounded-full border border-transparent text-white/24 opacity-0 transition-opacity hover:border-[#ff8e97]/20 hover:bg-[#ff8e97]/10 hover:text-[#ff8e97] group-hover:opacity-100 focus-visible:opacity-100"
              title={`Delete ${agent.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete {agent.name}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(8,8,8,0.98))] p-0 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] sm:max-w-md">
          <DialogHeader className="border-b border-white/6 p-6">
            <DialogTitle className="text-xl font-semibold tracking-[-0.04em] text-white">
              Delete {agent.name}?
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-white/42">
              This will remove the agent, its chat history, and its local
              Markdown-backed harness files.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            <div className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.025] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.03]">
                <PixelAgent color={agent.color} icon={agent.icon} size="sm" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {agent.name}
                </p>
                <p className="truncate text-xs text-white/42">
                  {agent.runtime === "claude" ? "Claude" : "Codex"} runtime
                </p>
              </div>
            </div>
            {deleteError ? (
              <p className="mt-3 text-sm text-[#ff8e97]">{deleteError}</p>
            ) : null}
          </div>

          <DialogFooter className="mx-0 mb-0 border-white/8 bg-white/[0.025]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="rounded-full border-white/10 bg-transparent px-4 text-white/64 hover:bg-white/[0.06] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="rounded-full border border-[#ff8e97]/30 bg-[#ff8e97]/12 px-4 text-[#ffb8c0] hover:bg-[#ff8e97]/18"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeleting ? "Deleting..." : "Delete agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
