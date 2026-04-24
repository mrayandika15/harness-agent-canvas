"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { ArrowLeft, Pencil, Save, Sparkles, Wand2 } from "lucide-react";

import { MarkdownContent } from "@/components/app/markdown-content";
import { PanelCard } from "@/components/app/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchFlowNodeContent,
  saveFlowNodeContent,
} from "@/features/flow/api/flow-node-content";
import { flowSteps } from "@/features/flow/lib/flow-data";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

type FlowNodeDetailPageProps = {
  nodeId: string;
};

export function FlowNodeDetailPage({ nodeId }: FlowNodeDetailPageProps) {
  const setAppView = useWorkspaceStore((state) => state.setAppView);
  const selectedNode = flowSteps.find((step) => step.id === nodeId);
  const [content, setContent] = useState("");
  const [draft, setDraft] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAppView("canvas");
  }, [setAppView]);

  useEffect(() => {
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
  }, [nodeId]);

  if (!selectedNode) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--background)] text-white">
        <PanelCard className="w-full max-w-lg p-8 text-center">
          <h1 className="text-2xl font-semibold">Flow node not found</h1>
          <div className="mt-4">
            <Link
              href="/"
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]",
              )}
            >
              Back to Canvas
            </Link>
          </div>
        </PanelCard>
      </div>
    );
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      await saveFlowNodeContent(nodeId, draft);
      setContent(draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 bg-[rgba(5,5,5,0.82)]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-white/6 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white/84 transition-colors hover:bg-white/[0.08]",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Canvas
            </Link>

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
              className="rounded-full bg-[rgba(245,148,78,0.82)] px-4 text-black hover:bg-[rgba(255,170,107,0.92)]"
            >
              {isEditing ? <Save className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {isSaving ? "Saving" : isEditing ? "Save" : "Edit"}
            </Button>
          </div>
        </div>

        <div className="border-b border-white/6 px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
            Flow Inspector
          </p>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-white">
            {selectedNode.title}
          </h1>
          <p className="mt-2 text-base text-white/42">{selectedNode.subtitle}</p>
        </div>

        <div className="border-b border-white/6 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {selectedNode.connectedMcp.map((tool) => (
              <Badge
                key={tool}
                variant="outline"
                className="rounded-full border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/60"
              >
                {tool}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_160px] gap-4 p-6">
          <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <PanelCard className="flex min-h-0 flex-col rounded-[28px] p-0">
              <div className="border-b border-white/6 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                  Markdown Editor
                </p>
              </div>
              <div className="min-h-0 flex-1 p-5">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="h-full min-h-0 resize-none rounded-[24px] border-white/8 bg-black/30 p-4 text-sm leading-7 text-white/80 placeholder:text-white/20"
                />
              </div>
            </PanelCard>

            <PanelCard className="flex min-h-0 flex-col rounded-[28px] p-0">
              <div className="border-b border-white/6 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                  Markdown Preview
                </p>
              </div>
              <ScrollArea className="min-h-0 flex-1 rounded-b-[28px]">
                <div className="p-5">
                  <MarkdownContent content={draft} className="prose prose-invert max-w-none" />
                </div>
              </ScrollArea>
            </PanelCard>
          </div>

          <PanelCard className="rounded-[28px] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                AI Assistant
              </p>
              <Badge
                variant="outline"
                className="rounded-full border-white/8 bg-white/[0.03] px-3 text-white/54"
              >
                Inline
              </Badge>
            </div>
            <div className="flex h-[92px] items-end gap-3">
              <Textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder={`Ask AI to improve ${selectedNode.title}.md...`}
                className="min-h-[92px] flex-1 resize-none rounded-[20px] border-0 bg-black/30 p-4 text-sm leading-6 text-white/78 placeholder:text-white/22"
              />

              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-11 rounded-full bg-[rgba(245,148,78,0.82)] px-4 text-black hover:bg-[rgba(255,170,107,0.92)]"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 rounded-full border-white/10 bg-white/[0.03] px-4 text-white/80"
              >
                <Wand2 className="h-4 w-4" />
                Refine
              </Button>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
