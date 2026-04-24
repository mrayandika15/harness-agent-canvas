"use client";

import { useEffect, useState } from "react";

import { Save, Sparkles, Wand2 } from "lucide-react";

import { MarkdownContent } from "@/components/app/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchFlowNodeContent,
  saveFlowNodeContent,
} from "@/features/flow/api/flow-node-content";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function FlowNodeMarkdownSidebar() {
  const selectedFlowNodeId = useWorkspaceStore((state) => state.selectedFlowNodeId);
  const isMarkdownSidebarOpen = useWorkspaceStore(
    (state) => state.isMarkdownSidebarOpen,
  );
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);
  const setMarkdownSidebarOpen = useWorkspaceStore(
    (state) => state.setMarkdownSidebarOpen,
  );
  const setMarkdownSidebarMode = useWorkspaceStore(
    (state) => state.setMarkdownSidebarMode,
  );
  const [content, setContent] = useState("");
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const selectedNode = flowStepItems.find((step) => step.id === selectedFlowNodeId);
  const selectedNodeId = selectedNode?.id;

  useEffect(() => {
    if (!selectedNodeId) {
      setContent("");
      setDraft("");
      return;
    }

    const nodeId = selectedNodeId;

    let cancelled = false;

    async function loadContent() {
      const nextContent = await fetchFlowNodeContent(nodeId);

      if (!cancelled) {
        setContent(nextContent);
        setDraft(nextContent);
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
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet
      open={isMarkdownSidebarOpen}
      onOpenChange={(open) => {
        setMarkdownSidebarOpen(open);
        if (!open) {
          setDraft(content);
          setMarkdownSidebarMode("view");
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="h-[52vh] rounded-t-[32px] border-white/8 border-x border-t bg-[linear-gradient(180deg,rgba(11,11,11,0.98),rgba(7,7,7,0.96))] p-0 text-white"
      >
        <SheetHeader className="border-b border-white/6 px-5 py-4">
          <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/12" />
          <div className="flex items-start justify-between gap-3 pr-12">
            <div>
              <SheetTitle className="font-[family-name:var(--font-display)] text-[1.15rem] tracking-[-0.04em] text-white">
                {selectedNode.title}.md
              </SheetTitle>
              <SheetDescription className="mt-2 text-white/44">
                Feature-scoped markdown editor for the active flow step
              </SheetDescription>
            </div>
            <Badge
              variant="outline"
              className="rounded-full border-[rgba(245,148,78,0.18)] bg-[rgba(245,148,78,0.08)] px-3 text-[10px] uppercase tracking-[0.2em] text-[var(--accent-strong)]"
            >
              {selectedNode.step}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
          <div className="mb-4 flex items-center justify-end">
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full bg-[rgba(245,148,78,0.82)] px-4 text-black hover:bg-[rgba(255,170,107,0.92)]"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving" : "Save"}
            </Button>
          </div>

          <ScrollArea className="h-full rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,18,18,0.92),rgba(9,9,9,0.9))]">
            <div className="p-5">
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/28">
                Markdown Preview
              </p>
              <MarkdownContent content={draft} className="prose prose-invert max-w-none" />
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
