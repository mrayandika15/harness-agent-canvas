"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { Pencil, Save, X } from "lucide-react";

import { MarkdownContent } from "@/components/app/markdown-content";
import { PanelCard } from "@/components/app/panel-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchFlowNodeContent,
  saveFlowNodeContent,
} from "@/features/flow/api/flow-node-content";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function FlowNodeInspector() {
  const selectedFlowNodeId = useWorkspaceStore((state) => state.selectedFlowNodeId);
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);
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

  const selectedNode = flowStepItems.find((step) => step.id === selectedFlowNodeId);
  const selectedNodeId = selectedNode?.id;

  useEffect(() => {
    if (!selectedNodeId) {
      setContent("");
      setDraft("");
      setIsEditing(false);
      return;
    }

    const nodeId = selectedNodeId;

    let cancelled = false;

    async function loadContent() {
      const nextContent = await fetchFlowNodeContent(nodeId);

      if (!cancelled) {
        setContent(nextContent);
        setDraft(nextContent);
        setIsEditing(false);
      }
    }

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, [selectedNodeId]);

  if (!selectedNode) {
    return null;
  }

  async function handleSave() {
    if (!selectedNodeId) {
      return;
    }

    setIsSaving(true);

    try {
      await saveFlowNodeContent(selectedNodeId, draft);
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

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[29vw] min-w-[380px] max-w-[460px] p-4 pb-[176px]"
    >
      <PanelCard className="pointer-events-auto flex h-full min-h-0 flex-col rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(11,11,11,0.98),rgba(7,7,7,0.96))] p-0">
        <div className="border-b border-white/6 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
                Flow Inspector
              </p>
              <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.05em] text-white">
                {selectedNode.title}
              </h2>
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
                  setIsEditing(true);
                }}
                disabled={isSaving}
                className="h-[40px] rounded-full border border-[rgba(196,112,52,0.56)] bg-[linear-gradient(180deg,#5c3118,#4b2612)] px-4 text-[13px] font-semibold text-[#f8ede6] shadow-[inset_0_1px_0_rgba(255,206,178,0.12)] hover:bg-[linear-gradient(180deg,#6a391d,#572c16)]"
              >
                {isEditing ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
                {isSaving ? "Saving" : isEditing ? "Save" : "Edit"}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={handleClose}
                className="rounded-full border border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close inspector</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 px-5 pt-3 pb-5">
          <div className="flex h-full min-h-0 flex-col rounded-[24px] bg-[linear-gradient(180deg,rgba(18,18,18,0.78),rgba(9,9,9,0.72))]">
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
                  className="h-full min-h-0 resize-none rounded-[20px] border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/80 placeholder:text-white/20"
                />
              </div>
            ) : (
              <ScrollArea className="min-h-0 flex-1 rounded-b-[24px]">
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
      </PanelCard>
    </motion.aside>
  );
}
