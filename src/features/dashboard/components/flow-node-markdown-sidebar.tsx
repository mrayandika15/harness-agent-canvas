"use client";

import { useEffect, useState } from "react";

import ReactMarkdown from "react-markdown";
import { Eye, Pencil, Save, Sparkles, Wand2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCanvasStore } from "@/stores/canvas-store";

const markdownComponents = {
  h1: (props: React.ComponentProps<"h3">) => (
    <h3 className="mb-3 text-lg font-semibold text-white" {...props} />
  ),
  h2: (props: React.ComponentProps<"h4">) => (
    <h4
      className="mb-2 mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/72"
      {...props}
    />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-3 text-sm leading-7 text-white/48" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mb-3 list-disc pl-5 text-white/48" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="mb-1" {...props} />,
  code: (props: React.ComponentProps<"code">) => (
    <code
      className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white/80"
      {...props}
    />
  ),
};

export function FlowNodeMarkdownSidebar() {
  const {
    selectedFlowNodeId,
    isMarkdownSidebarOpen,
    markdownSidebarMode,
    flowStepItems,
    setMarkdownSidebarOpen,
    setMarkdownSidebarMode,
  } = useCanvasStore();
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

    let cancelled = false;

    async function loadContent() {
      const response = await fetch(`/api/flow-node-content/${selectedNodeId}`);
      const data = (await response.json()) as { content?: string };

      if (!cancelled) {
        const nextContent = data.content ?? "";
        setContent(nextContent);
        setDraft(nextContent);
      }
    }

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, [selectedNodeId]);

  if (!isMarkdownSidebarOpen || !selectedNode) {
    return null;
  }

  async function handleSave() {
    if (!selectedNodeId) {
      return;
    }

    setIsSaving(true);

    try {
      await fetch(`/api/flow-node-content/${selectedNodeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: draft }),
      });

      setContent(draft);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <aside className="hidden w-[620px] border-l border-white/6 bg-[rgba(7,7,7,0.88)] xl:block 2xl:w-[760px]">
      <div className="flex h-full min-h-0 flex-col p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
              Markdown File
            </p>
            <h2 className="mt-2 text-[1.2rem] font-semibold tracking-[-0.04em] text-white">
              {selectedNode.title}.md
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={markdownSidebarMode === "view" ? "primary" : "secondary"}
              onClick={() => setMarkdownSidebarMode("view")}
              className="rounded-full px-3"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
            <Button
              type="button"
              size="sm"
              variant={markdownSidebarMode === "edit" ? "primary" : "secondary"}
              onClick={() => setMarkdownSidebarMode("edit")}
              className="rounded-full px-3"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraft(content);
                setMarkdownSidebarOpen(false);
                setMarkdownSidebarMode("view");
              }}
              className="rounded-full px-3"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full px-3"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving" : "Save"}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,18,18,0.92),rgba(9,9,9,0.9))] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          {markdownSidebarMode === "view" ? (
            <ScrollArea className="h-full min-h-0">
              <div className="p-4">
                <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/28">
                  Markdown Preview
                </p>
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown components={markdownComponents}>{draft}</ReactMarkdown>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-4 p-4">
              <div className="min-h-0 flex flex-1 flex-col">
                <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/28">
                  Markdown Editor
                </p>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-h-0 flex-1 resize-none rounded-[24px] border border-white/8 bg-black/30 p-4 text-sm leading-7 text-white/78 outline-none transition-colors focus:border-[rgba(217,134,75,0.4)]"
                />
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                  AI Markdown
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  placeholder={`Type to generate ${selectedNode.title}.md...`}
                  className="min-h-[88px] w-full resize-none rounded-[24px] border border-white/8 bg-black/30 p-4 text-sm leading-7 text-white/78 outline-none transition-colors placeholder:text-white/22 focus:border-[rgba(217,134,75,0.4)]"
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-[40px] rounded-full px-4"
                  >
                    <Wand2 className="h-4 w-4" />
                    Refine
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="h-[40px] rounded-full px-4"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
