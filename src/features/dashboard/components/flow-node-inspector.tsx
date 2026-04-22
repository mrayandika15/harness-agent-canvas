"use client";

import { useEffect, useMemo, useState } from "react";

import ReactMarkdown from "react-markdown";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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

export function FlowNodeInspector() {
  const {
    selectedFlowNodeId,
    isInspectorCollapsed,
    flowStepItems,
    setMarkdownSidebarOpen,
    setMarkdownSidebarMode,
  } = useCanvasStore();
  const [content, setContent] = useState("");

  const selectedNode = flowStepItems.find((step) => step.id === selectedFlowNodeId);
  const selectedNodeId = selectedNode?.id;
  const overview = useMemo(() => {
    const firstParagraph = content
      .replace(/^#.*$/gm, "")
      .split("\n\n")
      .map((part) => part.trim())
      .find(Boolean);

    return firstParagraph ?? "";
  }, [content]);

  useEffect(() => {
    if (!selectedNodeId) {
      setContent("");
      return;
    }

    let cancelled = false;

    async function loadContent() {
      const response = await fetch(`/api/flow-node-content/${selectedNodeId}`);
      const data = (await response.json()) as { content?: string };

      if (!cancelled) {
        const nextContent = data.content ?? "";
        setContent(nextContent);
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
  return (
    <aside
      className={cn(
        "hidden border-l border-white/6 bg-[rgba(8,8,8,0.82)] transition-[width] duration-300 xl:block",
        isInspectorCollapsed ? "w-[280px]" : "w-[340px]",
      )}
    >
      <div className="flex h-full min-h-0 flex-col p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
              Agent Kit
            </p>
            <h2 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-white">
              {selectedNode.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setMarkdownSidebarMode("view");
                setMarkdownSidebarOpen(true);
              }}
              className="rounded-full px-3"
            >
              <Eye className="h-3.5 w-3.5 text-[var(--accent)]" />
              View
            </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {selectedNode.connectedMcp.map((tool) => (
            <div
              key={tool}
              className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/52"
            >
              {tool}
            </div>
          ))}
        </div>

        {isInspectorCollapsed ? (
          <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,18,18,0.92),rgba(9,9,9,0.9))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/28">
              Overview
            </p>
            <p className="line-clamp-5 text-sm leading-7 text-white/48">{overview}</p>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,18,18,0.92),rgba(9,9,9,0.9))] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <div className="p-5">
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/28">
                Overview
              </p>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown components={markdownComponents}>{overview}</ReactMarkdown>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </aside>
  );
}
