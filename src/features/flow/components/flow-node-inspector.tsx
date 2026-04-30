"use client";

import { useEffect, useState } from "react";

import {
  ArrowRight,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { MarkdownContent } from "@/components/app/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchAgentFlowNodeContent,
  saveAgentFlowNode,
} from "@/features/flow/api/agent-flow";
import type { FlowStep } from "@/features/flow/types/flow-step";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function FlowNodeInspector() {
  const selectedAgentId = useWorkspaceStore((state) => state.selectedAgentId);
  const selectedFlowNodeId = useWorkspaceStore((state) => state.selectedFlowNodeId);
  const isInspectorCollapsed = useWorkspaceStore(
    (state) => state.isInspectorCollapsed,
  );
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);
  const setFlowStepItems = useWorkspaceStore((state) => state.setFlowStepItems);
  const setSelectedFlowNodeId = useWorkspaceStore(
    (state) => state.setSelectedFlowNodeId,
  );
  const setInspectorCollapsed = useWorkspaceStore(
    (state) => state.setInspectorCollapsed,
  );
  const [content, setContent] = useState("");
  const [draft, setDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sourceDraft, setSourceDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");

  const selectedNode = flowStepItems.find((step) => step.id === selectedFlowNodeId);
  const selectedNodeId = selectedNode?.id;
  const selectedNodeIndex = selectedNode
    ? flowStepItems.findIndex((step) => step.id === selectedNode.id)
    : -1;
  const previousNode =
    selectedNodeIndex > 0 ? flowStepItems[selectedNodeIndex - 1] : null;
  const nextNode =
    selectedNodeIndex >= 0 ? flowStepItems[selectedNodeIndex + 1] ?? null : null;

  useEffect(() => {
    if (!selectedAgentId || !selectedNodeId) {
      setContent("");
      setDraft("");
      setIsEditing(false);
      setSourceDraft("");
      setTitleDraft("");
      return;
    }

    const nodeId = selectedNodeId;

    let cancelled = false;

    async function loadContent() {
      const nextContent = await fetchAgentFlowNodeContent(selectedAgentId, nodeId);

      if (!cancelled) {
        setContent(nextContent);
        setDraft(nextContent);
        setIsEditing(false);
        setSourceDraft("");
        setTitleDraft(selectedNode?.title ?? "");
      }
    }

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, [selectedAgentId, selectedNode?.title, selectedNodeId]);

  if (!selectedNode) {
    return null;
  }

  function replaceNode(nextNode: FlowStep) {
    setFlowStepItems(
      flowStepItems.map((step) => (step.id === nextNode.id ? nextNode : step)),
    );
  }

  async function persistNode(nextNode: FlowStep, nextContent = content) {
    if (!selectedAgentId) {
      return null;
    }

    const savedNode = await saveAgentFlowNode(selectedAgentId, nextNode, nextContent);

    replaceNode(savedNode);
    return savedNode;
  }

  async function handleSave() {
    const nextTitle = titleDraft.trim();

    if (!selectedNode || !nextTitle) {
      return;
    }

    setIsSaving(true);

    try {
      const savedNode = await persistNode(
        {
          ...selectedNode,
          title: nextTitle,
          instructionStatus:
            nextTitle !== selectedNode.title &&
            selectedNode.instructionStatus === "ready"
              ? "review"
              : selectedNode.instructionStatus,
        },
        draft,
      );

      if (savedNode) {
        setTitleDraft(savedNode.title);
      }

      setContent(draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    setSelectedFlowNodeId(null);
    setInspectorCollapsed(true);
  }

  async function handleAddSource() {
    const nextSource = sourceDraft.trim();

    if (!nextSource || !selectedNode) {
      return;
    }

    await persistNode({
      ...selectedNode,
      sourceLinks: [...selectedNode.sourceLinks, nextSource],
      instructionStatus:
        selectedNode.instructionStatus === "draft"
          ? "review"
          : selectedNode.instructionStatus,
    });
    setSourceDraft("");
  }

  async function handleRemoveSource(source: string) {
    if (!selectedNode) {
      return;
    }

    await persistNode({
      ...selectedNode,
      sourceLinks: selectedNode.sourceLinks.filter((item) => item !== source),
      instructionStatus: "review",
    });
  }

  async function handleMarkReady() {
    if (!selectedNode) {
      return;
    }

    await persistNode({
      ...selectedNode,
      instructionStatus: "ready",
    });
  }

  return (
    <Dialog
      open={Boolean(selectedNode) && !isInspectorCollapsed}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(7,7,7,0.98))] p-0 text-white shadow-[0_32px_140px_rgba(0,0,0,0.72)] sm:max-w-[1180px]">
        <DialogHeader className="border-b border-white/6 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
                Flow Node Inspector
              </p>
              {isEditing ? (
                <Input
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSave();
                    }
                  }}
                  aria-label="Flow node title"
                  className="mt-2 h-11 rounded-[16px] border-white/10 bg-black/24 px-3 text-[1.25rem] font-semibold tracking-[-0.04em] text-white placeholder:text-white/20"
                />
              ) : (
                <DialogTitle className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-white">
                  {selectedNode.title}
                </DialogTitle>
              )}
              <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-white/42">
                {selectedNode.subtitle}
              </DialogDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="rounded-full bg-white/[0.04] px-3 text-white/54">
                  <Link2 className="h-3.5 w-3.5" />
                  {selectedNode.sourceLinks.length} sources
                </Badge>
                <Badge className="rounded-full bg-[rgba(149,232,215,0.1)] px-3 text-[#b8fff1]">
                  {selectedNode.instructionStatus}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => {
                  if (isEditing) {
                    void handleSave();
                    return;
                  }

                  setDraft(content);
                  setTitleDraft(selectedNode.title);
                  setIsEditing(true);
                }}
                disabled={isSaving || (isEditing && !titleDraft.trim())}
                className="h-[40px] rounded-full border border-[rgba(196,112,52,0.56)] bg-[linear-gradient(180deg,#5c3118,#4b2612)] px-4 text-[13px] font-semibold text-[#f8ede6] shadow-[inset_0_1px_0_rgba(255,206,178,0.12)] hover:bg-[linear-gradient(180deg,#6a391d,#572c16)]"
              >
                {isEditing ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
                {isSaving ? "Saving" : isEditing ? "Save" : "Edit"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(100vh-156px)]">
          <div className="space-y-4 px-6 py-5">
            <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.25fr_auto_1fr]">
              <ConnectedNodeCard
                label="Previous connected node"
                node={previousNode}
                onSelect={setSelectedFlowNodeId}
              />
              <div className="hidden items-center justify-center text-white/24 lg:flex">
                <ArrowRight className="h-5 w-5" />
              </div>
              <ConnectedNodeCard
                label="Current node"
                node={selectedNode}
                active
                onSelect={setSelectedFlowNodeId}
              />
              <div className="hidden items-center justify-center text-white/24 lg:flex">
                <ArrowRight className="h-5 w-5" />
              </div>
              <ConnectedNodeCard
                label="Next connected node"
                node={nextNode}
                onSelect={setSelectedFlowNodeId}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(18,18,18,0.78),rgba(9,9,9,0.72))] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                  Sources
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleMarkReady()}
                  className="h-7 rounded-full border border-white/8 bg-white/[0.03] px-3 text-[11px] text-white/64 hover:bg-white/[0.08] hover:text-white"
                >
                  Mark ready
                </Button>
              </div>

              <div className="space-y-2">
                {selectedNode.sourceLinks.map((source) => (
                  <div
                    key={source}
                    className="flex min-w-0 items-center gap-2 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/34" />
                    <span className="min-w-0 flex-1 truncate text-sm text-white/68">
                      {source}
                    </span>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => void handleRemoveSource(source)}
                      className="rounded-full text-white/42 hover:bg-white/[0.08] hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Remove source</span>
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  value={sourceDraft}
                  onChange={(event) => setSourceDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleAddSource();
                    }
                  }}
                  placeholder="Paste source URL, doc path, API spec, MCP reference, or repo link..."
                  className="h-10 rounded-[16px] border-white/8 bg-black/20 px-4 text-sm text-white/78 placeholder:text-white/20"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="default"
                  onClick={() => void handleAddSource()}
                  className="h-10 w-10 rounded-full border border-[rgba(196,112,52,0.56)] bg-[linear-gradient(180deg,#5c3118,#4b2612)] text-[#f8ede6] hover:bg-[linear-gradient(180deg,#6a391d,#572c16)]"
                >
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">Add source</span>
                </Button>
              </div>
            </div>

              <div className="flex min-h-[520px] flex-col rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(18,18,18,0.78),rgba(9,9,9,0.72))]">
              <div className="px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                  {isEditing ? "Markdown Editor" : "Markdown Preview"}
                </p>
              </div>

              {isEditing ? (
                <div className="min-h-0 flex-1 px-5 pb-5">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="h-[430px] min-h-0 resize-none rounded-[20px] border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/80 placeholder:text-white/20"
                  />
                </div>
              ) : (
                <ScrollArea className="h-[430px] rounded-b-[24px]">
                  <div className="px-5 pb-6">
                    <MarkdownContent
                      content={draft}
                      className="prose prose-invert max-w-none [&_h1]:mb-5 [&_h1]:text-[2rem] [&_h1]:tracking-[-0.05em] [&_h2]:mt-8 [&_p]:text-[1.02rem] [&_p]:leading-8 [&_ul]:mt-4 [&_ul]:space-y-2"
                    />
                  </div>
                </ScrollArea>
              )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function ConnectedNodeCard({
  label,
  node,
  active = false,
  onSelect,
}: {
  label: string;
  node: FlowStep | null;
  active?: boolean;
  onSelect: (nodeId: string) => void;
}) {
  const canSelect = Boolean(node && !active);

  return (
    <button
      type="button"
      disabled={!canSelect}
      onClick={() => {
        if (node && canSelect) {
          onSelect(node.id);
        }
      }}
      className={[
        "min-h-[150px] rounded-[24px] border p-4 text-left transition-all",
        active
          ? "border-[rgba(245,148,78,0.42)] bg-[linear-gradient(180deg,rgba(45,26,15,0.78),rgba(12,12,12,0.84))] shadow-[0_18px_70px_rgba(245,148,78,0.12)]"
          : canSelect
            ? "border-white/8 bg-white/[0.025] hover:border-[rgba(149,232,215,0.26)] hover:bg-[rgba(149,232,215,0.055)]"
            : "border-white/8 bg-white/[0.025]",
        canSelect ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/28">
        {label}
      </p>
      {node ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate text-lg font-semibold tracking-[-0.04em] text-white">
              {node.title}
            </h3>
            <Badge
              className={
                active
                  ? "rounded-full bg-[rgba(245,148,78,0.12)] px-3 text-[var(--accent-strong)]"
                  : "rounded-full bg-white/[0.05] px-3 text-white/54"
              }
            >
              {node.step}
            </Badge>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/42">
            {node.subtitle}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-white/28">
            {node.connectedMcp.length
              ? node.connectedMcp.join(" / ")
              : "No tools connected"}
          </p>
        </>
      ) : (
        <div className="mt-4 flex h-[86px] items-center rounded-[18px] border border-dashed border-white/10 px-4 text-sm text-white/34">
          No connected node
        </div>
      )}
    </button>
  );
}
