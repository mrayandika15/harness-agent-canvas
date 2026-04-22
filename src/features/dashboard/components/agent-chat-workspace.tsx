"use client";

import { motion } from "framer-motion";
import { ArrowUp, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PixelAgent } from "@/features/dashboard/components/pixel-agent";
import { agentList } from "@/features/dashboard/lib/dashboard-data";
import { useCanvasStore } from "@/stores/canvas-store";

const conversationSeed = [
  {
    id: "m1",
    role: "assistant" as const,
    title: "Robo is ready",
    body:
      "I can help refine the active flow, explain each step, or draft the markdown instructions for a new node. If you want, I can break the current pipeline into a cleaner execution plan, highlight which MCP tools each step depends on, and suggest how the markdown should be structured so later edits stay consistent.",
  },
  {
    id: "m2",
    role: "user" as const,
    title: "Current goal",
    body:
      "Generate a cleaner implementation brief for the latest step and keep the MCP mapping explicit. I want the markdown to read like an operational handoff document, not just a loose summary, so include a clearer purpose, required inputs, expected outputs, and a short success criteria section.",
  },
  {
    id: "m3",
    role: "assistant" as const,
    title: "Suggested action",
    body:
      "I would start by summarizing the node purpose, then produce outputs, inputs, and success criteria in markdown format. After that, I would add one short implementation note explaining how the MCP tools are expected to be invoked and one fallback note describing what should happen if the upstream context is incomplete or inconsistent.",
  },
  {
    id: "m4",
    role: "user" as const,
    title: "Extra constraint",
    body:
      "Keep the tone concise and technical. Avoid product-marketing language. The result should feel like something an engineer or operator can read quickly, understand immediately, and apply without needing extra explanation from the chat thread.",
  },
  {
    id: "m5",
    role: "assistant" as const,
    title: "Execution outline",
    body:
      "Understood. I would shape the final markdown into five parts: overview, purpose, MCP dependencies, outputs, and success criteria. If needed, I can also add a final checklist with validation points so the next agent step can confirm whether the node completed successfully before continuing through the flow.",
  },
];

export function AgentChatWorkspace() {
  const { selectedAgentName } = useCanvasStore();

  const selectedAgent =
    agentList.find((agent) => agent.name === selectedAgentName) ?? agentList[0];

  return (
    <section className="flex min-h-0 flex-1 bg-[rgba(5,5,5,0.82)]">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-6 pb-[34vh]">
            {conversationSeed.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "assistant"
                    ? "mr-20 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(19,19,19,0.96),rgba(12,12,12,0.94))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
                    : "ml-20 rounded-[28px] border border-[rgba(217,134,75,0.18)] bg-[linear-gradient(180deg,rgba(54,29,15,0.24),rgba(16,12,10,0.94))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
                }
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">
                  {message.role === "assistant" ? "Assistant" : "You"}
                </p>
                <h3 className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                  {message.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/58">{message.body}</p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="pointer-events-none absolute inset-x-0 bottom-[4vh] z-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 72 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-4xl rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.94))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl pointer-events-auto"
          >
            <textarea
              placeholder={`Message ${selectedAgent.name} about the current flow...`}
              className="min-h-[92px] w-full resize-none bg-transparent text-sm leading-7 text-white/78 outline-none placeholder:text-white/22"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-white/54 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </div>

              <Button variant="primary" className="h-11 rounded-full px-4">
                <ArrowUp className="h-4 w-4" />
                Send
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

    </section>
  );
}
