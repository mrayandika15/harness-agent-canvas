"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  CheckCircle2,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";

import { PanelCard } from "@/components/app/panel-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchLocalMcps,
  hydrateFlow,
  hydrateFlowStep,
  runFlowAssistant,
  type LocalMcpServer,
} from "@/features/flow/api/agent-flow";
import type {
  AgentFlowResponse,
  SerializableFlowStep,
} from "@/features/flow/types/agent-flow";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

type AssistantLogItem = {
  id: string;
  label: string;
  status: "running" | "applied" | "error";
};

export function FlowCanvasAssistant() {
  const [draft, setDraft] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<AssistantLogItem[]>([]);
  const [localMcps, setLocalMcps] = useState<LocalMcpServer[]>([]);
  const [selectedMcpKey, setSelectedMcpKey] = useState<string | null>(null);
  const [isMcpMenuOpen, setIsMcpMenuOpen] = useState(false);
  const mcpMenuRef = useRef<HTMLDivElement | null>(null);
  const mcpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedAgentId = useWorkspaceStore((state) => state.selectedAgentId);
  const selectedFlowNodeId = useWorkspaceStore((state) => state.selectedFlowNodeId);
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);
  const setFlowStepItems = useWorkspaceStore((state) => state.setFlowStepItems);
  const setSelectedFlowNodeId = useWorkspaceStore(
    (state) => state.setSelectedFlowNodeId,
  );

  const selectedNode = flowStepItems.find((step) => step.id === selectedFlowNodeId);
  const selectedMcp =
    localMcps.find((mcp) => mcp.key === selectedMcpKey) ?? localMcps[0] ?? null;
  const mentionQuery = getActiveMentionQuery(draft);
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) {
      return [];
    }

    const normalizedQuery = mentionQuery.toLowerCase();

    return flowStepItems
      .filter((node) => {
        const searchable = `${node.id} ${node.title}`.toLowerCase();

        return !normalizedQuery || searchable.includes(normalizedQuery);
      })
      .slice(0, 5);
  }, [draft, flowStepItems, mentionQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadLocalMcps() {
      const mcps = await fetchLocalMcps();

      if (cancelled) {
        return;
      }

      setLocalMcps(mcps);
      setSelectedMcpKey((current) => {
        if (current && mcps.some((mcp) => mcp.key === current)) {
          return current;
        }

        return mcps.find((mcp) => mcp.available)?.key ?? mcps[0]?.key ?? null;
      });
    }

    void loadLocalMcps();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isMcpMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        mcpMenuRef.current?.contains(target) ||
        mcpTriggerRef.current?.contains(target)
      ) {
        return;
      }

      setIsMcpMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMcpMenuOpen]);

  async function handleSubmit() {
    const prompt = draft.trim();

    if (!prompt || !selectedAgentId || isRunning) {
      return;
    }

    setDraft("");
    setIsRunning(true);
    setLogs([
      {
        id: crypto.randomUUID(),
        label: selectedMcp
          ? `Starting ${selectedMcp.label} structure`
          : "Starting MCP structure",
        status: "running",
      },
    ]);

    try {
      const body = await runFlowAssistant(selectedAgentId, {
        prompt,
        selectedNodeId: selectedFlowNodeId,
        selectedMcpKey: selectedMcp?.key,
      });

      await readAssistantStream(body, {
        onThinking: (message) => {
          appendLog(message, "running");
        },
        onOperation: (label) => {
          appendLog(formatOperationLabel(label, "running"), "running");
        },
        onApplied: (payload) => {
          resolveRunningLog(
            formatOperationLabel(payload.label, "applied"),
            formatOperationLabel(payload.label, "running"),
          );

          if (payload.flow) {
            const flow = hydrateFlow(payload.flow);
            setFlowStepItems(flow.nodes);
          } else if (payload.node) {
            const node = hydrateFlowStep(payload.node);
            setFlowStepItems(
              flowStepItems.map((item) => (item.id === node.id ? node : item)),
            );
          }
        },
        onError: (message) => {
          appendLog(message, "error");
        },
        onDone: (payload) => {
          if (payload.flow) {
            const flow = hydrateFlow(payload.flow);
            setFlowStepItems(flow.nodes);
          }

          appendLog(
            getDoneLabel(payload),
            payload.appliedCount ? "applied" : "error",
          );
          clearRunningLogs();
        },
      });
    } catch (error) {
      setDraft(prompt);
      appendLog(
        error instanceof Error ? error.message : "Unable to update flow",
        "error",
      );
    } finally {
      setIsRunning(false);
    }
  }

  function appendLog(label: string, status: AssistantLogItem["status"]) {
    setLogs((current) => [
      ...current.slice(-4),
      {
        id: crypto.randomUUID(),
        label,
        status,
      },
    ]);
  }

  function resolveRunningLog(label: string, runningLabel: string) {
    setLogs((current) => {
      const targetIndex = current.findLastIndex(
        (log) => log.status === "running" && log.label === runningLabel,
      );

      if (targetIndex === -1) {
        return [
          ...current.slice(-4),
          {
            id: crypto.randomUUID(),
            label,
            status: "applied" as const,
          },
        ];
      }

      return current.map((log, index) =>
        index === targetIndex
          ? {
              ...log,
              label,
              status: "applied" as const,
            }
          : log,
      );
    });
  }

  function clearRunningLogs() {
    setLogs((current) => current.filter((log) => log.status !== "running").slice(-5));
  }

  function formatOperationLabel(
    label: string,
    phase: "running" | "applied",
  ) {
    if (label.startsWith("Removed ")) {
      return label;
    }

    if (phase === "running") {
      return label.replace(/^Creating /, "Adding ");
    }

    return label.replace(/^Created /, "Added ");
  }

  function getDoneLabel(payload: {
    appliedCount?: number;
    editMode?: "append" | "targeted" | "reset";
    replacedCount?: number;
    finalStepCount?: number;
    finalAgentStepCount?: number;
  }) {
    if (payload.editMode === "reset") {
      const finalAgentStepCount =
        payload.finalAgentStepCount ?? payload.appliedCount ?? 0;

      return payload.appliedCount
        ? `Flow simplified to ${finalAgentStepCount} agent step${
            finalAgentStepCount === 1 ? "" : "s"
          }`
        : "No simplified structure was produced";
    }

    if (payload.editMode === "targeted") {
      return payload.appliedCount
        ? "Targeted node edit applied"
        : "No targeted edit was produced";
    }

    return payload.appliedCount
      ? `${payload.appliedCount} MCP node${
          payload.appliedCount === 1 ? "" : "s"
        } added`
      : "No canvas edits were produced";
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[3vh] z-20 px-6">
      <div className="pointer-events-auto mx-auto w-full max-w-5xl">
        <PanelCard className="relative rounded-[20px] border-white/8 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(8,8,8,0.97))] p-2 shadow-[0_20px_56px_rgba(0,0,0,0.32)]">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                AI Assistant
              </p>
              {selectedNode ? (
                <button
                  type="button"
                  onClick={() => setSelectedFlowNodeId(null)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(245,148,78,0.18)] bg-[rgba(245,148,78,0.08)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--accent-strong)] transition-colors hover:border-[rgba(245,148,78,0.36)] hover:bg-[rgba(245,148,78,0.12)]"
                  title="Clear selected node"
                >
                  @{selectedNode.id}
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    mentionSuggestions.length > 0
                  ) {
                    event.preventDefault();
                    setDraft(insertMention(draft, mentionSuggestions[0].id));
                  }
                }}
                placeholder="Ask the selected MCP to create the workflow structure for this harness canvas..."
                disabled={isRunning}
                className="min-h-[44px] resize-none rounded-[16px] border-0 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(8,8,8,0.97))] px-3 py-2 text-[14px] leading-5 text-white/80 placeholder:text-white/24 shadow-none focus-visible:ring-0 focus-visible:border-0"
              />

              {mentionSuggestions.length > 0 ? (
                <div className="absolute bottom-full left-3 z-30 mb-2 w-[min(420px,calc(100vw-4rem))] overflow-hidden rounded-[16px] border border-white/10 bg-[rgba(12,12,12,0.98)] p-1.5 shadow-[0_20px_70px_rgba(0,0,0,0.46)] backdrop-blur-xl">
                  {mentionSuggestions.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setDraft(insertMention(draft, node.id));
                      }}
                      className="flex w-full min-w-0 items-center justify-between gap-3 rounded-[12px] px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white/82">
                          {node.title}
                        </span>
                        <span className="block truncate text-xs text-white/34">
                          @{node.id}
                        </span>
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/38">
                        {node.step}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {logs.length ? (
              <div className="grid gap-1.5 rounded-[16px] border border-white/8 bg-black/24 px-3 py-2">
                {compactLogs(logs).map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-2"
                  >
                    {log.status === "running" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-strong)]" />
                    ) : log.status === "applied" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#95e8d7]" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#ff8e97]" />
                    )}
                    <p
                      className={
                        log.status === "error"
                          ? "truncate text-xs text-[#ffb4bc]"
                          : "truncate text-xs text-white/54"
                      }
                    >
                      {log.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] text-white/62 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>

                <button
                  ref={mcpTriggerRef}
                  type="button"
                  onClick={() => setIsMcpMenuOpen((open) => !open)}
                  aria-expanded={isMcpMenuOpen}
                  className="inline-flex h-8 items-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/62 transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                  title="Show installed MCP servers"
                >
                  MCP
                </button>
              </div>

              {isMcpMenuOpen ? (
                <div
                  ref={mcpMenuRef}
                  className="fixed bottom-[calc(3vh+104px)] left-1/2 z-40 flex h-[320px] w-[64rem] max-w-[calc(100vw-3rem)] -translate-x-1/2 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(7,7,7,0.99))] shadow-[0_24px_90px_rgba(0,0,0,0.62)] backdrop-blur-xl"
                >
                  <div className="shrink-0 border-b border-white/8 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/46">
                      Installed MCP
                    </p>
                    <p className="mt-1 truncate text-xs text-white/30">
                      {localMcps.length} local server{localMcps.length === 1 ? "" : "s"}
                      {selectedMcp ? ` / selected ${selectedMcp.label}` : ""}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-1.5 [scrollbar-gutter:stable]">
                    {localMcps.length ? (
                      localMcps.map((mcp) => {
                        const isSelected = mcp.key === selectedMcp?.key;

                        return (
                          <button
                            key={mcp.key}
                            type="button"
                            onClick={() => {
                              setSelectedMcpKey(mcp.key);
                              setDraft((current) => insertMcpCall(current, mcp.key));
                              setIsMcpMenuOpen(false);
                            }}
                            className={[
                              "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors",
                              isSelected
                                ? "bg-[rgba(149,232,215,0.08)] ring-1 ring-[rgba(149,232,215,0.12)]"
                                : "hover:bg-white/[0.055]",
                            ].join(" ")}
                          >
                            <span className="min-w-0">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-sm font-semibold text-white/86">
                                  {mcp.label}
                                </span>
                                <span
                                  className={
                                    mcp.available
                                      ? "rounded-full bg-[rgba(149,232,215,0.1)] px-2 py-0.5 text-[10px] text-[#a8f7e8]"
                                      : "rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/34"
                                  }
                                >
                                  {mcp.available ? "available" : "missing"}
                                </span>
                              </span>
                              <span className="mt-1 block truncate font-mono text-[11px] text-white/40">
                                {mcp.command}
                                {mcp.args.length ? ` ${mcp.args.join(" ")}` : ""}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] text-white/22">
                                {mcp.source}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/34">
                              {isSelected ? "called" : "call"}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-[14px] border border-dashed border-white/10 px-3 py-4 text-sm text-white/38">
                        No local MCP servers found.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <Button
                type="button"
                variant="default"
                onClick={() => void handleSubmit()}
                disabled={!draft.trim() || isRunning}
                className="h-8 rounded-full border border-[rgba(196,112,52,0.56)] bg-[linear-gradient(180deg,#5c3118,#4b2612)] px-3 text-[12px] font-semibold text-[#f8ede6] shadow-[inset_0_1px_0_rgba(255,206,178,0.12)] hover:bg-[linear-gradient(180deg,#6a391d,#572c16)]"
              >
                {isRunning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowUp className="h-3 w-3" />
                )}
                {isRunning ? "Structuring..." : "Create Structure"}
              </Button>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

type FlowAssistantStreamHandlers = {
  onThinking: (message: string) => void;
  onOperation: (label: string) => void;
  onApplied: (payload: {
    operation: string;
    label: string;
    node?: SerializableFlowStep;
    flow?: AgentFlowResponse;
    selectedNodeId?: string;
  }) => void;
  onError: (message: string) => void;
  onDone: (payload: {
    ok?: boolean;
    appliedCount?: number;
    editMode?: "append" | "targeted" | "reset";
    replacedCount?: number;
    finalStepCount?: number;
    finalAgentStepCount?: number;
    flow?: AgentFlowResponse;
  }) => void;
};

async function readAssistantStream(
  body: ReadableStream<Uint8Array>,
  handlers: FlowAssistantStreamHandlers,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    chunks.forEach((chunk) => handleAssistantChunk(chunk, handlers));
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    handleAssistantChunk(buffer, handlers);
  }
}

function handleAssistantChunk(
  chunk: string,
  handlers: FlowAssistantStreamHandlers,
) {
  const lines = chunk.split(/\r?\n/);
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!dataLines.length) {
    return;
  }

  const payload = JSON.parse(dataLines.join("\n")) as {
    message?: string;
    label?: string;
    error?: string;
    operation?: string;
    node?: SerializableFlowStep;
    flow?: AgentFlowResponse;
    selectedNodeId?: string;
    ok?: boolean;
    appliedCount?: number;
    editMode?: "append" | "targeted" | "reset";
    replacedCount?: number;
    finalStepCount?: number;
    finalAgentStepCount?: number;
  };

  if (event === "thinking") {
    handlers.onThinking(payload.message ?? "Thinking");
  } else if (event === "operation") {
    handlers.onOperation(payload.label ?? "Applying operation");
  } else if (event === "applied") {
    handlers.onApplied({
      operation: payload.operation ?? "unknown",
      label: payload.label ?? "Applied canvas edit",
      node: payload.node,
      flow: payload.flow,
      selectedNodeId: payload.selectedNodeId,
    });
  } else if (event === "error") {
    handlers.onError(payload.error ?? "Flow assistant failed.");
  } else if (event === "done") {
    handlers.onDone({
      ok: payload.ok,
      appliedCount: payload.appliedCount,
      editMode: payload.editMode,
      replacedCount: payload.replacedCount,
      finalStepCount: payload.finalStepCount,
      finalAgentStepCount: payload.finalAgentStepCount,
      flow: payload.flow,
    });
  }
}

function compactLogs(logs: AssistantLogItem[]) {
  return logs.filter((log, index) => {
    const previous = logs[index - 1];

    return !previous || previous.label !== log.label || previous.status !== log.status;
  });
}

function getActiveMentionQuery(value: string) {
  const match = value.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);

  return match ? match[1] : null;
}

function insertMention(value: string, nodeId: string) {
  return value.replace(/(?:^|\s)@([a-zA-Z0-9_-]*)$/, (match) => {
    const prefix = match.startsWith(" ") ? " " : "";

    return `${prefix}@${nodeId} `;
  });
}

function insertMcpCall(value: string, mcpKey: string) {
  const token = `@${mcpKey}`;
  const trimmedEnd = value.replace(/\s+$/, "");

  if (/(^|\s)[/@][a-zA-Z0-9_-]*$/.test(trimmedEnd)) {
    return `${trimmedEnd.replace(/(^|\s)[/@][a-zA-Z0-9_-]*$/, (match) => {
      const prefix = match.startsWith(" ") ? " " : "";

      return `${prefix}${token}`;
    })} `;
  }

  return `${trimmedEnd}${trimmedEnd ? " " : ""}${token} `;
}
