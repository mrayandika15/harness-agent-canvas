"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Paperclip, Trash2 } from "lucide-react";

import { MarkdownContent } from "@/components/app/markdown-content";
import { PanelCard } from "@/components/app/panel-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { AgentGenerationProgress } from "@/features/agents/components/agent-generation-progress";
import type { ChatMessage, ChatTimelineItem } from "@/features/chat/types/message";
import type { FlowStep } from "@/features/flow/types/flow-step";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

type CurrentStepState = {
  id: string;
  title: string;
  index: number;
  total: number;
};

export function AgentChatWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<CurrentStepState | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
  const agentItems = useWorkspaceStore((state) => state.agentItems);
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);
  const selectedAgentId = useWorkspaceStore((state) => state.selectedAgentId);
  const updateAgent = useWorkspaceStore((state) => state.updateAgent);

  const selectedAgent =
    agentItems.find((agent) => agent.id === selectedAgentId) ?? agentItems[0];
  const isGeneratingAgent = selectedAgent?.status === "Generating";
  const pendingTimeline = isSending && !streamingMessage
    ? createPendingTimeline(flowStepItems)
    : [];

  useEffect(() => {
    if (!selectedAgent?.id) {
      return;
    }

    if (isGeneratingAgent) {
      setMessages([]);
      setStreamingMessage(null);
      setCurrentStep(null);
      setError(null);
      setIsLoadingMessages(false);
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/agents/${selectedAgent.id}/messages`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          messages?: ChatMessage[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load messages.");
        }

        if (!cancelled) {
          setMessages(payload.messages ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load messages.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [isGeneratingAgent, selectedAgent?.id]);

  async function submitChat(content: string) {
    if (!selectedAgent?.id || isGeneratingAgent || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        throw new Error(payload.error ?? "Local agent did not return a response.");
      }

      await readChatStream(response.body, {
        onUserMessage: (userMessage) => {
          setMessages((current) =>
            current.some((message) => message.id === userMessage.id)
              ? current
              : [...current, userMessage],
          );
        },
        onTimeline: (timeline) => {
          setStreamingMessage((current) => ({
            id: current?.id ?? `streaming-${Date.now()}`,
            agentId: selectedAgent.id,
            role: "assistant",
            content: current?.content ?? "",
            createdAt: current?.createdAt ?? new Date().toISOString(),
            timeline,
          }));
        },
        onDelta: (delta) => {
          setStreamingMessage((current) => ({
            id: current?.id ?? `streaming-${Date.now()}`,
            agentId: selectedAgent.id,
            role: "assistant",
            content: `${current?.content ?? ""}${delta}`,
            createdAt: current?.createdAt ?? new Date().toISOString(),
            timeline: current?.timeline,
          }));
        },
        onAssistantMessage: (assistantMessage) => {
          setMessages((current) => [
            ...current.filter((message) => message.id !== assistantMessage.id),
            assistantMessage,
          ]);
          setStreamingMessage(null);
        },
        onAgentStatus: ({ agentId, status }) => {
          updateAgent(agentId, { status });
        },
        onCurrentStep: (step) => {
          setCurrentStep(step);
        },
        onDone: (done) => {
          if (!done.waitingForInput) {
            setCurrentStep(null);
          }
        },
        onError: (message) => {
          setError(message);
        },
      });
    } catch (sendError) {
      setDraft(content);
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Local agent did not return a response.",
      );
    } finally {
      setIsSending(false);
      setStreamingMessage(null);
    }
  }

  async function handleSend() {
    const content = draft.trim();

    if (!content || !selectedAgent?.id || isGeneratingAgent || isSending) {
      return;
    }

    setDraft("");
    await submitChat(content);
  }

  async function handleClearMessages() {
    if (!selectedAgent?.id || isGeneratingAgent || isSending || messages.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedAgent.name}'s chat messages? The agent harness will stay intact.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/agents/${selectedAgent.id}/messages`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not delete messages.");
      }

      setMessages([]);
      setStreamingMessage(null);
      setCurrentStep(null);
      updateAgent(selectedAgent.id, { status: "Idle" });
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete messages.",
      );
    }
  }

  if (!selectedAgent) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center bg-[rgba(5,5,5,0.82)] text-sm text-white/42">
        No agent selected.
      </section>
    );
  }

  if (isGeneratingAgent) {
    return (
      <section className="relative flex min-h-0 flex-1 overflow-hidden bg-[rgba(5,5,5,0.82)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_28%,rgba(149,232,215,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_32%)]" />
        <AgentGenerationProgress agent={selectedAgent} surface="chat" />
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 bg-[rgba(5,5,5,0.82)]">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-6 pb-[34vh]">
            {isLoadingMessages ? (
              <PanelCard className="rounded-2xl p-5">
                <p className="text-sm text-white/42">Loading conversation...</p>
              </PanelCard>
            ) : messages.length === 0 ? (
              <PanelCard className="rounded-2xl border-white/8 bg-[#0d0d0d]/90 p-5 shadow-none">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                  {selectedAgent.runtime}
                </p>
                <h3 className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                  {selectedAgent.name} is ready
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Send a message to start a persisted local CLI-backed
                  conversation. Future replies will include Claude-Mem project
                  memory when available.
                </p>
              </PanelCard>
            ) : null}

            {messages.map((message) => (
              <ChatMessageCard key={message.id} message={message} />
            ))}
            {streamingMessage ? (
              <ChatMessageCard message={streamingMessage} />
            ) : null}
            {pendingTimeline.length ? (
              <PanelCard className="mr-20 rounded-2xl border-white/8 bg-[#0d0d0d]/90 p-5 shadow-none">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                  {selectedAgent.name}
                </p>
                <h3 className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                  Reading harness canvas
                </h3>
                <ChatTimeline items={pendingTimeline} />
              </PanelCard>
            ) : null}
            {currentStep && !streamingMessage ? (
              <CurrentStepCard step={currentStep} status={selectedAgent.status} />
            ) : null}
            {error ? (
              <PanelCard className="mr-20 border-[#ff8e97]/25 bg-[linear-gradient(180deg,rgba(50,19,24,0.34),rgba(10,10,10,0.96))] p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffb4bc]/62">
                  {selectedAgent.name}
                </p>
                <h3 className="mt-2 text-base font-semibold tracking-[-0.03em] text-[#ffe8eb]">
                  Runtime needs attention
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#ffb4bc]/78">
                  {error}
                </p>
              </PanelCard>
            ) : null}
          </div>
        </ScrollArea>

        <div className="pointer-events-none absolute inset-x-0 bottom-[3vh] z-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 72 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto mx-auto w-full max-w-4xl"
          >
            <PanelCard className="rounded-2xl border-white/10 bg-[#0b0b0b]/95 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.32)]">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  selectedAgent.status === "Waiting Input" && currentStep
                    ? `Input for ${currentStep.title}...`
                    : `Message ${selectedAgent.name} about the current flow...`
                }
                disabled={isSending}
                className="min-h-[88px] resize-none rounded-xl border border-white/8 bg-black/18 px-4 py-3 text-[16px] leading-6 text-white/84 placeholder:text-white/28 shadow-none focus-visible:border-white/14 focus-visible:ring-0"
              />

              <div className="mt-3 flex items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                  {messages.length ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleClearMessages()}
                      disabled={isSending}
                      className="h-[40px] w-[40px] rounded-xl border border-[#ff8e97]/16 bg-[#ff8e97]/6 text-[#ffb4bc]/72 hover:bg-[#ff8e97]/10 hover:text-[#ffd4d9]"
                      title="Delete chat messages"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-[40px] w-[40px] rounded-xl border border-white/10 bg-[rgba(255,255,255,0.04)] text-white/62 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                  >
                    <Paperclip className="h-4.5 w-4.5" />
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="default"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim() || isSending}
                  className="h-[40px] rounded-xl border border-[rgba(196,112,52,0.5)] bg-[#5a2f17] px-4 text-[13px] font-semibold text-[#f8ede6] shadow-none hover:bg-[#66371d]"
                >
                  <ArrowUp className="h-3 w-3" />
                  {isSending ? "Running..." : "Send"}
                </Button>
              </div>
            </PanelCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ChatMessageCard({ message }: { message: ChatMessage }) {
  return (
    <PanelCard
      className={
        message.role === "assistant"
          ? "mr-20 rounded-2xl border-white/8 bg-[#0f0f0f]/92 p-5 shadow-none"
          : "ml-20 rounded-2xl border-[rgba(245,148,78,0.14)] bg-[rgba(42,24,14,0.42)] p-4 shadow-none"
      }
    >
      <ChatMessageBody message={message} />
      {message.role === "assistant" && message.timeline?.length ? (
        <ChatTimeline items={message.timeline} />
      ) : null}
    </PanelCard>
  );
}

function ChatMessageBody({ message }: { message: ChatMessage }) {
  if (!message.content) {
    return (
      <p className="mt-2 text-sm leading-7 text-white/42">
        Waiting for local runtime...
      </p>
    );
  }

  if (message.role === "assistant") {
    return (
      <MarkdownContent
        content={stripLeadingMarkdownHeading(message.content)}
        className="text-white/66 [&_code]:break-words [&_h1]:mb-3 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:tracking-[-0.02em] [&_h1]:text-white/88 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-white/88 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:tracking-[-0.01em] [&_h3]:text-white/82 [&_h4]:mt-4 [&_li]:text-sm [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p:last-child]:mb-0 [&_p]:text-white/64 [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/8 [&_pre]:bg-black/24 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:text-white/82 [&_ul]:text-sm"
      />
    );
  }

  return (
    <p className="whitespace-pre-wrap text-sm leading-7 text-white/66">
      {message.content}
    </p>
  );
}

function stripLeadingMarkdownHeading(content: string) {
  return content.replace(/^\s*#{1,6}\s+[^\n]+\n+/, "").trimStart();
}

function CurrentStepCard({
  step,
  status,
}: {
  step: CurrentStepState;
  status: string;
}) {
  return (
    <PanelCard className="mr-20 rounded-2xl border-[rgba(245,148,78,0.18)] bg-[#11100f]/92 p-5 shadow-none">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]/70">
        {status}
      </p>
      <h3 className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
        Step {step.index + 1}/{step.total}: {step.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-white/52">
        The harness is paused here. Send the next message to continue this flow.
      </p>
    </PanelCard>
  );
}

type ChatStreamHandlers = {
  onUserMessage: (message: ChatMessage) => void;
  onTimeline: (timeline: ChatTimelineItem[]) => void;
  onDelta: (delta: string) => void;
  onAssistantMessage: (message: ChatMessage) => void;
  onAgentStatus: (status: { agentId: string; status: string }) => void;
  onCurrentStep: (step: CurrentStepState) => void;
  onDone: (done: { ok?: boolean; waitingForInput?: boolean }) => void;
  onError: (message: string) => void;
};

async function readChatStream(
  body: ReadableStream<Uint8Array>,
  handlers: ChatStreamHandlers,
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

    for (const chunk of chunks) {
      handleSseChunk(chunk, handlers);
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    handleSseChunk(buffer, handlers);
  }
}

function handleSseChunk(chunk: string, handlers: ChatStreamHandlers) {
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

  if (dataLines.length === 0) {
    return;
  }

  const payload = JSON.parse(dataLines.join("\n")) as {
    userMessage?: ChatMessage;
    assistantMessage?: ChatMessage;
    timeline?: ChatTimelineItem[];
    agentId?: string;
    status?: string;
    id?: string;
    title?: string;
    index?: number;
    total?: number;
    ok?: boolean;
    waitingForInput?: boolean;
    delta?: string;
    error?: string;
  };

  if (event === "userMessage" && payload.userMessage) {
    handlers.onUserMessage(payload.userMessage);
  } else if (event === "timeline" && payload.timeline) {
    handlers.onTimeline(payload.timeline);
  } else if (event === "delta" && typeof payload.delta === "string") {
    handlers.onDelta(payload.delta);
  } else if (event === "assistantMessage" && payload.assistantMessage) {
    handlers.onAssistantMessage(payload.assistantMessage);
  } else if (
    event === "agentStatus" &&
    typeof payload.agentId === "string" &&
    typeof payload.status === "string"
  ) {
    handlers.onAgentStatus({
      agentId: payload.agentId,
      status: payload.status,
    });
  } else if (
    event === "currentStep" &&
    typeof payload.id === "string" &&
    typeof payload.title === "string" &&
    typeof payload.index === "number" &&
    typeof payload.total === "number"
  ) {
    handlers.onCurrentStep({
      id: payload.id,
      title: payload.title,
      index: payload.index,
      total: payload.total,
    });
  } else if (event === "done") {
    handlers.onDone({
      ok: payload.ok,
      waitingForInput: payload.waitingForInput,
    });
  } else if (event === "error") {
    handlers.onError(payload.error ?? "Local agent did not return a response.");
  }
}

function createPendingTimeline(flowSteps: FlowStep[]): ChatTimelineItem[] {
  return [
    {
      id: "inspect",
      label: "Inspect canvas structure",
      detail: `${flowSteps.length} node${flowSteps.length === 1 ? "" : "s"} queued`,
      status: "running",
    },
    ...flowSteps.map((step, index) => ({
      id: step.id,
      label: `${index + 1}. ${step.title}`,
      detail: step.instructionStatus,
      status: "pending" as const,
    })),
    {
      id: "compose",
      label: "Compose response",
      detail: "Waiting for local runtime",
      status: "pending",
    },
  ];
}

function ChatTimeline({ items }: { items: ChatTimelineItem[] }) {
  const stepItems = items.filter((item) => item.id !== "inspect");
  const completedItems = stepItems.filter((item) => item.status === "complete").length;
  const currentItem =
    stepItems.find((item) => item.status === "running") ??
    stepItems.find((item) => item.status === "pending");

  return (
    <div className="mt-4 rounded-2xl border border-white/8 bg-black/16 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[11px] font-medium text-white/62">
          Current harness
          {currentItem ? (
            <span className="text-white/34"> · {currentItem.label.replace(/^\d+\.\s*/, "")}</span>
          ) : null}
        </p>
        <p className="shrink-0 text-[11px] font-medium text-white/42">
          {completedItems}/{stepItems.length} done
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={
              item.status === "complete"
                ? "flex max-w-full items-center gap-1.5 rounded-full border border-[#95e8d7]/18 bg-[#95e8d7]/8 px-2.5 py-1 text-[11px] text-[#baf5e9]"
                : item.status === "running"
                  ? "flex max-w-full items-center gap-1.5 rounded-full border border-[rgba(245,148,78,0.24)] bg-[rgba(245,148,78,0.1)] px-2.5 py-1 text-[11px] text-[var(--accent-strong)]"
                  : "flex max-w-full items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/38"
            }
          >
            <span
              className={
                item.status === "complete"
                  ? "h-1.5 w-1.5 shrink-0 rounded-full bg-[#95e8d7]"
                  : item.status === "running"
                    ? "h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent-strong)]"
                    : "h-1.5 w-1.5 shrink-0 rounded-full bg-white/24"
              }
            />
            <span className="truncate">
              {index === 0 ? "Inspect" : item.label.replace(/^\d+\.\s*/, "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
